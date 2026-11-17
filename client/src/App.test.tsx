import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import App from './App.tsx';

it('renders one main landmark with the product heading', () => {
  render(<App />);

  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(
    screen.getByRole('heading', { level: 1, name: 'AirAware AI' }),
  ).toBeTruthy();
});
