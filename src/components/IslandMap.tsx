import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre resolves its worker relative to its own module URL, which breaks once bundled;
// ship the worker as a static asset and point MapLibre at it explicitly.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { ClimateZone, Monastery, Place, Score, ZoneId } from '../engine';
import { MONASTERY_COLOR, ROUTE_COLOR, SCORE_COLOR } from './colors';
import StaticMap from './StaticMap';
import { COASTLINE } from '../lib/geo';

type MapLib = typeof import('maplibre-gl');
type MLMap = import('maplibre-gl').Map;
type MLMarker = import('maplibre-gl').Marker;

const STYLE = 'https://tiles.openfreemap.org/styles/positron';

/** Self-contained fallback style (sea + island outline) used if the tile host is unreachable. */
const LOCAL_STYLE = {
  version: 8 as const,
  sources: {
    land: {
      type: 'geojson' as const,
      data: { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[...COASTLINE, COASTLINE[0]]] } },
    },
  },
  layers: [
    { id: 'sea', type: 'background' as const, paint: { 'background-color': '#dfeef0' } },
    { id: 'land', type: 'fill' as const, source: 'land', paint: { 'fill-color': '#f3eee2' } },
    { id: 'coast', type: 'line' as const, source: 'land', paint: { 'line-color': '#b9ad94', 'line-width': 1 } },
  ],
};
const LK_BOUNDS: [[number, number], [number, number]] = [[79.5, 5.85], [82.0, 9.9]];

type Props = {
  zones: ClimateZone[];
  zoneScores: Record<ZoneId, Score>;
  polyline: [number, number][];
  stops: Place[];
  monasteries: Monastery[];
  selectedStop?: string;
  onMarkerClick?: (placeId: string) => void;
  className?: string;
  /** false → static SVG only (e.g. the layout slot that isn't visible) */
  interactive?: boolean;
};

function hatchImage(): ImageData | undefined {
  if (typeof document === 'undefined') return undefined;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = SCORE_COLOR[0];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 8); ctx.lineTo(8, 0);
  ctx.moveTo(-2, 2); ctx.lineTo(2, -2);
  ctx.moveTo(6, 10); ctx.lineTo(10, 6);
  ctx.stroke();
  return ctx.getImageData(0, 0, 8, 8);
}

const zonesGeoJSON = (zones: ClimateZone[], scores: Record<ZoneId, Score>) => ({
  type: 'FeatureCollection' as const,
  features: zones.map((z) => ({
    type: 'Feature' as const,
    properties: { id: z.id, name: z.name, score: scores[z.id] },
    geometry: { type: 'Polygon' as const, coordinates: [[...z.polygon, z.polygon[0]]] },
  })),
});

const lineGeoJSON = (polyline: [number, number][]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates: polyline },
});

export default function IslandMap({ zones, zoneScores, polyline, stops, monasteries, selectedStop, onMarkerClick, className = '', interactive = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<MapLib | null>(null);
  const markers = useRef<MLMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;
  const zonesRef = useRef({ zones, scores: zoneScores, polyline });
  zonesRef.current = { zones, scores: zoneScores, polyline };

  // load MapLibre only once the map is on screen and the browser is idle
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (!interactive || wanted || !el.current) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(() => setWanted(true), { timeout: 2500 });
      else window.setTimeout(() => setWanted(true), 300);
    }, { rootMargin: '200px' });
    io.observe(el.current);
    return () => io.disconnect();
  }, [interactive, wanted]);

  // create the map once
  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    import('maplibre-gl')
      .then((mod) => {
        if (cancelled || !el.current) return;
        const ml = ((mod as unknown as { default?: MapLib }).default ?? mod) as MapLib;
        lib.current = ml;
        ml.setWorkerUrl(workerUrl);
        const m = new ml.Map({
          container: el.current,
          style: STYLE,
          bounds: LK_BOUNDS,
          fitBoundsOptions: { padding: 20 },
          maxBounds: [[77.5, 4.5], [84, 11.2]],
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        let styled = false;
        const fallback = () => {
          if (styled) return;
          styled = true;
          m.setStyle(LOCAL_STYLE);
        };
        // remote style unreachable (offline, blocked) → switch to the local style
        const timer = window.setTimeout(fallback, 8000);
        m.on('error', (e) => {
          if (!m.isStyleLoaded() && !styled && /style|fetch|Failed/i.test(String(e?.error?.message ?? ''))) fallback();
        });
        m.on('style.load', () => {
          window.clearTimeout(timer);
          styled = true;
          if (!m.hasImage('hatch')) {
            const img = hatchImage();
            if (img) m.addImage('hatch', img, { pixelRatio: 2 });
          }
          if (m.getSource('zones')) return;
          m.addSource('zones', { type: 'geojson', data: zonesGeoJSON(zonesRef.current.zones, zonesRef.current.scores) });
          m.addLayer({
            id: 'zones-fill',
            type: 'fill',
            source: 'zones',
            filter: ['>', ['get', 'score'], 0],
            paint: {
              'fill-color': ['match', ['get', 'score'], 3, SCORE_COLOR[3], 2, SCORE_COLOR[2], 1, SCORE_COLOR[1], SCORE_COLOR[0]],
              'fill-opacity': 0.35,
            },
          });
          m.addLayer({ id: 'zones-hatch', type: 'fill', source: 'zones', filter: ['==', ['get', 'score'], 0], paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.8 } });
          m.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': '#ffffff', 'line-width': 1 } });
          m.addSource('route', { type: 'geojson', data: lineGeoJSON(zonesRef.current.polyline) });
          m.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 6 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
          m.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': ROUTE_COLOR, 'line-width': 3.5 }, layout: { 'line-join': 'round', 'line-cap': 'round' } });
          setReady(true);
        });
        map.current = m;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  // update layers + markers when the itinerary changes
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!ready || !m || !ml) return;
    (m.getSource('zones') as import('maplibre-gl').GeoJSONSource).setData(zonesGeoJSON(zones, zoneScores));
    (m.getSource('route') as import('maplibre-gl').GeoJSONSource).setData(lineGeoJSON(polyline));
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];
    monasteries.forEach((mo) => {
      const node = document.createElement('a');
      node.href = `/sacred/${mo.slug}`;
      node.title = mo.name;
      node.setAttribute('aria-label', mo.name);
      node.style.cssText = `display:block;width:14px;height:14px;transform:rotate(45deg);background:${MONASTERY_COLOR};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)`;
      markers.current.push(new ml.Marker({ element: node }).setLngLat([mo.lng, mo.lat]).addTo(m));
    });
    stops.forEach((s, i) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.textContent = String(i + 1);
      node.setAttribute('aria-label', `${i + 1}. ${s.name}`);
      node.title = s.name;
      const on = s.id === selectedStop;
      node.style.cssText = `width:${on ? 30 : 26}px;height:${on ? 30 : 26}px;border-radius:9999px;border:2px solid #fff;background:${on ? '#e3922b' : ROUTE_COLOR};color:#fff;font:700 12px system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer`;
      node.addEventListener('click', (e) => { e.stopPropagation(); clickRef.current?.(s.id); });
      markers.current.push(new ml.Marker({ element: node }).setLngLat([s.lng, s.lat]).addTo(m));
    });
    if (polyline.length > 1) {
      const b = new ml.LngLatBounds(polyline[0], polyline[0]);
      polyline.forEach((p) => b.extend(p));
      monasteries.forEach((mo) => b.extend([mo.lng, mo.lat]));
      m.fitBounds(b, { padding: 40, maxZoom: 9, duration: 600 });
    }
  }, [ready, zones, zoneScores, polyline, stops, monasteries, selectedStop]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-[#eef3f3] ${className}`}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <StaticMap zones={zones} scores={zoneScores} polyline={polyline} stops={stops} monasteries={monasteries} highlight={selectedStop} className="h-full w-auto max-w-full" />
        </div>
      )}
      <div ref={el} className={`absolute inset-0 transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`} aria-label="Interactive route map" />
      {failed && <p className="absolute bottom-2 left-2 text-xs text-muted">Interactive map unavailable; showing a static map.</p>}
    </div>
  );
}
