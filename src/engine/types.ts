import type { z } from 'zod';
import type {
  PlaceSchema, ClimateZoneSchema, LegSchema, MonasterySchema, ZONE_IDS, TAGS,
} from '../schemas';

export type ZoneId = (typeof ZONE_IDS)[number];
export type Tag = (typeof TAGS)[number];
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Score = 0 | 1 | 2 | 3;
export type Pace = 'slow' | 'normal' | 'fast';

export type Place = z.infer<typeof PlaceSchema>;
export type ClimateZone = z.infer<typeof ClimateZoneSchema>;
export type Leg = z.infer<typeof LegSchema>;
export type Monastery = z.infer<typeof MonasterySchema>;

export type Dataset = {
  places: Place[];
  climate: ClimateZone[];
  legs: Leg[];
  monasteries: Monastery[];
};

export type RouteInput = {
  month: Month;
  days: number; // 4–21
  interests: Tag[]; // empty = balanced
  pace?: Pace;
  entry?: 'CMB';
  sacred?: boolean;
  /** place ids forced into the route (from the "swap" UI) */
  include?: string[];
  /** place ids removed from the route (from the "swap" UI) */
  exclude?: string[];
};

export type Day = {
  n: number;
  stop: Place;
  nightsHere: number;
  legIn?: Leg;
  tips: string[];
  monastery?: Monastery;
};

export type Itinerary = {
  input: RouteInput;
  days: Day[];
  stops: Place[];
  polyline: [number, number][];
  zoneScores: Record<ZoneId, Score>;
  bestZone: ZoneId;
  warnings: string[];
  alternates: Place[];
  totalMinutes: number;
};
