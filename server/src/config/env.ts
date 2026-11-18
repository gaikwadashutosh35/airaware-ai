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
  // Goes into the request path, so only plain model-name characters.
  GEMINI_MODEL: z
    .string()
    .regex(/^[a-z0-9.-]+$/)
    .default('gemini-3.8-flash'),
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
