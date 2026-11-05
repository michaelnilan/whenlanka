import { MONTH_NAMES, type ClimateZone, type Month } from '../engine';
import { SCORE_COLOR, SCORE_LABEL } from './colors';

export default function ClimateStrip({ zone, month }: { zone: ClimateZone; month?: Month }) {
  const max = Math.max(...Object.values(zone.months).map((m) => m.rainMm), 1);
  return (
    <figure className="w-full">
      <div className="grid grid-cols-12 gap-1 items-end h-16" role="img" aria-label={`Monthly conditions for ${zone.name}`}>
        {MONTH_NAMES.map((n, i) => {
          const m = zone.months[String(i + 1)];
          const on = month === i + 1;
          return (
            <div key={n} className="flex flex-col items-center justify-end h-full" title={`${n}: ${SCORE_LABEL[m.score]}, ~${m.rainMm} mm rain`}>
              <div
                className={`w-full rounded-sm ${on ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                style={{ height: `${Math.max(12, (m.rainMm / max) * 100)}%`, background: SCORE_COLOR[m.score] }}
              />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-12 gap-1 mt-1 text-[10px] text-muted text-center">
        {MONTH_NAMES.map((n, i) => (
          <span key={n} className={month === i + 1 ? 'font-bold text-ink' : ''}>{n.slice(0, 3)}</span>
        ))}
      </div>
      <figcaption className="sr-only">Bar height is average rainfall; colour is how good the month is.</figcaption>
    </figure>
  );
}

export function ScoreLegend({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted ${className}`}>
      {[3, 2, 1, 0].map((s) => (
        <li key={s} className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SCORE_COLOR[s] }} />
          {SCORE_LABEL[s]}
        </li>
      ))}
    </ul>
  );
}
