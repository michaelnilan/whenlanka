// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://whensrilanka.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
