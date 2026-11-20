import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Privacy from './Privacy.tsx';

describe('Privacy', () => {
  afterEach(cleanup);

  // Phase 5: what "Remember on this device" keeps, and how to forget it.
  it('explains what Remember on this device keeps', () => {
    const { container } = render(<Privacy />);
    const text = container.textContent ?? '';

    expect(text).toContain('or tick "Remember on this device"');
    expect(text).toContain(
      'If you tick "Remember on this device": your answers and the city or area you searched for, with its coordinates rounded to about 1 km.',
    );
    expect(text).toContain(
      'A place found with "Use my location" is never saved.',
    );
    expect(text).toContain(
      '"Forget this place" in My Profile removes a remembered place.',
    );
    expect(text).not.toContain('No coordinates.');
  });
});
