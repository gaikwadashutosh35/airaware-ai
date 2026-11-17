import { useId, useState } from 'react';
import { placeFromPosition, type Place } from './place.ts';

const DENIED = 'Location permission was denied. Search for a place instead.';
const NOT_FOUND =
  'Your location could not be found. Search for a place instead.';

// Geolocation is requested only from this explicit click (PRD US-02).
export function UseMyLocation({
  onLocate,
}: {
  onLocate: (place: Place) => void;
}) {
  const hintId = useId();
  const [locating, setLocating] = useState(false);
  const [status, setStatus] = useState('');

  if (!('geolocation' in navigator)) return null;

  function locate() {
    if (locating) return;
    setLocating(true);
    setStatus('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onLocate(
          placeFromPosition(
            position.coords.latitude,
            position.coords.longitude,
          ),
        );
      },
      (error) => {
        setLocating(false);
        // 1 = PERMISSION_DENIED; 2 = unavailable; 3 = timeout.
        setStatus(error.code === 1 ? DENIED : NOT_FOUND);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={locate}
        aria-describedby={hintId}
        className="min-h-11 self-start rounded-md border border-text-dark px-4"
      >
        {locating ? 'Finding your location…' : 'Use my location'}
      </button>
      <p id={hintId} className="text-sm">
        Your browser asks first. We use an approximate location (about 1 km) and
        never store it.
      </p>
      <output className="block min-h-6 text-sm">{status}</output>
    </div>
  );
}
