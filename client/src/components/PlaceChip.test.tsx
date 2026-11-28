import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../test/axe.ts';
import { stubDialog } from '../test/dialog.ts';
import { PlaceChip } from './PlaceChip.tsx';

beforeAll(stubDialog);

function Harness({ label }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <PlaceChip
      label={label}
      open={open}
      onOpenChange={setOpen}
      onChoose={() => setOpen(false)}
      onLocateStart={() => {}}
      onLocate={() => {}}
    />
  );
}

describe('PlaceChip', () => {
  afterEach(cleanup);

  it('the chip names the place and opens the dialog', async () => {
    const { container } = render(<Harness label="Pune, Maharashtra" />);

    const chip = screen.getByRole('button', {
      name: 'Change place: Pune, Maharashtra',
    });
    expect(chip.textContent).toContain('Pune, Maharashtra');
    // Below lg only the text before the first comma shows; from lg, all.
    expect(chip.querySelector('[class~="lg:hidden"]')?.textContent).toBe(
      'Pune',
    );
    expect(chip.querySelector('[class~="lg:inline"]')?.textContent).toBe(
      'Pune, Maharashtra',
    );
    // C6 border; the chip is the row's flexible item (it gives way, not the row).
    expect(chip.className).toContain('border-text-muted');
    expect(chip.className).toContain('basis-0');
    // X3: a floor in rem, so at 200 % text the chip wraps to its own row
    // instead of shrinking to its icons (the width is checked in e2e).
    expect(chip.className).toContain('min-w-24');
    expect(chip.className).not.toContain('min-w-0');
    expect(
      screen.queryByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeNull();

    fireEvent.click(chip);

    const dialog = container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe(
      screen.getByRole('heading', { name: 'Change place' }).id,
    );
    expect(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeDefined();
    await expectNoAxeViolations(container);
  });

  it('a label with no comma shows whole at every width', () => {
    render(<Harness label="Mumbai" />);
    const chip = screen.getByRole('button', { name: 'Change place: Mumbai' });
    expect(chip.querySelector('[class~="lg:hidden"]')?.textContent).toBe(
      'Mumbai',
    );
    expect(chip.querySelector('[class~="lg:inline"]')?.textContent).toBe(
      'Mumbai',
    );
  });

  it('says "Choose a place" when there is none', () => {
    render(<Harness />);
    expect(
      screen.getByRole('button', { name: 'Choose a place' }),
    ).toBeDefined();
  });

  it('a tap between Escape and its close event still opens the dialog', () => {
    const { container } = render(<Harness label="Pune, Maharashtra" />);
    const chip = screen.getByRole('button', { name: /^Change place/ });
    fireEvent.click(chip);
    const dialog = container.querySelector('dialog')!;

    // Escape: the browser closes the dialog, and fires `close` a task later.
    dialog.open = false;
    fireEvent.click(chip);
    fireEvent(dialog, new Event('close'));

    expect(dialog.open).toBe(true);
    expect(
      screen.getByRole('combobox', {
        name: 'Search for a city or area in India',
      }),
    ).toBeDefined();
  });

  it('the Close button closes the dialog and empties it', () => {
    const { container } = render(<Harness label="Pune, Maharashtra" />);
    fireEvent.click(screen.getByRole('button', { name: /^Change place/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(container.querySelector('dialog')!.open).toBe(false);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
