import type {
  ApiErrorBody,
  DailyPlan,
  ErrorCode,
  ForecastData,
  GuideSet,
  GuideTopic,
  HouseholdContext,
  LocationResult,
  SavedPlan,
  SavedPlanSummary,
  PreferencesUpdate,
  SavedPreferences,
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

interface RequestOptions {
  method?: string;
  // Sent as JSON.
  body?: unknown;
  // Supabase access token for saved-data routes.
  token?: string;
}

async function request<T>(
  path: string,
  signal?: AbortSignal,
  { method, body, token }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(path, {
      signal,
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // An abort is the caller's decision, not a failure: pass it through.
    if (signal?.aborted) throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach AirAware. Check your connection.',
    );
  }
  // Deletes answer 204 with no body.
  if (res.status === 204) return undefined as T;
  const reply: unknown = await res.json().catch(() => undefined);
  if (
    res.ok &&
    typeof reply === 'object' &&
    reply !== null &&
    'data' in reply
  ) {
    return (reply as { data: T }).data;
  }
  if (!res.ok && isErrorBody(reply)) {
    throw new ApiError(res.status, reply.error.code, reply.error.message);
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
): Promise<ForecastData> {
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

// The guide library for My Home or Better Habits (Phase 8).
export function getGuides(
  topic: GuideTopic,
  signal?: AbortSignal,
): Promise<GuideSet> {
  return request(`/api/v1/recommendations/guides?topic=${topic}`, signal);
}

export function getSources(signal?: AbortSignal): Promise<SourceInfo[]> {
  return request('/api/v1/air-quality/sources', signal);
}

// Saved data (Phase 6). Each call needs the Supabase access token from
// lib/supabase.ts; the server derives the user from it.
export function getPreferences(
  token: string,
  signal?: AbortSignal,
): Promise<SavedPreferences | null> {
  return request('/api/v1/profile/preferences', signal, { token });
}

// Only the fields sent change; `place: null` forgets the remembered place.
export function savePreferences(
  token: string,
  update: PreferencesUpdate,
): Promise<SavedPreferences> {
  return request('/api/v1/profile/preferences', undefined, {
    method: 'PUT',
    body: update,
    token,
  });
}

export function listPlans(token: string): Promise<SavedPlanSummary[]> {
  return request('/api/v1/plans', undefined, { token });
}

export function getPlan(token: string, id: string): Promise<SavedPlan> {
  return request(`/api/v1/plans/${encodeURIComponent(id)}`, undefined, {
    token,
  });
}

// A daily-plan request: coordinates with at most 2 decimals.
export interface PlanBody {
  place: { label: string; latitude: number; longitude: number };
  householdContext?: HouseholdContext;
}

// Builds a plan without saving it: no token, so no account is involved.
export function buildDailyPlan(
  body: PlanBody,
  signal?: AbortSignal,
): Promise<DailyPlan> {
  return request('/api/v1/recommendations/daily-plan', signal, {
    method: 'POST',
    body,
  });
}

// The server builds and saves the plan for this request.
export function savePlan(token: string, body: PlanBody): Promise<SavedPlan> {
  return request('/api/v1/plans', undefined, { method: 'POST', body, token });
}

export function deletePlan(token: string, id: string): Promise<void> {
  return request(`/api/v1/plans/${encodeURIComponent(id)}`, undefined, {
    method: 'DELETE',
    token,
  });
}

export function deleteAccount(token: string): Promise<void> {
  return request('/api/v1/account', undefined, { method: 'DELETE', token });
}
