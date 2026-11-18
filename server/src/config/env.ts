import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  // Optional: without a key every daily plan is rules-only. An empty
  // `GEMINI_API_KEY=` line counts as unset.
  GEMINI_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((key) => key || undefined),
  // Goes into the request path, so only plain model-name characters. An
  // empty `GEMINI_MODEL=` line counts as unset.
  GEMINI_MODEL: z
    .string()
    .trim()
    .regex(/^[a-z0-9.-]*$/)
    .optional()
    .transform((model) => model || 'gemini-3.8-flash'),
  // Optional: without both, saving is off. Empty lines count as unset.
  SUPABASE_URL: z
    .string()
    .trim()
    .optional()
    .transform((url) => url || undefined)
    .pipe(z.url({ protocol: /^https$/ }).optional()),
  // Only the publishable key: a secret key here would be a misconfiguration.
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .optional()
    .transform((key) => key || undefined)
    .pipe(z.string().startsWith('sb_publishable_').optional()),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
