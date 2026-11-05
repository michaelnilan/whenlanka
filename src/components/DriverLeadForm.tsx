import { useState, type FormEvent } from 'react';
import { track } from '../lib/analytics';

type Props = { endpoint?: string; routeSummary: string; days: number; month: string };

export default function DriverLeadForm({ endpoint, routeSummary, days, month }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!endpoint) { setState('error'); return; }
    setState('sending');
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new FormData(e.currentTarget), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      setState('sent');
      track('lead_submit', { days, month });
    } catch {
      setState('error');
    }
  };
  if (state === 'sent') {
    return (
      <div id="driver" className="rounded-2xl border border-teal bg-white p-5">
        <h2 className="text-xl font-semibold">Thanks, request sent</h2>
        <p className="mt-1 text-sm">A local driver partner will email you a quote for this route within 48 hours.</p>
      </div>
    );
  }
  const field = 'w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal/40';
  return (
    <form id="driver" onSubmit={onSubmit} action={endpoint} method="POST" className="rounded-2xl border border-line bg-white p-5 no-print">
      <h2 className="text-xl font-semibold">Want a private driver for this route?</h2>
      <p className="mt-1 text-sm text-muted">
        Free, no-obligation quote from a vetted local driver. We pass your route on; you deal with them directly.
      </p>
      <input type="hidden" name="route" value={routeSummary} />
      <input type="hidden" name="_subject" value={`Driver quote: ${days} days, ${month}`} />
      <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <label className="text-sm">Name<input required name="name" className={field} autoComplete="name" /></label>
        <label className="text-sm">Email<input required type="email" name="email" className={field} autoComplete="email" /></label>
        <label className="text-sm">Arrival date<input type="date" name="dates" className={field} /></label>
        <label className="text-sm">Group size<input type="number" min={1} max={20} defaultValue={2} name="group_size" className={field} /></label>
      </div>
      <label className="text-sm block mt-3">Route
        <textarea name="route_text" rows={2} className={field} defaultValue={routeSummary} />
      </label>
      <button type="submit" disabled={state === 'sending'} className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-saffron text-white font-semibold hover:brightness-95 disabled:opacity-60">
        {state === 'sending' ? 'Sending…' : 'Request a quote'}
      </button>
      {state === 'error' && (
        <p className="mt-2 text-sm text-red-700">
          {endpoint ? 'Something went wrong. Please try again.' : 'The quote form is not connected yet.'}
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted">We only use your details to pass this request to one driver partner. See our <a href="/privacy">privacy policy</a>.</p>
    </form>
  );
}
