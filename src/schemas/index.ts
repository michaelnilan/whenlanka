import { z } from 'zod';

export const ZONE_IDS = ['southwest', 'hill', 'cultural', 'east', 'north', 'northwest'] as const;
export const TAGS = ['beach', 'hill', 'wildlife', 'heritage', 'buddhist', 'surf', 'city', 'food'] as const;

export const ZoneIdSchema = z.enum(ZONE_IDS);
export const TagSchema = z.enum(TAGS);

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase-hyphenated');
const lat = z.number().min(5.8).max(9.9);
const lng = z.number().min(79.4).max(82.0);

export const AffiliateSchema = z.object({
  kind: z.enum(['stay', 'tour', 'train', 'driver']),
  url: z.string(),
  label: z.string(),
});

export const PlaceSchema = z
  .object({
    id: slug,
    name: z.string().min(1),
    slug,
    lat,
    lng,
    zone: ZoneIdSchema,
    tags: z.array(TagSchema).min(1),
    minNights: z.number().int().min(0),
    maxNights: z.number().int().min(0),
    weight: z.number().min(0).max(1),
    gateway: z.boolean().optional(),
    blurb: z.string().min(10),
    highlights: z.array(z.string()).min(3).max(5),
    affiliates: z.array(AffiliateSchema),
    image: z.string(),
  })
  .refine((p) => p.maxNights >= p.minNights, { message: 'maxNights < minNights' });

const MonthEntry = z.object({
  score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  rainMm: z.number().min(0),
  note: z.string().optional(),
});

export const ClimateZoneSchema = z.object({
  id: ZoneIdSchema,
  name: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
  months: z.object(
    Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), MonthEntry])) as Record<string, typeof MonthEntry>,
  ),
});

export const LegSchema = z.object({
  from: z.string(),
  to: z.string(),
  minutes: z.number().int().positive(),
  mode: z.enum(['car', 'train', 'bus', 'car+boat']),
  scenic: z.boolean().optional(),
  affiliate: z.object({ kind: z.literal('train'), url: z.string() }).optional(),
});

export const MonasterySchema = z.object({
  id: slug,
  name: z.string(),
  slug,
  lat,
  lng,
  nearPlace: z.string(),
  kind: z.enum(['ancient', 'forest-hermitage', 'lay-retreat', 'temple']),
  acceptsForeigners: z.boolean(),
  stayPossible: z.boolean(),
  tradition: z.string().optional(),
  etiquette: z.array(z.string()).min(1),
  contact: z.string().optional(),
  blurb: z.string(),
  source: z.string().url(),
});

export const PlacesFile = z.array(PlaceSchema);
export const ClimateFile = z.array(ClimateZoneSchema).length(6);
export const LegsFile = z.array(LegSchema);
export const MonasteriesFile = z.array(MonasterySchema);
