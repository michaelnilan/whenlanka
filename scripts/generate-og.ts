/**
 * Generates a 1200×630 Open Graph image for every page into public/og-images/.
 * Island map (zones shaded for the page's month + route line) plus title text.
 * Skips work when data + this script are unchanged (hash in public/og-images/.hash).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import StaticMap from '../src/components/StaticMap';
import { ALL_MONTHS, buildRoute, monthName, scoreZones, type Dataset, type Itinerary, type Month, type Tag } from '../src/engine';
import { ClimateFile, LegsFile, MonasteriesFile, PlacesFile } from '../src/schemas';
import { DURATIONS, INTERESTS, MARKETS, paths } from '../src/lib/slugs';
import { ogKey } from '../src/lib/og';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p: string) => readFileSync(root + p, 'utf8');
const data: Dataset = {
  places: PlacesFile.parse(JSON.parse(read('src/data/places.json'))),
  climate: ClimateFile.parse(JSON.parse(read('src/data/climate.json'))),
  legs: LegsFile.parse(JSON.parse(read('src/data/legs.json'))),
  monasteries: MonasteriesFile.parse(JSON.parse(read('src/data/monasteries.json'))),
};
const outDir = root + 'public/og-images/';
mkdirSync(outDir, { recursive: true });

const hash = createHash('sha1')
  .update(['places', 'climate', 'legs', 'monasteries'].map((f) => read(`src/data/${f}.json`)).join())
  .update(read('scripts/generate-og.ts'))
  .update(read('src/components/StaticMap.tsx'))
  .digest('hex');
if (existsSync(outDir + '.hash') && readFileSync(outDir + '.hash', 'utf8') === hash && readdirSync(outDir).length > 150 && !process.argv.includes('--force')) {
  console.log('✓ OG images up to date');
  process.exit(0);
}

const font = (p: string) => readFileSync(root + 'node_modules/@fontsource/' + p);
const fonts = [
  { name: 'Inter', data: font('inter/files/inter-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: font('inter/files/inter-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Fraunces', data: font('fraunces/files/fraunces-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
];

type Job = { path: string; title: string; sub?: string; month: Month; it?: Itinerary; stops?: { id: string; name: string; lng: number; lat: number }[] };
const jobs: Job[] = [];
const best = 2 as Month;
const route = (month: Month, days: number, interests: Tag[] = []) => buildRoute({ month, days, interests }, data);
const line = (it: Itinerary) => it.stops.map((s) => s.name).join(' – '); // the font subset has no arrow glyph

jobs.push({ path: '/', title: 'Where in Sri Lanka should you go in your month?', sub: 'Day-by-day routes around the two monsoons', month: 1, it: route(1, 14) });
for (const d of DURATIONS) {
  jobs.push({ path: paths.duration(d), title: `${d}-day Sri Lanka itinerary`, month: best, it: route(best, d) });
  for (const m of ALL_MONTHS) jobs.push({ path: paths.durationMonth(d, m), title: `${d} days in Sri Lanka · ${monthName(m)}`, month: m, it: route(m, d) });
  for (const i of INTERESTS) jobs.push({ path: paths.durationInterest(d, i.tag), title: `${d}-day Sri Lanka ${i.label.toLowerCase()} itinerary`, month: best, it: route(best, d, [i.tag]) });
}
jobs.push({ path: '/when', title: 'Best time to visit Sri Lanka', sub: 'Two monsoons, opposite coasts: month by month', month: 1 });
for (const m of ALL_MONTHS) jobs.push({ path: paths.month(m), title: `Sri Lanka in ${monthName(m)}`, sub: 'Where is dry, where to skip, and a route', month: m, it: route(m, 14) });
jobs.push({ path: '/places', title: 'Places to visit in Sri Lanka', sub: `${data.places.length} stops and when to go`, month: best });
for (const p of data.places) jobs.push({ path: paths.place(p.slug), title: p.name, sub: 'Things to do & best time to visit', month: best, stops: [p] });
jobs.push({ path: '/sacred', title: 'Sacred & Silent', sub: 'Monasteries & meditation in Sri Lanka', month: best });
for (const m of data.monasteries) jobs.push({ path: paths.monastery(m.slug), title: m.name, sub: 'Sacred & Silent', month: best, stops: [{ ...m }] });
for (const m of MARKETS) jobs.push({ path: paths.market(m), title: `Sri Lanka from ${m === 'uk' ? 'the UK' : m[0].toUpperCase() + m.slice(1)}`, sub: 'Routes for your holiday dates', month: best });
jobs.push({ path: '/guides/kandy-ella-train', title: 'The Kandy to Ella train', sub: 'Tickets, classes & tips', month: 2 });
jobs.push({ path: '/guides/practical', title: 'Visa, money & safety', sub: 'Sri Lanka practicalities', month: 2 });
jobs.push({ path: '/about', title: 'About whensrilanka', month: 2 });
jobs.push({ path: '/privacy', title: 'Privacy', month: 2 });

const svgUri = (job: Job) => {
  const svg = renderToStaticMarkup(
    h(StaticMap, {
      zones: data.climate,
      scores: scoreZones(job.month, data.climate).scores,
      polyline: job.it?.polyline,
      stops: job.it?.stops ?? job.stops ?? [],
      width: 330,
      numbered: false,
    }),
  ).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const t0 = Date.now();
for (const job of jobs) {
  const sub = job.sub ?? (job.it ? line(job.it) : '');
  const node = h(
    'div',
    { style: { width: 1200, height: 630, display: 'flex', background: '#faf6ee', fontFamily: 'Inter', color: '#1f2a2e' } },
    h(
      'div',
      { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 40px 56px 72px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', fontSize: 30, fontWeight: 700, color: '#0f6e6e' } }, 'whensrilanka'),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { fontFamily: 'Fraunces', fontSize: job.title.length > 40 ? 58 : 72, lineHeight: 1.08, fontWeight: 600 } }, job.title),
        sub ? h('div', { style: { marginTop: 24, fontSize: 28, lineHeight: 1.35, color: '#5b6b70' } }, sub.length > 120 ? sub.slice(0, 117) + '…' : sub) : null,
      ),
      h('div', { style: { display: 'flex', fontSize: 22, color: '#5b6b70' } }, job.it || job.path.startsWith('/when') ? `Weather shading for ${monthName(job.month)}` : 'Sri Lanka trip planner'),
    ),
    h('div', { style: { width: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6f0f0' } }, h('img', { src: svgUri(job), width: 330, height: 545 })),
  );
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(`${outDir}${ogKey(job.path)}.png`, png);
}
writeFileSync(outDir + '.hash', hash);
console.log(`✓ ${jobs.length} OG images in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
