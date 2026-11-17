import type {
  ApiErrorBody,
  ErrorCode,
  ForecastSeries,
  LocationResult,
  SourceInfo,
} from '../../../shared/contracts.ts';

export type ClientErrorCode =
  ErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;

  constructor(status: number, code: ClientErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ApiErrorBody).error?.code === 'string'
  );
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { signal });
  } catch (error) {
    // An abort is the caller's decision, not a failure: pass it through.
    if (signal?.aborted) throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach AirAware. Check your connection.',
    );
  }
  const body: unknown = await res.json().catch(() => undefined);
  if (res.ok && typeof body === 'object' && body !== null && 'data' in body) {
    return (body as { data: T }).data;
  }
  if (!res.ok && isErrorBody(body)) {
    throw new ApiError(res.status, body.error.code, body.error.message);
  }
  throw new ApiError(
    res.status,
    'UNEXPECTED_RESPONSE',
    'Unexpected response from the server.',
  );
}

// The API rejects more than 2 decimals: a precise location must never leave
// the browser.
export function getForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ForecastSeries> {
  const query = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
  });
  return request(`/api/v1/air-quality/forecast?${query}`, signal);
}

export function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<LocationResult[]> {
  return request(
    `/api/v1/locations/search?${new URLSearchParams({ q: query })}`,
    signal,
  );
}

export function getSources(signal?: AbortSignal): Promise<SourceInfo[]> {
  return request('/api/v1/air-quality/sources', signal);
}
