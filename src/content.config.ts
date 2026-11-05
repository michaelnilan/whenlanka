import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const markets = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/markets' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    country: z.string(),
    flight: z.string(),
    durations: z.array(z.number()),
    /** holiday windows → months the planner should show */
    holidays: z.array(z.object({ name: z.string(), month: z.number().min(1).max(12), days: z.number() })),
  }),
});

export const collections = { markets };
