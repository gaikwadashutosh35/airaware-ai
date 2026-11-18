import type { LocationResult } from '../../../../shared/contracts.ts';

export interface Place {
  label: string;
  latitude: number;
  longitude: number;
}

export function placeFromResult(result: LocationResult): Place {
  return {
    label: result.admin1 ? `${result.name}, ${result.admin1}` : result.name,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

const COORDINATE = /^-?\d{1,3}(\.\d{1,2})?$/;
const MAX_LABEL_LENGTH = 120;

// A searched (public) place in the address, so a link can be shared or
// reloaded. Device locations never go here (the dashboard clears it).
export function placeToSearch(place: Place): string {
  return new URLSearchParams({
    place: place.label,
    lat: place.latitude.toFixed(2),
    lon: place.longitude.toFixed(2),
  }).toString();
}

// The address is user input: anything unusable means "no place".
export function placeFromSearch(search: string): Place | null {
  const params = new URLSearchParams(search);
  const label = params.get('place')?.trim() ?? '';
  const lat = params.get('lat') ?? '';
  const lon = params.get('lon') ?? '';
  if (!label || label.length > MAX_LABEL_LENGTH) return null;
  if (!COORDINATE.test(lat) || !COORDINATE.test(lon)) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { label, latitude, longitude };
}

// About 1 km: enough for a ~45 km model grid, never a precise location.
export function placeFromPosition(latitude: number, longitude: number): Place {
  return {
    label: 'Near you (approximate)',
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}
