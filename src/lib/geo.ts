// Rough coastline of Sri Lanka ([lng, lat]), used to clip the zone shading on the
// static SVG map and the OG images. Accurate to a few km, enough at thumbnail scale.
export const COASTLINE: [number, number][] = [
  [79.87, 9.75], [80.05, 9.81], [80.24, 9.83], [80.4, 9.66], [80.6, 9.4], [80.8, 9.22], [80.93, 8.98],
  [81.15, 8.8], [81.24, 8.6], [81.3, 8.45], [81.38, 8.25], [81.47, 8.05], [81.57, 7.92], [81.7, 7.75],
  [81.8, 7.5], [81.85, 7.25], [81.86, 6.95], [81.82, 6.7], [81.68, 6.48], [81.45, 6.3], [81.2, 6.14],
  [80.95, 6.05], [80.75, 6.0], [80.59, 5.92], [80.4, 5.95], [80.22, 6.02], [80.1, 6.15], [80.0, 6.38],
  [79.92, 6.6], [79.86, 6.85], [79.84, 7.1], [79.82, 7.35], [79.8, 7.6], [79.78, 7.85], [79.72, 8.15],
  [79.8, 8.35], [79.88, 8.6], [79.92, 8.85], [80.0, 9.05], [80.1, 9.3], [80.05, 9.45], [79.95, 9.6],
];

export const BOUNDS = { minLng: 79.55, maxLng: 82.0, minLat: 5.85, maxLat: 9.9 };

/** Equirectangular projection into a box of the given width. */
export function projector(width: number, pad = 8) {
  const w = BOUNDS.maxLng - BOUNDS.minLng;
  const h = BOUNDS.maxLat - BOUNDS.minLat;
  const scale = (width - pad * 2) / w;
  const height = h * scale + pad * 2;
  const project = ([lng, lat]: [number, number]): [number, number] => [
    pad + (lng - BOUNDS.minLng) * scale,
    pad + (BOUNDS.maxLat - lat) * scale,
  ];
  return { project, height, scale };
}

export const pathD = (pts: [number, number][], project: (p: [number, number]) => [number, number], close = true) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${project(p).map((n) => n.toFixed(1)).join(',')}`).join('') + (close ? 'Z' : '');
