/** Maps a page path to its generated OG image (see scripts/generate-og.ts). */
export const ogKey = (path: string) => (path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '__'));
export const ogPath = (path: string) => `/og-images/${ogKey(path)}.png`;
