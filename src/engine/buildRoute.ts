import { scoreZones } from './scoreZones';
import { monthName } from './months';
import type { Dataset, Day, Itinerary, Leg, Monastery, Pace, Place, RouteInput, Score, ZoneId } from './types';

export const MIN_DAYS = 4;
export const MAX_DAYS = 21;
const MAX_LEG_MINUTES = 360;
const SCENIC_COST_FACTOR = 0.5; // a scenic train ride "costs" half its clock time
const PACE_MULT: Record<Pace, number> = { slow: 1.5, normal: 1, fast: 0.5 };
const BRUTE_FORCE_LIMIT = 8;

// ---------- geometry & legs ----------

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

type LegIndex = Map<string, Leg>;

export function indexLegs(legs: Leg[]): LegIndex {
  const m: LegIndex = new Map();
  for (const l of legs) m.set(pairKey(l.from, l.to), l);
  return m;
}

/** The leg from a to b, oriented a → b. Falls back to haversine × 1.6 at 40 km/h. */
export function legBetween(a: Place, b: Place, idx: LegIndex): Leg {
  const known = idx.get(pairKey(a.id, b.id));
  if (known) return known.from === a.id ? known : { ...known, from: a.id, to: b.id };
  const minutes = Math.round(((haversineKm(a, b) * 1.6) / 40) * 60);
  return { from: a.id, to: b.id, minutes: Math.max(minutes, 10), mode: 'car' };
}

const legCost = (l: Leg) => (l.scenic ? l.minutes * SCENIC_COST_FACTOR : l.minutes);
const legTooLong = (l: Leg) => !l.scenic && l.minutes > MAX_LEG_MINUTES;

// ---------- steps ----------

function nightsFor(p: Place, pace: Pace): { min: number; max: number } {
  const min = Math.max(1, Math.ceil(p.minNights * PACE_MULT[pace]));
  const max = Math.max(min, Math.ceil(p.maxNights * Math.max(1, PACE_MULT[pace])));
  return { min, max };
}

function rankScore(p: Place, zoneScore: Score, interests: string[]): number {
  const hits = p.tags.filter((t) => interests.includes(t)).length;
  return p.weight * (zoneScore / 3) * (1 + 0.5 * hits);
}

const isBeach = (p: Place) => p.tags.includes('beach');
const isSafari = (p: Place) => p.tags.includes('wildlife');

type Ranked = { place: Place; score: number; forced: boolean };

function select(
  ranked: Ranked[],
  nights: number,
  days: number,
  pace: Pace,
  blocked: Set<string>,
): { chosen: Map<string, number>; order: Place[]; leftover: number } {
  const chosen = new Map<string, number>();
  const order: Place[] = [];
  let remaining = nights;
  let beaches = 0;
  let safaris = 0;
  const beachCap = days < 10 ? 2 : days < 18 ? 3 : 4;
  for (const r of ranked) {
    if (blocked.has(r.place.id)) continue;
    const { min } = nightsFor(r.place, pace);
    if (min > remaining) continue;
    if (!r.forced) {
      if (isBeach(r.place) && beaches >= beachCap) continue;
      if (isSafari(r.place) && safaris >= 1) continue;
    }
    chosen.set(r.place.id, min);
    order.push(r.place);
    remaining -= min;
    if (isBeach(r.place)) beaches++;
    if (isSafari(r.place)) safaris++;
    if (remaining === 0) break;
  }
  // leftover nights go to the highest-weight stops, up to their max
  const byWeight = [...order].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  for (const p of byWeight) {
    if (remaining === 0) break;
    const { max } = nightsFor(p, pace);
    const add = Math.min(remaining, max - chosen.get(p.id)!);
    if (add > 0) {
      chosen.set(p.id, chosen.get(p.id)! + add);
      remaining -= add;
    }
  }
  return { chosen, order, leftover: remaining };
}

function routeCost(seq: Place[], gw: Place, idx: LegIndex): { cost: number; bad: number } {
  let cost = 0;
  let bad = 0;
  let prev = gw;
  for (const p of [...seq, gw]) {
    const l = legBetween(prev, p, idx);
    cost += legCost(l);
    if (legTooLong(l)) bad++;
    prev = p;
  }
  return { cost, bad };
}

function better(
  a: { cost: number; bad: number; seq: Place[] },
  b: { cost: number; bad: number; seq: Place[] } | null,
  rank: Map<string, number>,
): boolean {
  if (!b) return true;
  if (a.bad !== b.bad) return a.bad < b.bad;
  if (Math.abs(a.cost - b.cost) > 1e-9) return a.cost < b.cost;
  // tie (usually a route and its reverse): start with the higher-ranked end
  const aStart = rank.get(a.seq[0].id)! < rank.get(a.seq[a.seq.length - 1].id)!;
  const bStart = rank.get(b.seq[0].id)! < rank.get(b.seq[b.seq.length - 1].id)!;
  if (aStart !== bStart) return aStart;
  return a.seq.map((p) => p.id).join() < b.seq.map((p) => p.id).join();
}

export function orderRoute(stops: Place[], gw: Place, idx: LegIndex, rank: Map<string, number>): Place[] {
  if (stops.length <= 1) return stops;
  let best: { cost: number; bad: number; seq: Place[] } | null = null;

  if (stops.length <= BRUTE_FORCE_LIMIT) {
    const arr = [...stops];
    const permute = (k: number) => {
      if (k === arr.length) {
        const { cost, bad } = routeCost(arr, gw, idx);
        const cand = { cost, bad, seq: [...arr] };
        if (better(cand, best, rank)) best = cand;
        return;
      }
      for (let i = k; i < arr.length; i++) {
        [arr[k], arr[i]] = [arr[i], arr[k]];
        permute(k + 1);
        [arr[k], arr[i]] = [arr[i], arr[k]];
      }
    };
    permute(0);
    return best!.seq;
  }

  // nearest neighbour from the gateway …
  const left = [...stops].sort((a, b) => a.id.localeCompare(b.id));
  const seq: Place[] = [];
  let cur = gw;
  while (left.length) {
    let bi = 0;
    for (let i = 1; i < left.length; i++) {
      if (legCost(legBetween(cur, left[i], idx)) < legCost(legBetween(cur, left[bi], idx))) bi = i;
    }
    cur = left.splice(bi, 1)[0];
    seq.push(cur);
  }
  // … then 2-opt until no improvement
  let route = seq;
  let cur2 = routeCost(route, gw, idx);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const cand = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        const c = routeCost(cand, gw, idx);
        if (c.bad < cur2.bad || (c.bad === cur2.bad && c.cost < cur2.cost - 1e-9)) {
          route = cand;
          cur2 = c;
          improved = true;
        }
      }
    }
  }
  const rev = [...route].reverse();
  return better({ ...cur2, seq: rev }, { ...cur2, seq: route }, rank) ? rev : route;
}

function nearestMonastery(p: Place, monasteries: Monastery[]): Monastery | undefined {
  return monasteries
    .filter((m) => m.nearPlace === p.id)
    .sort((a, b) => haversineKm(p, a) - haversineKm(p, b) || a.id.localeCompare(b.id))[0];
}

function spread<T>(items: T[], buckets: number): T[][] {
  const out: T[][] = Array.from({ length: buckets }, () => []);
  items.forEach((it, i) => out[Math.min(buckets - 1, Math.floor((i * buckets) / items.length))].push(it));
  return out;
}

// ---------- main ----------

export function buildRoute(rawInput: RouteInput, data: Dataset): Itinerary {
  const input: RouteInput = {
    ...rawInput,
    days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(rawInput.days))),
    interests: [...(rawInput.interests ?? [])].sort(),
  };
  const pace = input.pace ?? 'normal';
  const idx = indexLegs(data.legs);
  const zoneName = (z: ZoneId) => data.climate.find((c) => c.id === z)!.name;
  const mName = monthName(input.month);
  const warnings: string[] = [];

  // 1. scoreZones
  const { scores, best } = scoreZones(input.month, data.climate);

  const gw = data.places.find((p) => p.gateway);
  if (!gw) throw new Error('No gateway place in dataset');
  const exclude = new Set(input.exclude ?? []);
  const include = new Set((input.include ?? []).filter((id) => !exclude.has(id)));
  const candidates = data.places.filter((p) => !p.gateway && !exclude.has(p.id));

  // 2. filterPlaces — drop monsoon zones unless that leaves too little
  let pool = candidates.filter((p) => scores[p.zone] > 0 || include.has(p.id));
  if (pool.length < input.days / 2) {
    pool = candidates;
    warnings.push(`Few regions are dry in ${mName}; this route includes areas in monsoon.`);
  }
  for (const z of Object.keys(scores) as ZoneId[]) {
    if (scores[z] !== 0) continue;
    const skipped = candidates.filter((p) => p.zone === z && p.weight >= 0.6 && !pool.includes(p));
    if (skipped.length) {
      warnings.push(`${zoneName(z)} is in monsoon in ${mName}; skipped ${skipped.map((p) => p.name).join(', ')}.`);
    }
  }

  // 3. rankPlaces
  const ranked: Ranked[] = pool
    .map((p) => ({ place: p, score: rankScore(p, scores[p.zone], input.interests), forced: include.has(p.id) }))
    .sort(
      (a, b) =>
        Number(b.forced) - Number(a.forced) || b.score - a.score || b.place.weight - a.place.weight ||
        a.place.id.localeCompare(b.place.id),
    );
  const rank = new Map(ranked.map((r, i) => [r.place.id, i]));

  // 4 + 5. selectByBudget → orderRoute, dropping stops that force a > 6 h leg
  const gwNights = nightsFor(gw, pace).min;
  const nights = input.days - 1;
  const blocked = new Set<string>();
  let ordered: Place[] = [];
  let chosen = new Map<string, number>();
  let leftover = 0;
  for (let guard = 0; guard < 50; guard++) {
    const sel = select(ranked, Math.max(0, nights - gwNights), input.days, pace, blocked);
    chosen = sel.chosen;
    leftover = sel.leftover;
    ordered = orderRoute(sel.order, gw, idx, rank);
    const seq = [gw, ...ordered, gw];
    let offender: Place | undefined;
    for (let i = 0; i < seq.length - 1; i++) {
      if (legTooLong(legBetween(seq[i], seq[i + 1], idx))) {
        const pair = [seq[i], seq[i + 1]].filter((p) => !p.gateway && !include.has(p.id));
        offender = pair.sort((a, b) => rank.get(b.id)! - rank.get(a.id)!)[0];
        if (offender) break;
      }
    }
    if (!offender) break;
    blocked.add(offender.id);
  }

  // 6. expandToDays
  const days: Day[] = [];
  const pushStop = (p: Place, n: number, legIn?: Leg) => {
    const tipsByDay = spread(p.highlights, n);
    const monastery = input.sacred ? nearestMonastery(p, data.monasteries) : undefined;
    for (let i = 0; i < n; i++) {
      days.push({
        n: days.length + 1,
        stop: p,
        nightsHere: n,
        legIn: i === 0 ? legIn : undefined,
        tips: tipsByDay[i],
        monastery: i === 0 ? monastery : undefined,
      });
    }
  };
  pushStop(gw, gwNights + leftover);
  let prev = gw;
  for (const p of ordered) {
    pushStop(p, chosen.get(p.id)!, legBetween(prev, p, idx));
    prev = p;
  }
  days.push({
    n: days.length + 1,
    stop: gw,
    nightsHere: 0,
    legIn: ordered.length ? legBetween(prev, gw, idx) : undefined,
    tips: ['Transfer to Bandaranaike International Airport (CMB), about 20 minutes from Negombo.'],
  });

  for (const [score, text] of [
    [0, 'is in monsoon in {m}.'],
    [1, 'is showery in {m}; keep a flexible day.'],
  ] as const) {
    const hit = (Object.keys(scores) as ZoneId[])
      .map((z) => ({ z, ps: ordered.filter((p) => p.zone === z && scores[z] === score) }))
      .filter((x) => x.ps.length);
    for (const { z, ps } of hit) {
      warnings.push(`${zoneName(z)} (${ps.map((p) => p.name).join(', ')}) ${text.replace('{m}', mName)}`);
    }
  }

  const inRoute = new Set(ordered.map((p) => p.id));
  const alternates = ranked
    .filter((r) => !inRoute.has(r.place.id) && !blocked.has(r.place.id))
    .slice(0, 3)
    .map((r) => r.place);

  const full = [gw, ...ordered, gw];
  let totalMinutes = 0;
  for (let i = 0; i < full.length - 1; i++) totalMinutes += legBetween(full[i], full[i + 1], idx).minutes;

  return {
    input,
    days,
    stops: ordered,
    polyline: full.map((p) => [p.lng, p.lat] as [number, number]),
    zoneScores: scores,
    bestZone: best,
    warnings,
    alternates,
    totalMinutes,
  };
}
