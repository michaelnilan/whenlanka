import type { ClimateZone, Monastery, Month, Place } from '../engine';
import ClimateStrip from './ClimateStrip';
import { AffiliateRow } from './DayList';
import { paths } from '../lib/slugs';

const KIND_LABEL: Record<Monastery['kind'], string> = {
  ancient: 'Ancient monastery',
  'forest-hermitage': 'Forest hermitage',
  'lay-retreat': 'Meditation centre (lay retreats)',
  temple: 'Temple',
};

export function MonasteryCard({ monastery: m, compact }: { monastery: Monastery; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e7cfb5] bg-[#fdf6ee] p-3 text-sm">
      <p className="text-[11px] uppercase tracking-wide text-[#8a4b14]">Sacred &amp; Silent · {KIND_LABEL[m.kind]}</p>
      <p className="font-semibold mt-0.5">
        <a href={paths.monastery(m.slug)} className="text-ink hover:text-teal">{m.name}</a>
      </p>
      {!compact && <p className="mt-1 leading-relaxed">{m.blurb}</p>}
      <p className="mt-1 text-muted">
        {m.stayPossible ? 'Overnight stays possible' : 'Day visit only'}
        {m.acceptsForeigners ? ' · foreign visitors welcome' : ''}
        {m.tradition ? ` · ${m.tradition}` : ''}
      </p>
      {!compact && (
        <>
          <p className="mt-2 font-medium">Etiquette</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            {m.etiquette.map((e) => <li key={e}>{e}</li>)}
          </ul>
          {m.contact && <p className="mt-2"><span className="font-medium">Requesting a stay:</span> {m.contact}</p>}
          <p className="mt-2 text-xs text-muted">Source: <a href={m.source} rel="noopener" target="_blank">{new URL(m.source).hostname}</a></p>
        </>
      )}
    </div>
  );
}

export default function StopDetail({ place, zone, month, monastery, onClose }: {
  place: Place; zone: ClimateZone; month: Month; monastery?: Monastery; onClose: () => void;
}) {
  return (
    <aside
      className="fixed inset-x-0 bottom-0 z-40 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-line bg-white p-5 shadow-2xl lg:static lg:max-h-none lg:rounded-2xl lg:border lg:shadow-none"
      aria-label={`${place.name} details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{zone.name}</p>
          <h3 className="text-2xl font-semibold">{place.name}</h3>
        </div>
        <button type="button" onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink" aria-label="Close">×</button>
      </div>
      <p className="mt-2 leading-relaxed">{place.blurb}</p>
      <ul className="mt-3 list-disc pl-5 text-sm space-y-1">
        {place.highlights.map((h) => <li key={h}>{h}</li>)}
      </ul>
      <div className="mt-4">
        <p className="text-sm font-medium mb-1">Weather through the year</p>
        <ClimateStrip zone={zone} month={month} />
      </div>
      {monastery && <div className="mt-4"><MonasteryCard monastery={monastery} /></div>}
      <AffiliateRow place={place} ctx={{ month }} />
      <a href={paths.place(place.slug)} className="inline-block mt-3 text-sm font-medium">Full guide to {place.name} →</a>
    </aside>
  );
}
