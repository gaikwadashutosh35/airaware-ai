import axe from 'axe-core';
import { expect } from 'vitest';

// jsdom cannot compute colours, so contrast is checked in a real browser.
export async function expectNoAxeViolations(
  container: HTMLElement,
): Promise<void> {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
