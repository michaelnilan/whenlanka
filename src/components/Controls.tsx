import { MONTH_NAMES, type Month, type Pace, type Score, type Tag } from '../engine';
import { SCORE_COLOR } from './colors';
import { INTERESTS } from '../lib/slugs';

export function MonthSlider({ value, monthBest, onChange }: { value: Month; monthBest: Score[]; onChange: (m: Month) => void }) {
  return (
    <div>
      <label htmlFor="month" className="flex justify-between text-sm font-medium">
        <span>Month</span>
        <span className="text-teal font-semibold">{MONTH_NAMES[value - 1]}</span>
      </label>
      <input id="month" type="range" min={1} max={12} step={1} value={value} onChange={(e) => onChange(Number(e.target.value) as Month)} className="w-full mt-2" />
      <div className="grid grid-cols-12 gap-0.5 mt-1" aria-hidden="true">
        {MONTH_NAMES.map((n, i) => (
          <button
            key={n}
            type="button"
            tabIndex={-1}
            onClick={() => onChange((i + 1) as Month)}
            className={`text-[10px] leading-tight text-center rounded py-0.5 ${i + 1 === value ? 'font-bold text-ink' : 'text-muted'}`}
          >
            <span className="block h-1.5 rounded-full mb-0.5" style={{ background: SCORE_COLOR[monthBest[i]] }} />
            {n.slice(0, 1)}
          </button>
        ))}
      </div>
    </div>
  );
}

const SNAPS = [7, 10, 14, 21];
export function DaysSlider({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const snap = (d: number) => SNAPS.find((s) => Math.abs(s - d) === 0) ?? d;
  return (
    <div>
      <label htmlFor="days" className="flex justify-between text-sm font-medium">
        <span>Trip length</span>
        <span className="text-teal font-semibold">
          {value} days · {value - 1} nights
        </span>
      </label>
      <input id="days" type="range" min={4} max={21} step={1} list="day-snaps" value={value} onChange={(e) => onChange(snap(Number(e.target.value)))} className="w-full mt-2" />
      <datalist id="day-snaps">
        {SNAPS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="flex gap-1 mt-1">
        {SNAPS.map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} className={`text-xs px-2 py-0.5 rounded-full border ${value === s ? 'bg-teal text-white border-teal' : 'border-line text-muted hover:border-teal'}`}>
            {s}d
          </button>
        ))}
      </div>
    </div>
  );
}

export function InterestChips({ value, onChange }: { value: Tag[]; onChange: (t: Tag[]) => void }) {
  const toggle = (t: Tag) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-1.5">Interests <span className="text-muted font-normal">(optional)</span></legend>
      <div className="flex flex-wrap gap-1.5">
        {INTERESTS.map((i) => {
          const on = value.includes(i.tag);
          return (
            <button key={i.tag} type="button" aria-pressed={on} onClick={() => toggle(i.tag)} className={`text-sm px-3 py-1 rounded-full border transition ${on ? 'bg-teal text-white border-teal' : 'bg-white border-line hover:border-teal'}`}>
              {i.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PaceToggle({ value, onChange }: { value: Pace; onChange: (p: Pace) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium mb-1.5">Pace</legend>
      <div className="inline-flex rounded-lg border border-line bg-white overflow-hidden">
        {(['slow', 'normal', 'fast'] as Pace[]).map((p) => (
          <button key={p} type="button" aria-pressed={value === p} onClick={() => onChange(p)} className={`text-sm px-3 py-1 capitalize ${value === p ? 'bg-teal text-white' : 'hover:bg-sand'}`}>
            {p}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SacredToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-[#b5651d] w-4 h-4" />
      <span>
        <span className="font-medium">Sacred &amp; Silent</span> <span className="text-muted">· add monasteries near each stop</span>
      </span>
    </label>
  );
}
