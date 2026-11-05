// The only file in the codebase that knows affiliate IDs or URL formats.
// IDs come from PUBLIC_* env vars; with no ID set the links still work, untracked.
import type { Leg, Monastery, Place } from '../engine';

const env = (k: string): string => ((import.meta as unknown as { env?: Record<string, string> }).env?.[k] ?? '').trim();

const withParam = (url: string, key: string, value: string) =>
  value ? `${url}${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}` : url;

export type AffiliateKind = 'stay' | 'tour' | 'train' | 'driver' | 'retreat';
export type AffiliateLink = { kind: AffiliateKind; url: string; label: string; partner: string };

export const stay = (p: Place): AffiliateLink => ({
  kind: 'stay',
  partner: 'Booking.com',
  label: `Stays in ${p.name}`,
  url: withParam(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${p.name}, Sri Lanka`)}`, 'aid', env('PUBLIC_BOOKING_AID')),
});

export const stayAgoda = (p: Place): AffiliateLink => ({
  kind: 'stay',
  partner: 'Agoda',
  label: `Agoda: ${p.name}`,
  url: withParam(`https://www.agoda.com/search?textToSearch=${encodeURIComponent(`${p.name}, Sri Lanka`)}`, 'cid', env('PUBLIC_AGODA_CID')),
});

export const tour = (p: Place): AffiliateLink => ({
  kind: 'tour',
  partner: 'GetYourGuide',
  label: p.tags.includes('wildlife') ? `Safaris near ${p.name}` : `Tours in ${p.name}`,
  url: withParam(`https://www.getyourguide.com/s/?q=${encodeURIComponent(`${p.name} Sri Lanka`)}`, 'partner_id', env('PUBLIC_GYG_PARTNER_ID')),
});

// 12Go station slugs for the scenic rail legs we list
const STATION: Record<string, string> = {
  colombo: 'colombo', kandy: 'kandy', ella: 'ella', 'nuwara-eliya': 'nanu-oya', haputale: 'haputale',
  anuradhapura: 'anuradhapura', jaffna: 'jaffna', bentota: 'bentota',
};

export const train = (leg: Leg): AffiliateLink | undefined => {
  if (leg.mode !== 'train') return undefined;
  const a = STATION[leg.from];
  const b = STATION[leg.to];
  if (!a || !b) return undefined;
  return {
    kind: 'train',
    partner: '12Go',
    label: 'Train tickets',
    url: withParam(`https://12go.asia/en/travel/${a}/${b}`, 'z', env('PUBLIC_12GO_Z')),
  };
};

export const retreat = (m: Monastery): AffiliateLink | undefined =>
  m.kind === 'lay-retreat'
    ? {
        kind: 'retreat',
        partner: 'BookRetreats',
        label: 'Browse meditation retreats',
        url: withParam('https://bookretreats.com/s/meditation-retreats/sri-lanka', 'ref', env('PUBLIC_BOOKRETREATS_REF')),
      }
    : undefined; // forest hermitages and temples are never commercial

/** All commercial links for a stop, derived from place.affiliates kinds (url in data overrides the template). */
export function placeLinks(p: Place): AffiliateLink[] {
  const out: AffiliateLink[] = [];
  for (const a of p.affiliates) {
    const base = a.kind === 'stay' ? stay(p) : a.kind === 'tour' ? tour(p) : undefined;
    if (!base) continue;
    out.push(a.url ? { ...base, url: a.url, label: a.label || base.label } : base);
  }
  return out;
}

export const DISCLOSURE = 'We may earn a commission if you book through these links, at no extra cost to you.';
