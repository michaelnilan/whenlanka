import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_MONTHS, buildRoute, monthName, scoreZones,
  type Dataset, type Month, type Pace, type RouteInput, type Score, type Tag, type ZoneId,
} from '../engine';
import { TAGS } from '../schemas';
import { DaysSlider, InterestChips, MonthSlider, PaceToggle, SacredToggle } from './Controls';
import IslandMap from './IslandMap';
import DayList, { WarningBanner } from './DayList';
import StopDetail from './StopDetail';
import ShareBar from './ShareBar';
import DriverLeadForm from './DriverLeadForm';
import { ScoreLegend } from './ClimateStrip';
import { SITE, paths } from '../lib/slugs';

type Props = {
  initial: RouteInput;
  data: Dataset;
  formEndpoint?: string;
  /** read ?m&d&i&p&s from the URL on mount (true on the home page and all itinerary pages) */
  readUrl?: boolean;
  showLeadForm?: boolean;
  /** default to next month on the client when the URL has no settings (home page) */
  autoMonth?: boolean;
};

const PACES: Pace[] = ['slow', 'normal', 'fast'];

function fromSearch(search: string, base: RouteInput): RouteInput | null {
  const q = new URLSearchParams(search);
  if (![...q.keys()].some((k) => ['m', 'd', 'i', 'p', 's', 'x', 'inc'].includes(k))) return null;
  const m = Number(q.get('m'));
  const d = Number(q.get('d'));
  const list = (k: string) => (q.get(k) ?? '').split(',').filter(Boolean);
  return {
    month: (m >= 1 && m <= 12 ? m : base.month) as Month,
    days: d >= 4 && d <= 21 ? d : base.days,
    interests: q.has('i') ? (list('i').filter((t) => (TAGS as readonly string[]).includes(t)) as Tag[]) : base.interests,
    pace: PACES.includes(q.get('p') as Pace) ? (q.get('p') as Pace) : base.pace,
    sacred: q.has('s') ? q.get('s') === '1' : base.sacred,
    exclude: list('x'),
    include: list('inc'),
  };
}

function toSearch(s: RouteInput): string {
  const q = new URLSearchParams();
  q.set('m', String(s.month));
  q.set('d', String(s.days));
  if (s.interests.length) q.set('i', s.interests.join(','));
  if (s.pace && s.pace !== 'normal') q.set('p', s.pace);
  if (s.sacred) q.set('s', '1');
  if (s.exclude?.length) q.set('x', s.exclude.join(','));
  if (s.include?.length) q.set('inc', s.include.join(','));
  return q.toString().replace(/%2C/g, ',');
}

function useIsDesktop(): boolean | undefined {
  const [v, setV] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return v;
}

export default function Planner({ initial, data, formEndpoint, readUrl = true, showLeadForm = true, autoMonth = false }: Props) {
  const [state, setState] = useState<RouteInput>({ pace: 'normal', sacred: false, ...initial });
  const [selected, setSelected] = useState<string | undefined>();
  const touched = useRef(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!readUrl) return;
    const fromUrl = fromSearch(window.location.search, state);
    if (fromUrl) setState(fromUrl);
    else if (autoMonth) setState((s) => ({ ...s, month: (((new Date().getMonth() + 1) % 12) + 1) as Month }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<RouteInput>, keepSwaps = false) => {
    touched.current = true;
    setState((s) => ({ ...s, ...patch, ...(keepSwaps ? {} : { include: [], exclude: [] }) }));
  }, []);

  const itinerary = useMemo(() => buildRoute(state, data), [state, data]);

  useEffect(() => {
    if (!touched.current) return;
    const url = `${window.location.pathname}?${toSearch(state)}`;
    window.history.replaceState(null, '', url);
  }, [state]);

  const monthBest = useMemo(
    () => ALL_MONTHS.map((m) => Math.max(...Object.values(scoreZones(m, data.climate).scores)) as Score),
    [data.climate],
  );

  const sacredMonasteries = useMemo(
    () => (state.sacred ? itinerary.days.flatMap((d) => (d.monastery ? [d.monastery] : [])) : []),
    [state.sacred, itinerary],
  );

  const onSwap = (_dayN: number, placeId: string) => {
    const current = itinerary.days.find((d) => d.n === _dayN)?.stop.id;
    if (!current) return;
    touched.current = true;
    setState((s) => ({
      ...s,
      exclude: [...new Set([...(s.exclude ?? []), current])],
      include: [...new Set([...(s.include ?? []).filter((id) => id !== current), placeId])],
    }));
  };

  const selPlace = selected ? data.places.find((p) => p.id === selected) : undefined;
  const selZone = selPlace ? data.climate.find((z) => z.id === selPlace.zone) : undefined;
  const selMonastery = selected && state.sacred ? itinerary.days.find((d) => d.stop.id === selected && d.monastery)?.monastery : undefined;
  const bestZoneName = data.climate.find((z) => z.id === itinerary.bestZone)?.name;
  const routeText = `${state.days} days in ${monthName(state.month)}: ${['Negombo', ...itinerary.stops.map((s) => s.name), 'Negombo'].join(' → ')}`;
  const shareUrl = `${SITE}${paths.durationMonth(nearestDuration(state.days), state.month)}?${toSearch(state)}`;
  const swapped = (state.exclude?.length ?? 0) > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-5 min-w-0">
        <section aria-label="Trip settings" className="rounded-2xl border border-line bg-white p-4 sm:p-5 space-y-5 no-print">
          <MonthSlider value={state.month} monthBest={monthBest} onChange={(month) => update({ month })} />
          <DaysSlider value={state.days} onChange={(days) => update({ days })} />
          <InterestChips value={state.interests} onChange={(interests) => update({ interests })} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <PaceToggle value={state.pace ?? 'normal'} onChange={(pace) => update({ pace })} />
            <SacredToggle value={!!state.sacred} onChange={(sacred) => update({ sacred }, true)} />
          </div>
        </section>

        <div className="lg:hidden">
          <IslandMap
            interactive={isDesktop === false}
            className="h-[380px]"
            zones={data.climate}
            zoneScores={itinerary.zoneScores}
            polyline={itinerary.polyline}
            stops={itinerary.stops}
            monasteries={sacredMonasteries}
            selectedStop={selected}
            onMarkerClick={setSelected}
          />
        </div>

        <section aria-label="Your route" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-semibold">
              {state.days} days in {monthName(state.month)}
            </h2>
            <p className="text-sm text-muted">
              {itinerary.stops.length} stops · ~{Math.round(itinerary.totalMinutes / 60)} h travel
            </p>
          </div>
          <p className="text-[15px]">
            <span className="font-medium">Route:</span> Negombo → {itinerary.stops.map((s) => s.name).join(' → ')} → Negombo
          </p>
          {swapped && (
            <button type="button" className="text-sm underline text-muted no-print" onClick={() => update({})}>
              Reset swapped stops
            </button>
          )}
          <WarningBanner warnings={itinerary.warnings} />
          <ShareBar url={shareUrl} text={routeText} />
          <DayList itinerary={itinerary} selectedStop={selected} onSelect={setSelected} onSwap={onSwap} placeHref={paths.place} />
        </section>

        {showLeadForm && (
          <DriverLeadForm key={routeText} endpoint={formEndpoint} routeSummary={routeText} days={state.days} month={monthName(state.month)} />
        )}
      </div>

      <div className="hidden lg:block min-w-0">
        <div className="sticky top-4 space-y-3">
          <IslandMap
            interactive={isDesktop === true}
            className="h-[min(72vh,640px)]"
            zones={data.climate}
            zoneScores={itinerary.zoneScores}
            polyline={itinerary.polyline}
            stops={itinerary.stops}
            monasteries={sacredMonasteries}
            selectedStop={selected}
            onMarkerClick={setSelected}
          />
          <MapLegend month={state.month} best={bestZoneName} />
          {selPlace && selZone && (
            <StopDetail place={selPlace} zone={selZone} month={state.month} monastery={selMonastery} onClose={() => setSelected(undefined)} />
          )}
        </div>
      </div>
      <div className="lg:hidden">
        <MapLegend month={state.month} best={bestZoneName} />
        {selPlace && selZone && (
          <StopDetail place={selPlace} zone={selZone} month={state.month} monastery={selMonastery} onClose={() => setSelected(undefined)} />
        )}
      </div>
    </div>
  );
}

export function MapLegend({ month, best }: { month: Month; best?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <ScoreLegend />
      {best && (
        <p className="text-sm mt-1.5">
          Best region in {monthName(month)}: <span className="font-semibold">{best}</span>
        </p>
      )}
    </div>
  );
}

const DURS = [5, 7, 10, 14, 18, 21];
function nearestDuration(d: number) {
  return DURS.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a));
}
export type { ZoneId };
