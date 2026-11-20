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

  it('says "Choose a place" when there is none', () => {
    render(<Harness />);
    expect(
      screen.getByRole('button', { name: 'Choose a place' }),
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
