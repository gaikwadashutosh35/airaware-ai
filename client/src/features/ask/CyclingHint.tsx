import { useEffect, useState } from 'react';
import { STARTERS } from './ask.ts';

const TYPE_MS = 35;
const HOLD_MS = 1600;
const FADE_MS = 300;

const REDUCED = '(prefers-reduced-motion: reduce)';
const reducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(REDUCED).matches;

// An animated hint over an empty question field: the approved starters typed
// in turn. Decoration only: hidden from assistive tech, the field keeps its
// label as its name. The field's box must be `relative`. `still` (once a
// question has been asked) or reduced motion shows the first starter, still.
// It also pauses while the tab is hidden: nonessential animation (WCAG 2.2.2).
export function CyclingHint({
  show,
  still = false,
}: {
  show: boolean;
  still?: boolean;
}) {
  const [reduced, setReduced] = useState(reducedMotion);
  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof window.matchMedia !== 'function')
      return () =>
        document.removeEventListener('visibilitychange', onVisibility);
    const query = window.matchMedia(REDUCED);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      query.removeEventListener('change', onChange);
    };
  }, []);
  const stayStill = still || reduced;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [fading, setFading] = useState(false);
  const [wasShown, setWasShown] = useState(show);
  // Hidden and back again: start over from the next starter.
  if (wasShown !== show) {
    setWasShown(show);
    if (!show) {
      setIndex((i) => (i + 1) % STARTERS.length);
      setTyped(0);
      setFading(false);
    }
  }
  const text = STARTERS[index]!.question;

  useEffect(() => {
    if (!show || stayStill || tabHidden) return;
    const timer = setTimeout(
      () => {
        if (fading) {
          setFading(false);
          setTyped(0);
          setIndex((i) => (i + 1) % STARTERS.length);
        } else if (typed < text.length) setTyped(typed + 1);
        else setFading(true);
      },
      fading ? FADE_MS : typed < text.length ? TYPE_MS : HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [show, stayStill, tabHidden, fading, typed, text]);

  if (!show) return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-3 top-3 truncate text-text-dark-muted transition-opacity duration-300 ${fading ? 'opacity-0' : ''}`}
    >
      {stayStill ? STARTERS[0]!.question : text.slice(0, typed)}
    </span>
  );
}
