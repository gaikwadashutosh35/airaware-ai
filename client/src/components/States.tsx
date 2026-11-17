import type { ApiError } from '../services/api.ts';

export function Loading({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      <div className="h-6 w-1/2 animate-pulse rounded bg-text-dark/10 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded bg-text-dark/10 motion-reduce:animate-none" />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  switch (error.code) {
    case 'PROVIDER_ERROR':
    case 'NETWORK_ERROR':
      return 'Forecast provider unavailable.';
    case 'RATE_LIMITED':
      return 'Too many requests. Try again in a minute.';
    default:
      return 'Something went wrong loading the forecast.';
  }
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p>{errorMessage(error)}</p>
      {error.code !== 'RATE_LIMITED' && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-md border border-text-dark px-4"
        >
          Try again
        </button>
      )}
    </div>
  );
}
