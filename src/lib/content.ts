// Copy helpers shared by pages: titles, descriptions, FAQs, month summaries.
import { ALL_MONTHS, monthName, type Dataset, type Itinerary, type Month, type Place, type Tag, type ZoneId } from '../engine';
import { interestByTag } from './slugs';

export const SITE_NAME = 'whensrilanka';

export function bestOverallMonth(data: Dataset): Month {
  let best: Month = 1;
  let bestScore = -1;
  for (const m of ALL_MONTHS) {
    const s = data.places.reduce((acc, p) => acc + p.weight * (data.climate.find((z) => z.id === p.zone)!.months[String(m)].score / 3), 0);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

export const routeLine = (it: Itinerary) => it.stops.map((s) => s.name).join(' → ');

export function zoneLists(data: Dataset, m: Month) {
  const go = data.climate.filter((z) => z.months[String(m)].score >= 2).sort((a, b) => b.months[String(m)].score - a.months[String(m)].score);
  const skip = data.climate.filter((z) => z.months[String(m)].score <= 1).sort((a, b) => a.months[String(m)].score - b.months[String(m)].score);
  return { go, skip };
}

export function topPlacesForMonth(data: Dataset, m: Month, n = 5): Place[] {
  return [...data.places]
    .filter((p) => !p.gateway)
    .map((p) => ({ p, s: p.weight * data.climate.find((z) => z.id === p.zone)!.months[String(m)].score }))
    .sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id))
    .slice(0, n)
    .map((x) => x.p);
}

export function bestMonthsFor(data: Dataset, zone: ZoneId): Month[] {
  const z = data.climate.find((c) => c.id === zone)!;
  return ALL_MONTHS.filter((m) => z.months[String(m)].score === 3);
}

export function monthRange(ms: Month[]): string {
  if (!ms.length) return 'no month is ideal';
  // collapse consecutive months, allowing wrap-around (e.g. December–March)
  const set = new Set(ms);
  const starts = ms.filter((m) => !set.has((((m + 10) % 12) + 1) as Month));
  if (!starts.length) return 'all year';
  return starts
    .map((s) => {
      let e = s;
      while (set.has(((e % 12) + 1) as Month) && ((e % 12) + 1) !== s) e = ((e % 12) + 1) as Month;
      return e === s ? monthName(s) : `${monthName(s)}–${monthName(e)}`;
    })
    .join(', ');
}

export function itineraryTitle(days: number, m?: Month, tag?: Tag): string {
  if (tag) return `${days}-Day Sri Lanka ${interestByTag(tag).label} Itinerary: Route & Map`;
  if (m) return `${days}-Day Sri Lanka Itinerary for ${monthName(m)}: Route, Map & Weather`;
  return `${days}-Day Sri Lanka Itinerary: Route, Map & Best Months`;
}

export function itineraryDescription(it: Itinerary, data: Dataset): string {
  const m = monthName(it.input.month);
  const zones = data.climate;
  const dry = zones.filter((z) => it.zoneScores[z.id] === 3).map((z) => z.name);
  const wet = zones.filter((z) => it.zoneScores[z.id] === 0).map((z) => z.name);
  let s = `${it.input.days} days in ${m}: ${routeLine(it)}.`;
  if (dry.length) s += ` Dry in the ${dry.slice(0, 2).join(' & ')}`;
  if (wet.length) s += `${dry.length ? ';' : ''} skip the ${wet.join(' & ')}`;
  return (s + '.').replace('..', '.').slice(0, 300);
}

export function itineraryFaq(it: Itinerary, data: Dataset): { q: string; a: string }[] {
  const m = monthName(it.input.month);
  const d = it.input.days;
  const wet = data.climate.filter((z) => it.zoneScores[z.id] === 0).map((z) => z.name);
  const best = data.climate.find((z) => z.id === it.bestZone)!.name;
  const hours = Math.round(it.totalMinutes / 60);
  const scenic = it.days.some((x) => x.legIn?.scenic);
  return [
    {
      q: `Is ${d} days enough for Sri Lanka in ${m}?`,
      a: `${d} days covers ${it.stops.length} stops (${routeLine(it)}) with about ${hours} hours of total travel. ${
        d < 10 ? 'It is a highlights trip; add days to reach the coast at a relaxed pace.' : 'That is enough to combine culture, hills and coast without rushing.'
      }`,
    },
    {
      q: `What is the weather like in Sri Lanka in ${m}?`,
      a: `The ${best} is at its best in ${m}.${wet.length ? ` The ${wet.join(' and ')} ${wet.length > 1 ? 'are' : 'is'} in monsoon, so this route avoids ${wet.length > 1 ? 'them' : 'it'}.` : ' No region is in full monsoon, though afternoon showers are always possible in the tropics.'}`,
    },
    {
      q: 'How do you get around on this route?',
      a: `Most legs are by private car with a driver, which is affordable in Sri Lanka and the most flexible way to travel.${scenic ? ' The hill-country section is by the scenic train; book reserved seats in advance.' : ''}`,
    },
    {
      q: 'Where does the trip start and end?',
      a: 'At Negombo, 20 minutes from Bandaranaike International Airport (CMB), so the first and last nights are an easy transfer.',
    },
  ];
}
