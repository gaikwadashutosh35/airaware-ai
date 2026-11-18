import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only a publishable key belongs in the browser; anything else means saving
// is off. The session lives in this browser's localStorage.
const client =
  url && key?.startsWith('sb_publishable_')
    ? createClient(url, key, { auth: { detectSessionInUrl: false } })
    : null;

export const savingAvailable = client !== null;

// The existing session's token, or null. Never creates an account.
export async function currentToken(): Promise<string | null> {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

// Only called from a save action: the first save creates an anonymous
// account for this browser (no email, name or password).
export async function tokenForSave(): Promise<string> {
  if (!client) throw new Error('Saving is not set up.');
  const existing = await currentToken();
  if (existing) return existing;
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) throw error ?? new Error('Sign-in failed.');
  return data.session.access_token;
}

// After "delete everything": forget the session in this browser only.
export async function forgetSession(): Promise<void> {
  await client?.auth.signOut({ scope: 'local' });
}
