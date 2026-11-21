import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, type Page } from '@playwright/test';

// The installed axe-core, loaded with page.evaluate: the app's CSP blocks
// injected <script> tags, but not evaluation from the test.
const source = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);

interface AxeWindow {
  axe: {
    run: (
      context: Document,
      options: { rules: Record<string, { enabled: boolean }> },
    ) => Promise<{
      violations: Array<{
        id: string;
        help: string;
        nodes: Array<{ target: string[] }>;
      }>;
    }>;
  };
}

// Colour contrast is checked here, in a real browser (jsdom can't). `skip`
// can turn off colour-contrast only, and only under forced colours, where
// axe misreads the painted colours (the caller checks contrast directly).
export async function expectNoAxeViolations(
  page: Page,
  { skip = [] }: { skip?: Array<'color-contrast'> } = {},
): Promise<void> {
  if (skip.length) {
    const forced = await page.evaluate(
      () => matchMedia('(forced-colors: active)').matches,
    );
    expect(
      forced,
      'colour-contrast may be skipped only under forced colours',
    ).toBe(true);
  }
  await page.evaluate(source);
  const violations = await page.evaluate(async (off) => {
    const { axe } = window as unknown as AxeWindow;
    const rules = Object.fromEntries(off.map((id) => [id, { enabled: false }]));
    const result = await axe.run(document, { rules });
    return result.violations.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    );
  }, skip);
  expect(violations).toEqual([]);
}
