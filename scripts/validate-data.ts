/**
 * Validates the four data files against their Zod schemas plus cross-file rules.
 * Runs as `npm run validate` and automatically before every build (prebuild).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ClimateFile, LegsFile, MonasteriesFile, PlacesFile } from '../src/schemas';
import { ALL_MONTHS, buildRoute, type Dataset } from '../src/engine';

const dir = fileURLToPath(new URL('../src/data/', import.meta.url));
const errors: string[] = [];
const load = (f: string) => {
  const p = dir + f;
  if (!existsSync(p)) {
    errors.push(`${f}: missing`);
    return [];
  }
  return JSON.parse(readFileSync(p, 'utf8'));
};

function check<T>(name: string, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, raw: unknown): T {
  const r = schema.safeParse(raw);
  if (!r.success) {
    for (const i of r.error!.issues) errors.push(`${name}: [${i.path.join('.')}] ${i.message}`);
    return [] as T;
  }
  return r.data as T;
}

const places = check('places.json', PlacesFile, load('places.json'));
const climate = check('climate.json', ClimateFile, load('climate.json'));
const legs = check('legs.json', LegsFile, load('legs.json'));
const monasteries = check('monasteries.json', MonasteriesFile, load('monasteries.json'));

const placeIds = new Set(places.map((p) => p.id));
const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

for (const d of dupes(places.map((p) => p.id))) errors.push(`places.json: duplicate id ${d}`);
for (const d of dupes(places.map((p) => p.slug))) errors.push(`places.json: duplicate slug ${d}`);
for (const d of dupes(monasteries.map((m) => m.slug))) errors.push(`monasteries.json: duplicate slug ${d}`);
for (const d of dupes(climate.map((c) => c.id))) errors.push(`climate.json: duplicate zone ${d}`);
if (places.length && places.filter((p) => p.gateway).length < 1) errors.push('places.json: no gateway place');

// point-in-polygon: each place should sit inside its zone's outline
const inside = ([x, y]: [number, number], poly: [number, number][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
for (const p of places) {
  const z = climate.find((c) => c.id === p.zone);
  if (!z) errors.push(`places.json: ${p.id} has unknown zone ${p.zone}`);
  else if (!inside([p.lng, p.lat], z.polygon)) errors.push(`places.json: ${p.id} lies outside the ${p.zone} polygon`);
}

const seen = new Set<string>();
for (const l of legs) {
  for (const end of [l.from, l.to]) if (!placeIds.has(end)) errors.push(`legs.json: ${l.from}→${l.to} references unknown place ${end}`);
  if (l.from === l.to) errors.push(`legs.json: self-loop ${l.from}`);
  const k = [l.from, l.to].sort().join('|');
  if (seen.has(k)) errors.push(`legs.json: duplicate pair ${k}`);
  seen.add(k);
}
for (const m of monasteries) {
  if (!placeIds.has(m.nearPlace)) errors.push(`monasteries.json: ${m.id} nearPlace ${m.nearPlace} is not a place id`);
}

// smoke-test the engine across the full page matrix
if (!errors.length) {
  const data: Dataset = { places, climate, legs, monasteries };
  for (const month of ALL_MONTHS) {
    for (const days of [5, 7, 10, 14, 18, 21]) {
      try {
        const it = buildRoute({ month, days, interests: [] }, data);
        if (!it.stops.length) errors.push(`engine: empty route for month ${month}, ${days} days`);
      } catch (e) {
        errors.push(`engine: month ${month}, ${days} days threw ${(e as Error).message}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`✗ Data validation failed (${errors.length}):\n  ` + errors.join('\n  '));
  process.exit(1);
}
console.log(`✓ Data valid: ${places.length} places, ${climate.length} zones, ${legs.length} legs, ${monasteries.length} monasteries`);
