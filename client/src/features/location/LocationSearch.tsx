import { useEffect, useId, useRef, useState, type Ref } from 'react';
import type { KeyboardEvent } from 'react';
import type { LocationResult } from '../../../../shared/contracts.ts';
import { ApiError, searchLocations } from '../../services/api.ts';
import { placeFromResult, type Place } from './place.ts';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

// ARIA 1.2 combobox with a listbox popup (WAI-ARIA APG "list autocomplete").
export function LocationSearch({
  onSelect,
  inputRef,
}: {
  onSelect: (place: Place) => void;
  // Lets the page move focus to the search (the place bar's "Change place").
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState('');
  // The label written into the input on selection must not search again.
  const selectedLabel = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      trimmed.length < MIN_QUERY_LENGTH ||
      trimmed === selectedLabel.current
    ) {
      setResults([]);
      setOpen(false);
      setStatus('');
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchLocations(trimmed, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setOpen(found.length > 0);
          setActive(-1);
          setStatus(
            found.length === 0
              ? 'No places found'
              : `${found.length} place${found.length === 1 ? '' : 's'} found`,
          );
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setResults([]);
          setOpen(false);
          setStatus(
            error instanceof ApiError
              ? error.message
              : 'Search failed. Try again.',
          );
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function select(result: LocationResult) {
    const place = placeFromResult(result);
    selectedLabel.current = place.label;
    setQuery(place.label);
    setOpen(false);
    setActive(-1);
    onSelect(place);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === 'Enter') {
      // Never commit while an IME (e.g. Hindi, Marathi) is composing text.
      if (event.nativeEvent.isComposing) return;
      const result = open ? results[active] : undefined;
      if (result) {
        event.preventDefault();
        select(result);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <search className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-medium">
        Search for a city or area in India
      </label>
      <p id={hintId} className="text-sm">
        Type at least 2 letters, then choose a place from the list.
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-describedby={hintId}
          aria-activedescendant={
            open && active >= 0 ? `${listId}-${active}` : undefined
          }
          value={query}
          onChange={(event) => {
            selectedLabel.current = null;
            setQuery(event.target.value);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          className="w-full min-h-12 rounded-md border border-text-dark bg-surface-light px-3 text-text-dark"
        />
        <ul
          id={listId}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- WAI-ARIA APG combobox popup: <select>/<datalist> cannot show async results with announcements.
          role="listbox"
          aria-label="Matching places"
          hidden={!open}
          className="absolute inset-x-0 z-10 mt-1 rounded-md border border-text-dark bg-surface-light text-text-dark"
        >
          {open &&
            results.map((result, index) => (
              // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard is handled on the combobox input via aria-activedescendant (APG); options never take focus.
              <li
                key={result.id}
                id={`${listId}-${index}`}
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/prefer-tag-over-role -- APG listbox option inside the combobox popup.
                role="option"
                aria-selected={index === active}
                // Keep focus in the input so the list does not close first.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(result)}
                className="min-h-11 cursor-pointer px-3 py-2 aria-selected:bg-text-dark aria-selected:text-surface-light"
              >
                {placeFromResult(result).label}
              </li>
            ))}
        </ul>
      </div>
      <output className="block min-h-6 text-sm">{status}</output>
    </search>
  );
}
