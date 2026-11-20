import { useSyncExternalStore } from 'react';

// In-app navigation without a router: the address bar is the state.
const NAVIGATED = 'airaware:navigate';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATED, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATED, onChange);
  };
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

// Keeps the query, so a searched place travels between pages.
// `replace` swaps the current entry, so Back skips a redirect.
export function navigate(to: string, { replace = false } = {}): void {
  const url = to + window.location.search;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  // A new page starts at its top; Back and Forward keep the browser's scroll.
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event(NAVIGATED));
}

const PAGES = ['welcome', 'ask', 'home', 'habits', 'profile'] as const;
export type AppPage = 'today' | (typeof PAGES)[number];

export function appPage(path: string): AppPage {
  const name = path.replace(/^\/app\/?/, '').replace(/\/$/, '');
  return PAGES.find((page) => page === name) ?? 'today';
}
