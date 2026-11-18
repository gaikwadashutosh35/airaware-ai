import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../test/axe.ts';
import { UseMyLocation } from './UseMyLocation.tsx';

type Success = (position: {
  coords: { latitude: number; longitude: number };
}) => void;
type Failure = (error: { code: number; message: string }) => void;

function stubGeolocation(
  respond?: (success: Success, failure: Failure) => void,
) {
  const getCurrentPosition = vi.fn(
    (success: Success, failure: Failure, _options?: PositionOptions) =>
      respond?.(success, failure),
  );
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
}

describe('UseMyLocation', () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, 'geolocation');
  });

  it('asks for the location only when the button is clicked', () => {
    const getCurrentPosition = stubGeolocation();
    render(<UseMyLocation onLocate={() => {}} />);

    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 600000,
    });
  });

  it('passes on an approximate place', () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 18.519571, longitude: 73.855347 } }),
    );
    const onLocate = vi.fn();
    render(<UseMyLocation onLocate={onLocate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(onLocate).toHaveBeenCalledWith({
      label: 'Near you (approximate)',
      latitude: 18.52,
      longitude: 73.86,
    });
  });

  it('explains a denied permission and points to search', () => {
    stubGeolocation((_, failure) => failure({ code: 1, message: 'denied' }));
    render(<UseMyLocation onLocate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(screen.getByRole('status').textContent).toBe(
      'Location permission was denied. Search for a place instead.',
    );
  });

  it('explains a timeout and points to search', () => {
    stubGeolocation((_, failure) => failure({ code: 3, message: 'timeout' }));
    render(<UseMyLocation onLocate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));

    expect(screen.getByRole('status').textContent).toBe(
      'Your location could not be found. Search for a place instead.',
    );
  });

  it('renders nothing when the browser has no geolocation', () => {
    Reflect.deleteProperty(navigator, 'geolocation');

    render(<UseMyLocation onLocate={() => {}} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says plainly what happens to the location', () => {
    stubGeolocation();
    render(<UseMyLocation onLocate={() => {}} />);

    const button = screen.getByRole('button', { name: 'Use my location' });
    const hint = document.getElementById(
      button.getAttribute('aria-describedby') ?? '',
    );
    expect(hint?.textContent).toBe(
      'Your browser asks first. Your location is rounded to about 1 km before it leaves your browser.',
    );
  });

  it('has no axe violations', async () => {
    stubGeolocation();
    const { container } = render(<UseMyLocation onLocate={() => {}} />);

    await expectNoAxeViolations(container);
  });
});
