import type { Itinerary, Monastery, Place } from '../engine';
import { absolute } from './slugs';

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absolute(it.path) })),
});

export const faqPage = (qas: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: qas.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

const destination = (p: Place, path?: string) => ({
  '@type': 'TouristDestination',
  name: `${p.name}, Sri Lanka`,
  description: p.blurb,
  geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
  ...(path ? { url: absolute(path) } : {}),
});

export const touristTrip = (it: Itinerary, name: string, description: string, path: string, placePath: (s: string) => string) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  name,
  description,
  url: absolute(path),
  touristType: it.input.interests.length ? it.input.interests : undefined,
  itinerary: {
    '@type': 'ItemList',
    numberOfItems: it.stops.length,
    itemListElement: it.stops.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: destination(p, placePath(p.slug)) })),
  },
});

export const touristAttraction = (p: Place | Monastery, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: p.name,
  description: p.blurb,
  url: absolute(path),
  geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
});
