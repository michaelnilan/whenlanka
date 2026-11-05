import { describe, expect, it } from 'vitest';
import { buildRoute, type Dataset, type Month, type RouteInput } from '../src/engine';
import places from '../src/data/places.json';
import climate from '../src/data/climate.json';
import legs from '../src/data/legs.json';

const data = { places, climate, legs, monasteries: [] } as unknown as Dataset;
const run = (i: Partial<RouteInput>) => buildRoute({ month: 1, days: 14, interests: [], ...i } as RouteInput, data);
const names = (i: Partial<RouteInput>) => run(i).stops.map((s) => s.name);

describe('buildRoute invariants', () => {
  const months = Array.from({ length: 12 }, (_, i) => (i + 1) as Month);
  const durations = [4, 5, 7, 10, 14, 18, 21];

  it('total nights equals days − 1 and there is one Day per calendar day', () => {
    for (const month of months) for (const days of durations) for (const pace of ['slow', 'normal', 'fast'] as const) {
      const it = run({ month, days, pace });
      let total = 0;
      let prev = '';
      for (const d of it.days) {
        if (d.stop.id !== prev) { total += d.nightsHere; prev = d.stop.id; }
      }
      expect(total, `${month}/${days}/${pace}`).toBe(days - 1);
      expect(it.days.length).toBe(days);
      expect(it.days.map((d) => d.n)).toEqual(Array.from({ length: days }, (_, i) => i + 1));
    }
  });

  it('never includes a zone-0 stop without a warning', () => {
    for (const month of months) for (const days of durations) {
      const it = run({ month, days });
      const wet = it.stops.filter((s) => it.zoneScores[s.zone] === 0);
      if (wet.length) expect(it.warnings.length).toBeGreaterThan(0);
    }
  });

  it('starts and ends at a gateway', () => {
    for (const month of months) for (const days of durations) {
      const it = run({ month, days });
      expect(it.days[0].stop.gateway).toBe(true);
      expect(it.days.at(-1)!.stop.gateway).toBe(true);
      expect(it.polyline[0]).toEqual(it.polyline.at(-1));
    }
  });

  it('has no non-scenic leg over 6 hours', () => {
    for (const month of months) for (const days of durations) {
      for (const d of run({ month, days }).days) {
        if (d.legIn && !d.legIn.scenic) expect(d.legIn.minutes, `${month}/${days} ${d.legIn.from}→${d.legIn.to}`).toBeLessThanOrEqual(360);
      }
    }
  });

  it('is deterministic', () => {
    for (const month of months) {
      const a = run({ month, days: 10, interests: ['beach', 'wildlife'] });
      const b = run({ month, days: 10, interests: ['wildlife', 'beach'] });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});

describe('phase-2 gates', () => {
  it('January 14 days: Sigiriya → Kandy → Ella → Yala → Mirissa → Galle', () => {
    expect(names({ month: 1, days: 14 })).toEqual(['Sigiriya', 'Kandy', 'Ella', 'Yala', 'Mirissa', 'Galle']);
    expect(names({ month: 1, days: 14 })).not.toContain('Arugam Bay');
  });

  it('July 14 days: Sigiriya, Kandy, Ella, Arugam Bay, Trincomalee; no south coast', () => {
    const n = names({ month: 7, days: 14 });
    expect([...n].sort()).toEqual(['Arugam Bay', 'Ella', 'Kandy', 'Sigiriya', 'Trincomalee']);
    expect(n).not.toContain('Mirissa');
    expect(n).not.toContain('Galle');
  });

  it('builds a route in under 50 ms', () => {
    for (const month of [1, 7] as Month[]) {
      const t = performance.now();
      run({ month, days: 14 });
      expect(performance.now() - t).toBeLessThan(50);
    }
  });
});

describe('features', () => {
  it('interests shift the route', () => {
    expect(names({ month: 2, days: 10, interests: ['wildlife'] }).some((n) => ['Yala', 'Udawalawe', 'Wilpattu', 'Minneriya'].includes(n))).toBe(true);
  });
  it('exclude/include swap a stop', () => {
    const base = run({ month: 1, days: 14 });
    const swapped = run({ month: 1, days: 14, exclude: ['yala'], include: ['udawalawe'] });
    expect(swapped.stops.map((s) => s.id)).toContain('udawalawe');
    expect(swapped.stops.map((s) => s.id)).not.toContain('yala');
    expect(base.alternates.length).toBe(3);
  });
  it('warns about monsoon zones', () => {
    expect(run({ month: 11, days: 14 }).warnings.join(' ')).toMatch(/East Coast is in monsoon/);
  });
});
