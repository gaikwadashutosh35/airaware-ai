import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HouseholdContext } from '../../../shared/contracts.ts';
import type { Place } from '../features/location/place.ts';
import { expectNoAxeViolations } from '../test/axe.ts';
import { searchFixture } from '../test/fixtures.ts';
import { Welcome } from './Welcome.tsx';

const session = vi.hoisted(() => ({ available: true }));
vi.mock('../lib/supabase.ts', () => ({
  get savingAvailable() {
    return session.available;
  },
  currentToken: () => Promise.resolve(null),
  tokenForSave: () => Promise.resolve('tok'),
  forgetSession: () => Promise.resolve(),
}));

const PUNE: Place = {
  label: 'Pune, Maharashtra',
  latitude: 18.52,
  longitude: 73.86,
};
const STEP1 = 'Where should we check air quality?';
const STEP2 = 'What does your typical day look like?';
const STEP3 = 'Tell us a little about your home.';

function setup(
  props: Partial<Parameters<typeof Welcome>[0]> = {},
): Required<Pick<Parameters<typeof Welcome>[0], 'onFinish' | 'onChoosePlace'>> {
  const onFinish = props.onFinish ?? vi.fn(() => Promise.resolve());
  const onChoosePlace = props.onChoosePlace ?? vi.fn();
  // In the app, Welcome sits inside the shell's <main>.
  render(
    <main>
      <Welcome
        place={PUNE}
        placeIsSearched
        context={{}}
        onChoosePlace={onChoosePlace}
        onLocateStart={() => {}}
        onLocate={() => {}}
        {...props}
        onFinish={onFinish}
      />
    </main>,
  );
  return { onFinish, onChoosePlace };
}

const heading = (name: string) =>
  screen.getByRole('heading', { level: 1, name });
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }));
const tick = (name: string) =>
  fireEvent.click(screen.getByRole('checkbox', { name }));
const pick = (name: string) =>
  fireEvent.click(screen.getByRole('radio', { name }));

async function finish() {
  await act(async () => {
    click('See my air');
  });
}

describe('Welcome', () => {
  beforeEach(() => {
    session.available = true;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts at step 1 without a place; choosing one moves to step 2', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(Response.json({ data: searchFixture })),
    );
    const { onChoosePlace } = setup({ place: null });
    expect(heading(STEP1)).toBeDefined();
    expect(screen.getByText('Step 1 of 3')).toBeDefined();

    const input = screen.getByRole('combobox', {
      name: 'Search for a city or area in India',
    });
    fireEvent.change(input, { target: { value: 'Pune' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChoosePlace).toHaveBeenCalledTimes(1);
    expect(heading(STEP2)).toBeDefined();
  });

  it('starts at step 2 when a place is set; Back returns to step 1', () => {
    setup();
    expect(heading(STEP2)).toBeDefined();
    click('Back');
    expect(heading(STEP1)).toBeDefined();
  });

  it('Office commute reveals the travel question', () => {
    setup();
    expect(
      screen.queryByRole('group', { name: 'How do you usually travel?' }),
    ).toBeNull();
    tick('Office commute');
    expect(
      screen.getByRole('group', { name: 'How do you usually travel?' }),
    ).toBeDefined();
    tick('Work from home');
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Office commute',
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(
      screen.queryByRole('group', { name: 'How do you usually travel?' }),
    ).toBeNull();
  });

  it('skipping steps 2 and 3 finishes with no answers', async () => {
    const { onFinish } = setup();
    click('Skip');
    expect(heading(STEP3)).toBeDefined();
    await act(async () => {
      click('Skip');
    });
    expect(onFinish).toHaveBeenCalledWith({ context: {}, remember: false });
  });

  it('maps the chosen answers', async () => {
    const base: HouseholdContext = {
      householdNeeds: { includesChildren: true },
    };
    const { onFinish } = setup({ context: base });
    tick('Office commute');
    pick('Car');
    click('Next');
    pick('LPG');
    fireEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[0]!);
    await finish();
    expect(onFinish).toHaveBeenCalledWith({
      context: {
        householdNeeds: { includesChildren: true },
        routine: { commuteMode: 'car' },
        home: { cookingFuel: 'lpg', kitchenExhaust: true },
      },
      remember: false,
    });
  });

  it('Remember is off by default and is passed to onFinish', async () => {
    const { onFinish } = setup();
    click('Next');
    const remember = screen.getByRole('checkbox', {
      name: 'Remember on this device',
    }) as HTMLInputElement;
    expect(remember.checked).toBe(false);
    fireEvent.click(remember);
    await finish();
    expect(onFinish).toHaveBeenCalledWith({ context: {}, remember: true });
  });

  it('a device location says it will not be saved', () => {
    setup({ placeIsSearched: false });
    click('Next');
    tick('Remember on this device');
    expect(
      screen.getByText("Your location isn't saved; only your answers are."),
    ).toBeDefined();
  });

  it("Remember is unavailable when saving isn't set up", () => {
    session.available = false;
    setup();
    click('Next');
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Remember on this device',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText("Saving isn't set up on this site.")).toBeDefined();
  });

  it('a failed save keeps you on step 3 with a message', async () => {
    setup({ onFinish: vi.fn(() => Promise.reject(new Error('503'))) });
    click('Next');
    tick('Remember on this device');
    await finish();
    expect(heading(STEP3)).toBeDefined();
    expect(screen.getByRole('alert').textContent).toBe(
      "Saving isn't available right now. Untick Remember to continue without saving.",
    );
  });

  // Final review, Important 3: production has no StrictMode re-run.
  it('arriving puts focus on the heading', () => {
    setup();
    expect(document.activeElement).toBe(heading(STEP2));
  });

  it('each step moves focus to its heading', () => {
    setup();
    click('Next');
    expect(document.activeElement).toBe(heading(STEP3));
    click('Back');
    expect(document.activeElement).toBe(heading(STEP2));
  });

  it('steps pass axe', async () => {
    setup();
    tick('Office commute');
    await expectNoAxeViolations(document.body);
    click('Next');
    await expectNoAxeViolations(document.body);
    click('Back');
    click('Back');
    await expectNoAxeViolations(document.body);
  });
});
