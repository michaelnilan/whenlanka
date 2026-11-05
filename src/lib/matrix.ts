// The full month × duration page matrix, built once per build and reused for
// internal linking ("itineraries that include this place").
import { ALL_MONTHS, buildRoute, type Itinerary, type Month } from '../engine';
import { dataset } from './data';
import { DURATIONS } from './slugs';

let cache: { days: number; month: Month; it: Itinerary }[] | undefined;

export function matrix() {
  cache ??= DURATIONS.flatMap((days) => ALL_MONTHS.map((month) => ({ days, month, it: buildRoute({ month, days, interests: [] }, dataset) })));
  return cache;
}

/** Up to n itinerary pages that include the place, preferring 14/10-day trips in its best months. */
export function itinerariesWith(placeId: string, n = 3) {
  const pref = [14, 10, 7, 18, 21, 5];
  return matrix()
    .filter((x) => x.it.stops.some((s) => s.id === placeId))
    .map((x) => ({ ...x, score: Math.min(...x.it.stops.filter((s) => s.id === placeId).map((s) => x.it.zoneScores[s.zone])) }))
    .sort((a, b) => b.score - a.score || pref.indexOf(a.days) - pref.indexOf(b.days) || a.month - b.month)
    .filter((x, i, arr) => arr.findIndex((y) => y.days === x.days) === i) // one per duration
    .slice(0, n);
}
