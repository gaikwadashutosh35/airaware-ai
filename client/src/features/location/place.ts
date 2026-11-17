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

// About 1 km: enough for a ~45 km model grid, never a precise location.
export function placeFromPosition(latitude: number, longitude: number): Place {
  return {
    label: 'Near you (approximate)',
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}
