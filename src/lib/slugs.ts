import { ALL_MONTHS, monthSlug, type Month, type Tag } from '../engine';

export const SITE = 'https://whensrilanka.com';
export const DURATIONS = [5, 7, 10, 14, 18, 21] as const;

/** Interest chips: URL slug → engine tag. */
export const INTERESTS: { slug: string; tag: Tag; label: string }[] = [
  { slug: 'beach', tag: 'beach', label: 'Beach' },
  { slug: 'hills', tag: 'hill', label: 'Hills' },
  { slug: 'wildlife', tag: 'wildlife', label: 'Wildlife' },
  { slug: 'heritage', tag: 'heritage', label: 'Heritage' },
  { slug: 'buddhist', tag: 'buddhist', label: 'Buddhist' },
  { slug: 'surf', tag: 'surf', label: 'Surf' },
  { slug: 'food', tag: 'food', label: 'Food' },
  { slug: 'city', tag: 'city', label: 'City' },
];
export const interestBySlug = (s: string) => INTERESTS.find((i) => i.slug === s);
export const interestByTag = (t: Tag) => INTERESTS.find((i) => i.tag === t)!;

export const MARKETS = ['india', 'uk', 'germany', 'australia', 'france', 'russia'] as const;

export const paths = {
  home: () => '/',
  duration: (days: number) => `/itinerary/${days}-days`,
  durationMonth: (days: number, m: Month) => `/itinerary/${days}-days/${monthSlug(m)}`,
  durationInterest: (days: number, tag: Tag) => `/itinerary/${days}-days/${interestByTag(tag).slug}`,
  when: () => '/when',
  month: (m: Month) => `/when/${monthSlug(m)}`,
  places: () => '/places',
  place: (slug: string) => `/places/${slug}`,
  sacred: () => '/sacred',
  monastery: (slug: string) => `/sacred/${slug}`,
  market: (m: string) => `/from/${m}`,
  guide: (slug: string) => `/guides/${slug}`,
};

export const absolute = (path: string) => SITE + (path === '/' ? '' : path);

export { ALL_MONTHS };
