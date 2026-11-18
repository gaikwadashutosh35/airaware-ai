import { describe, expect, it } from 'vitest';
import {
  placeFromPosition,
  placeFromResult,
  placeFromSearch,
  placeToSearch,
} from './place.ts';

describe('place in the address', () => {
  const pune = {
    label: 'Pune, Maharashtra',
    latitude: 18.51957,
    longitude: 73.85535,
  };

  it('writes the label and 2-decimal coordinates', () => {
    expect(placeToSearch(pune)).toBe(
      'place=Pune%2C+Maharashtra&lat=18.52&lon=73.86',
    );
  });

  it('reads a place back from the address', () => {
    expect(
      placeFromSearch('?place=Pune%2C+Maharashtra&lat=18.52&lon=73.86'),
    ).toEqual({
      label: 'Pune, Maharashtra',
      latitude: 18.52,
      longitude: 73.86,
    });
  });

  it.each([
    '',
    '?lat=18.52&lon=73.86',
    '?place=&lat=18.52&lon=73.86',
    '?place=Pune&lat=18.519&lon=73.86',
    '?place=Pune&lat=abc&lon=73.86',
    '?place=Pune&lat=95&lon=73.86',
    '?place=Pune&lat=18.52',
    `?place=${'a'.repeat(121)}&lat=18.52&lon=73.86`,
  ])('ignores an unusable address %s', (search) => {
    expect(placeFromSearch(search)).toBeNull();
  });
});

describe('place', () => {
  it('rounds a device position to about 1 km', () => {
    expect(placeFromPosition(18.519571, 73.855347)).toEqual({
      label: 'Near you (approximate)',
      latitude: 18.52,
      longitude: 73.86,
    });
  });

  it('labels a search result with its state when known', () => {
    const result = {
      id: 1259229,
      name: 'Pune',
      admin1: 'Maharashtra',
      country: 'India',
      latitude: 18.51957,
      longitude: 73.85535,
      timezone: 'Asia/Kolkata',
    };

    expect(placeFromResult(result)).toEqual({
      label: 'Pune, Maharashtra',
      latitude: 18.51957,
      longitude: 73.85535,
    });
    expect(placeFromResult({ ...result, admin1: undefined }).label).toBe(
      'Pune',
    );
  });
});
