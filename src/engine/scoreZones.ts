import type { ClimateZone, Month, Score, ZoneId } from './types';

export function scoreZones(month: Month, climate: ClimateZone[]): { scores: Record<ZoneId, Score>; best: ZoneId } {
  const scores = {} as Record<ZoneId, Score>;
  let best: ClimateZone = climate[0];
  for (const z of climate) {
    const m = z.months[String(month)];
    scores[z.id] = m.score as Score;
    const b = best.months[String(month)];
    // highest score wins; ties go to the drier zone
    if (m.score > b.score || (m.score === b.score && m.rainMm < b.rainMm)) best = z;
  }
  return { scores, best: best.id };
}
