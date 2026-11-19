import { useEffect, useState } from 'react';

// True when `iso` is more than `minutes` before `now`. An unreadable time
// counts as old: data with an unknown age is never shown as current.
export function isOlderThan(iso: string, now: Date, minutes: number): boolean {
  const t = Date.parse(iso);
  return Number.isNaN(t) || now.getTime() - t > minutes * 60_000;
}

// A clock for stale checks: ticks every minute, and at once when the tab is
// shown again, so a tab left hidden for hours never shows old data as
// current. Checking only at load would never fire, because the server
// caches forecasts and plans for 10 minutes.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const timer = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}
