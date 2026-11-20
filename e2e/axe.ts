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
// turns named rules off, only where a caller shows the rule misreads the
// page (and checks the same thing another way).
export async function expectNoAxeViolations(
  page: Page,
  { skip = [] }: { skip?: string[] } = {},
): Promise<void> {
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
