import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchFixture } from '../../test/fixtures.ts';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { LocationSearch } from './LocationSearch.tsx';

function queryOf(input: unknown): string | null {
  return new URL(String(input), 'http://localhost').searchParams.get('q');
}

function respondWith(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(Response.json(body, { status })));
}

async function type(value: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } });
}

// A browser that can give a location, so "Use my location" shows beside the
// search (jsdom has no navigator.geolocation).
function withLocation() {
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: vi.fn() },
    configurable: true,
  });
}

async function pause(ms = 300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('LocationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'geolocation');
    vi.restoreAllMocks();
  });

  it('hints at an example, keeping the label as the name', () => {
    render(<LocationSearch onSelect={() => {}} />);
    const box = screen.getByRole('combobox', {
      name: 'Search for a city or area in India',
    });
    expect(box.getAttribute('placeholder')).toBe('e.g. Pune, India');
    // Tailwind's default placeholder is the text colour at half strength,
    // about 3.1:1; the muted text colour is about 6.6:1.
    expect(box.className).toContain('placeholder:text-text-dark-muted');
  });

  it('does not search for fewer than 2 characters', async () => {
    const fetchSpy = respondWith({ data: searchFixture });
    render(<LocationSearch onSelect={() => {}} />);

    await type('P');
    await pause(400);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('searches once after typing pauses and announces the count', async () => {
    const fetchSpy = respondWith({ data: searchFixture });
    render(<LocationSearch onSelect={() => {}} />);

    await type('Pu');
    await type('Pun');
    await type('Pune');
    await pause();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(queryOf(fetchSpy.mock.calls[0]?.[0])).toBe('Pune');
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.getByRole('status').textContent).toBe('5 places found');
  });

  it('selects a place with the keyboard', async () => {
    respondWith({ data: searchFixture });
    const onSelect = vi.fn();
    render(<LocationSearch onSelect={onSelect} />);
    await type('Pune');
    await pause();
    const input = screen.getByRole('combobox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe(
      screen.getAllByRole('option')[0]?.id,
    );
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith({
      label: 'Pune, Maharashtra',
      latitude: 18.51957,
      longitude: 73.85535,
    });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect((input as HTMLInputElement).value).toBe('Pune, Maharashtra');
  });

  it('does not select while an IME composition is in progress', async () => {
    respondWith({ data: searchFixture });
    const onSelect = vi.fn();
    render(<LocationSearch onSelect={onSelect} />);
    await type('Pune');
    await pause();
    const input = screen.getByRole('combobox');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes the list with Escape', async () => {
    respondWith({ data: searchFixture });
    render(<LocationSearch onSelect={() => {}} />);
    await type('Pune');
    await pause();
    const input = screen.getByRole('combobox');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('ignores a slower response for an older query', async () => {
    const pending: Array<{
      query: string | null;
      signal: AbortSignal | undefined;
      resolve: (r: Response) => void;
    }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (input, init) =>
        new Promise((resolve) => {
          pending.push({
            query: queryOf(input),
            signal: init?.signal ?? undefined,
            resolve,
          });
        }),
    );
    render(<LocationSearch onSelect={() => {}} />);

    await type('Pun');
    await pause();
    await type('Pune');
    await pause();
    await act(async () => {
      pending[1]?.resolve(Response.json({ data: searchFixture.slice(0, 1) }));
    });
    await act(async () => {
      pending[0]?.resolve(Response.json({ data: searchFixture.slice(1) }));
    });

    expect(pending.map((p) => p.query)).toEqual(['Pun', 'Pune']);
    expect(pending[0]?.signal?.aborted).toBe(true);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain('Pune');
  });

  it('says when nothing matches', async () => {
    withLocation();
    respondWith({ data: [] });
    render(<LocationSearch onSelect={() => {}} />);

    await type('zzqxw');
    await pause();

    expect(screen.getByRole('status').textContent).toBe(
      'No places found. Try a nearby city, or use your location.',
    );
  });

  // F-35: a failed search says what to do next, not the provider's message.
  it('says what to do when the search fails', async () => {
    withLocation();
    respondWith(
      {
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Data provider unavailable.',
        },
      },
      502,
    );
    render(<LocationSearch onSelect={() => {}} />);

    await type('Pune');
    await pause();

    expect(screen.getByRole('status').textContent).toBe(
      "Search isn't working right now. Try again, or use your location.",
    );
  });

  // The landing page has no "Use my location", so its messages leave it out.
  it('leaves out the location hint where none is offered', async () => {
    respondWith({ data: [] });
    render(<LocationSearch onSelect={() => {}} offersLocation={false} />);

    await type('zzqxw');
    await pause();
    expect(screen.getByRole('status').textContent).toBe(
      'No places found. Try a nearby city.',
    );

    vi.restoreAllMocks();
    respondWith(
      {
        error: {
          code: 'PROVIDER_ERROR',
          message: 'Data provider unavailable.',
        },
      },
      502,
    );
    await type('Pune');
    await pause();
    expect(screen.getByRole('status').textContent).toBe(
      "Search isn't working right now. Try again in a moment.",
    );
  });

  // "Use my location" hides itself in a browser with no geolocation, so the
  // search must not point to it there either.
  it('leaves out the location hint when the browser has no location', async () => {
    respondWith({ data: [] });
    render(<LocationSearch onSelect={() => {}} />);

    await type('zzqxw');
    await pause();

    expect(screen.getByRole('status').textContent).toBe(
      'No places found. Try a nearby city.',
    );
  });

  it('keeps the connection message when AirAware cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Failed to fetch'),
    );
    render(<LocationSearch onSelect={() => {}} />);

    await type('Pune');
    await pause();

    expect(screen.getByRole('status').textContent).toBe(
      'Could not reach AirAware. Check your connection.',
    );
  });

  it('shows the server message when rate limited', async () => {
    respondWith(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again in a minute.',
        },
      },
      429,
    );
    render(<LocationSearch onSelect={() => {}} />);

    await type('Pune');
    await pause();

    expect(screen.getByRole('status').textContent).toBe(
      'Too many requests. Try again in a minute.',
    );
  });

  describe('with a submit button (the landing page)', () => {
    const search = () => screen.getByRole('button', { name: 'Search' });

    it('has no button without the prop', () => {
      render(<LocationSearch onSelect={() => {}} />);

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('Enter and the button both open the list and pick nothing', async () => {
      respondWith({ data: searchFixture });
      const onSelect = vi.fn();
      render(<LocationSearch onSelect={onSelect} submitLabel="Search" />);
      await type('Pune');
      await pause();
      const input = screen.getByRole('combobox');

      for (const press of [
        () => fireEvent.click(search()),
        () => fireEvent.keyDown(input, { key: 'Enter' }),
      ]) {
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(input.getAttribute('aria-expanded')).toBe('false');
        press();
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(screen.getAllByRole('option')).toHaveLength(5);
        expect(input.getAttribute('aria-activedescendant')).toBeNull();
      }
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('the button opens the results of text typed a moment ago', async () => {
      respondWith({ data: searchFixture });
      const onSelect = vi.fn();
      render(<LocationSearch onSelect={onSelect} submitLabel="Search" />);

      await type('Pune');
      fireEvent.click(search());
      await pause();

      expect(screen.getAllByRole('option')).toHaveLength(5);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('the button chooses the highlighted option, as Enter does', async () => {
      respondWith({ data: searchFixture });
      const onSelect = vi.fn();
      render(<LocationSearch onSelect={onSelect} submitLabel="Search" />);
      await type('Pune');
      await pause();

      const input = screen.getByRole('combobox');
      act(() => input.focus());
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // As in a browser: a press does not take focus from the input, and Tab
      // moves focus to the button before the click.
      expect(fireEvent.mouseDown(search())).toBe(false);
      act(() => search().focus());
      fireEvent.click(search());

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith({
        label: 'Pune, Maharashtra',
        latitude: 18.51957,
        longitude: 73.85535,
      });
    });

    it('the button searches again after a failed search', async () => {
      const fetchSpy = respondWith({ error: { code: 'X' } }, 500);
      render(<LocationSearch onSelect={() => {}} submitLabel="Search" />);
      await type('Pune');
      await pause();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      fireEvent.click(search());
      await pause();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does nothing for fewer than 2 letters', async () => {
      const fetchSpy = respondWith({ data: searchFixture });
      const onSelect = vi.fn();
      render(<LocationSearch onSelect={onSelect} submitLabel="Search" />);
      await type('P');

      fireEvent.click(search());
      await pause(400);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  it('has no axe violations with results open', async () => {
    respondWith({ data: searchFixture });
    const { container } = render(<LocationSearch onSelect={() => {}} />);
    await type('Pune');
    await pause();

    vi.useRealTimers();
    await expectNoAxeViolations(container);
  });
});
