// Build-time data access. The JSON files are validated by scripts/validate-data.ts
// before every build; here we parse once more so types are exact.
import placesRaw from '../data/places.json';
import climateRaw from '../data/climate.json';
import legsRaw from '../data/legs.json';
import monasteriesRaw from '../data/monasteries.json';
import { ClimateFile, LegsFile, MonasteriesFile, PlacesFile } from '../schemas';
import type { Dataset } from '../engine';

export const places = PlacesFile.parse(placesRaw);
export const climate = ClimateFile.parse(climateRaw);
export const legs = LegsFile.parse(legsRaw);
export const monasteries = MonasteriesFile.parse(monasteriesRaw);

export const dataset: Dataset = { places, climate, legs, monasteries };

export const placeById = new Map(places.map((p) => [p.id, p]));
export const zoneById = new Map(climate.map((z) => [z.id, z]));
