import type { Libraries } from '@react-google-maps/api';

export const GOOGLE_MAPS_API_KEY = (
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  ''
).trim();

export const GOOGLE_MAPS_LOADER_ID = 'google-map-script';

export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];
