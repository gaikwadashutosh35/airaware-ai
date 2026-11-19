import type { ApiError } from '../services/api.ts';

const PULSE =
  'animate-pulse rounded bg-text-dark/10 motion-reduce:animate-none';

// A placeholder of grey lines; with `band`, readout-shaped (the scene band
// first). Screen readers hear only the label.
export function Loading({
  label,
  band = false,
}: {
  label: string;
  band?: boolean;
}) {
  return (
    <div
      aria-busy="true"
      className="overflow-hidden rounded-lg border border-rule"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col">
        {band && (
          <div
            data-part="skeleton-band"
            className={`h-32 rounded-none sm:h-44 ${PULSE}`}
          />
        )}
        <div className="flex flex-col gap-3 p-5 sm:p-8">
          <div className={`h-6 w-1/3 ${PULSE}`} />
          <div className={`h-14 w-1/2 ${PULSE}`} />
          <div className={`h-4 w-3/4 ${PULSE}`} />
        </div>
      </div>
    </div>
  );
}

function errorMessage(error: ApiError, fallback: string): string {
  switch (error.code) {
    case 'PROVIDER_ERROR':
      return 'Forecast provider unavailable.';
    case 'NETWORK_ERROR':
      return 'Could not reach AirAware. Check your connection.';
    case 'RATE_LIMITED':
      return 'Too many requests. Try again in a minute.';
    default:
      return fallback;
  }
}

// An error in plain words with a retry. Never a status code, host or id.
export function ErrorState({
  error,
  onRetry,
  fallback = 'Something went wrong loading the forecast.',
  title,
}: {
  error: ApiError;
  onRetry: () => void;
  // The message for any other error, in the caller's own words.
  fallback?: string;
  // Optional card heading, e.g. "We couldn't load the forecast".
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-rule p-5 sm:p-6"
    >
      {title && <h3 className="text-xl font-semibold">{title}</h3>}
      <p>{errorMessage(error, fallback)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-md border border-text-dark px-4"
      >
        Try again
      </button>
    </div>
  );
}
