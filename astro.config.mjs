// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

/** lastmod for the sitemap = date of the last commit touching the data files. */
function dataLastmod() {
  try {
    const d = execSync('git log -1 --format=%cI -- src/data', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return d ? new Date(d) : new Date();
  } catch {
    return new Date();
  }
}
const lastmod = dataLastmod();

export default defineConfig({
  site: 'https://whensrilanka.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize: (item) => ({ ...item, lastmod: lastmod.toISOString() }),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 1200 }, // maplibre-gl is ~1 MB and lazy-loaded
  },
});
