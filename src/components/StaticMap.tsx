// Pure SVG island map: shaded zones, route line and numbered stops. Server-rendered,
// so crawlers and no-JS visitors see the route; MapLibre replaces it when it loads.
import { COASTLINE, pathD, projector } from '../lib/geo';
import { SCORE_COLOR, ROUTE_COLOR, MONASTERY_COLOR } from './colors';
import type { ClimateZone, Score, ZoneId } from '../engine';

type Props = {
  zones: ClimateZone[];
  scores: Record<ZoneId, Score>;
  polyline?: [number, number][];
  stops?: { id: string; name: string; lng: number; lat: number }[];
  monasteries?: { id: string; name: string; lng: number; lat: number }[];
  highlight?: string;
  width?: number;
  className?: string;
  title?: string;
  /** draw stop numbers (off for OG images, where no font is available to the rasteriser) */
  numbered?: boolean;
};

export default function StaticMap({ zones, scores, polyline = [], stops = [], monasteries = [], highlight, width = 320, className, title, numbered = true }: Props) {
  const { project, height } = projector(width);
  const clipId = 'coast-clip';
  return (
    <svg viewBox={`0 0 ${width} ${height.toFixed(0)}`} className={className} role="img" aria-label={title ?? 'Map of Sri Lanka'}>
      <title>{title ?? 'Map of Sri Lanka'}</title>
      <defs>
        <clipPath id={clipId}>
          <path d={pathD(COASTLINE, project)} />
        </clipPath>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={SCORE_COLOR[0]} opacity="0.35" />
          <line x1="0" y1="0" x2="0" y2="6" stroke={SCORE_COLOR[0]} strokeWidth="2" />
        </pattern>
      </defs>
      <path d={pathD(COASTLINE, project)} fill="#f3eee2" stroke="#b9ad94" strokeWidth="1" />
      <g clipPath={`url(#${clipId})`}>
        {zones.map((z) => (
          <path
            key={z.id}
            d={pathD(z.polygon as [number, number][], project)}
            fill={scores[z.id] === 0 ? 'url(#hatch)' : SCORE_COLOR[scores[z.id]]}
            fillOpacity={scores[z.id] === 0 ? 1 : 0.55}
            stroke="#fff"
            strokeWidth="0.8"
          />
        ))}
      </g>
      <path d={pathD(COASTLINE, project)} fill="none" stroke="#8c816b" strokeWidth="1" />
      {polyline.length > 1 && (
        <path d={pathD(polyline, project, false)} fill="none" stroke={ROUTE_COLOR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {monasteries.map((m) => {
        const [x, y] = project([m.lng, m.lat]);
        return <rect key={m.id} x={x - 3.5} y={y - 3.5} width="7" height="7" transform={`rotate(45 ${x} ${y})`} fill={MONASTERY_COLOR} stroke="#fff" strokeWidth="1" />;
      })}
      {stops.map((s, i) => {
        const [x, y] = project([s.lng, s.lat]);
        const on = s.id === highlight;
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r={on ? 10 : 8} fill={on ? '#e3922b' : ROUTE_COLOR} stroke="#fff" strokeWidth="1.5" />
            {numbered && <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
              {i + 1}
            </text>}
          </g>
        );
      })}
    </svg>
  );
}
