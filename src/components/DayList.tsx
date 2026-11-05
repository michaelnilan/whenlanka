import { useEffect, useRef, useState } from 'react';
import type { Day, Itinerary, Leg, Place } from '../engine';
import { DISCLOSURE, placeLinks, retreat, train, type AffiliateLink } from '../lib/affiliates';
import { track } from '../lib/analytics';
import { MonasteryCard } from './StopDetail';

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
};
const MODE_ICON: Record<Leg['mode'], string> = { car: '🚗', train: '🚆', bus: '🚌', 'car+boat': '⛴️' };
const MODE_LABEL: Record<Leg['mode'], string> = { car: 'by car', train: 'by train', bus: 'by bus', 'car+boat': 'by car and ferry' };

export function LegBadge({ leg, from, ctx }: { leg: Leg; from?: string; ctx?: Record<string, string | number> }) {
  const t = train(leg);
  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-xs rounded-full px-2.5 py-1 ${leg.scenic ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-sand text-muted border border-line'}`}>
      <span aria-hidden="true">{MODE_ICON[leg.mode]}</span>
      <span>
        {from ? `From ${from}: ` : ''}
        {fmtDuration(leg.minutes)} {MODE_LABEL[leg.mode]}
        {leg.scenic ? ' · scenic route' : ''}
      </span>
      {t && <AffiliateButton link={t} ctx={ctx} small />}
    </div>
  );
}

export function AffiliateButton({ link, ctx = {}, small }: { link: AffiliateLink; ctx?: Record<string, string | number>; small?: boolean }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="sponsored noopener"
      onClick={() => track('affiliate_click', { kind: link.kind, partner: link.partner, ...ctx })}
      className={
        small
          ? 'underline font-medium text-teal'
          : 'inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-teal text-teal hover:bg-teal hover:text-white transition'
      }
    >
      {link.label} <span aria-hidden="true">↗</span>
    </a>
  );
}

export function AffiliateRow({ place, ctx }: { place: Place; ctx?: Record<string, string | number> }) {
  const links = placeLinks(place);
  if (!links.length) return null;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <AffiliateButton key={l.kind + l.partner} link={l} ctx={{ place: place.id, ...ctx }} />
        ))}
      </div>
      <p className="text-[11px] text-muted mt-1.5">{DISCLOSURE}</p>
    </div>
  );
}

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
      <ul className="space-y-1">
        {warnings.map((w) => (
          <li key={w} className="flex gap-2"><span aria-hidden="true">☂</span><span>{w}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function SwapButton({ alternates, onSwap }: { alternates: Place[]; onSwap: (placeId: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!alternates.length) return null;
  return (
    <div className="relative no-print">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs text-muted hover:text-teal underline">
        Swap stop
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-line bg-white shadow-lg p-1">
          {alternates.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => { setOpen(false); onSwap(a.id); }} className="w-full text-left text-sm px-3 py-2 rounded hover:bg-sand">
                {a.name} <span className="text-muted text-xs">· {a.tags.slice(0, 2).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Consecutive days at the same stop render as one card. */
export function groupDays(days: Day[]): Day[][] {
  const out: Day[][] = [];
  for (const d of days) {
    const last = out.at(-1);
    if (last && last[0].stop.id === d.stop.id && !d.legIn && d.nightsHere > 0) last.push(d);
    else out.push([d]);
  }
  return out;
}

type CardProps = {
  group: Day[];
  index?: number;
  prevName?: string;
  selected: boolean;
  alternates: Place[];
  ctx: Record<string, string | number>;
  placeHref?: (slug: string) => string;
  onSelect: (id: string) => void;
  onSwap?: (dayN: number, placeId: string) => void;
};

export function DayCard({ group, index, prevName, selected, alternates, ctx, placeHref, onSelect, onSwap }: CardProps) {
  const first = group[0];
  const last = group.at(-1)!;
  const p = first.stop;
  const isEnd = first.nightsHere === 0;
  const isStart = first.n === 1;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);
  const r = first.monastery ? retreat(first.monastery) : undefined;
  return (
    <article
      ref={ref}
      id={`day-${first.n}`}
      className={`rounded-2xl border bg-white p-4 sm:p-5 transition ${selected ? 'border-teal ring-2 ring-teal/30' : 'border-line'}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {group.length > 1 ? `Days ${first.n}–${last.n}` : `Day ${first.n}`}
            {!isEnd && ` · ${first.nightsHere} night${first.nightsHere > 1 ? 's' : ''}`}
          </p>
          <h3 className="text-xl font-semibold mt-0.5">
            {index !== undefined && !isStart && !isEnd && (
              <span className="inline-flex items-center justify-center w-6 h-6 mr-2 rounded-full bg-teal text-white text-xs align-middle font-sans">{index}</span>
            )}
            <button type="button" onClick={() => onSelect(p.id)} className="hover:text-teal text-left">
              {isEnd ? `Back to ${p.name} & fly home` : isStart ? `Arrive in ${p.name}` : p.name}
            </button>
          </h3>
        </div>
        {!isStart && !isEnd && onSwap && <SwapButton alternates={alternates} onSwap={(id) => onSwap(first.n, id)} />}
      </header>
      {first.legIn && (
        <div className="mt-2">
          <LegBadge leg={first.legIn} from={prevName} ctx={ctx} />
        </div>
      )}
      {!isEnd && !isStart && <p className="mt-3 text-[15px] leading-relaxed">{p.blurb}</p>}
      <ul className="mt-3 space-y-1.5 text-sm">
        {group.map((d) =>
          d.tips.length ? (
            <li key={d.n} className="flex gap-2">
              {group.length > 1 && <span className="text-muted shrink-0 w-12">Day {d.n}</span>}
              <span>{d.tips.join(' · ')}</span>
            </li>
          ) : null,
        )}
      </ul>
      {first.monastery && (
        <div className="mt-3">
          <MonasteryCard monastery={first.monastery} compact />
          {r && <div className="mt-2"><AffiliateButton link={r} ctx={{ ...ctx, place: first.monastery.id }} /></div>}
        </div>
      )}
      {!isEnd && <AffiliateRow place={p} ctx={ctx} />}
      {placeHref && !isEnd && (
        <a href={placeHref(p.slug)} className="inline-block mt-3 text-sm font-medium">
          More about {p.name} →
        </a>
      )}
    </article>
  );
}

export default function DayList({
  itinerary, selectedStop, onSelect, onSwap, placeHref,
}: {
  itinerary: Itinerary;
  selectedStop?: string;
  onSelect: (id: string) => void;
  onSwap?: (dayN: number, placeId: string) => void;
  placeHref?: (slug: string) => string;
}) {
  const groups = groupDays(itinerary.days);
  const ctx = { month: itinerary.input.month, days: itinerary.input.days };
  let stopIdx = 0;
  return (
    <ol className="space-y-3">
      {groups.map((g, i) => {
        const isStop = g[0].nightsHere > 0 && g[0].n !== 1;
        if (isStop) stopIdx++;
        return (
          <li key={g[0].n}>
            <DayCard
              group={g}
              index={isStop ? stopIdx : undefined}
              prevName={i > 0 ? groups[i - 1][0].stop.name : undefined}
              selected={selectedStop === g[0].stop.id && isStop}
              alternates={itinerary.alternates}
              ctx={ctx}
              placeHref={placeHref}
              onSelect={onSelect}
              onSwap={onSwap}
            />
          </li>
        );
      })}
    </ol>
  );
}
