import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_PATH: z.string().default("./data/basis.db"),
  SESSION_SECRET: z.string().min(32).optional(),
  FINNHUB_API_KEY: z.string().optional(),
  STOOQ_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

const raw = parsed.data;

// Enforce at runtime only — `next build` collects page data with
// NODE_ENV=production but without the deployment's real environment.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (raw.NODE_ENV === "production" && !raw.SESSION_SECRET && !isBuildPhase) {
  throw new Error(
    "SESSION_SECRET is required in production. Generate one with: " +
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
  );
}

export const env = {
  ...raw,
  SESSION_SECRET: raw.SESSION_SECRET ?? "basis-dev-only-secret-do-not-use-in-production!!",
  /** Demo mode: no live-quote provider configured (or forced via DEMO_MODE). */
  isDemoMode: raw.DEMO_MODE ?? !raw.FINNHUB_API_KEY,
  aiEnabled: Boolean(raw.ANTHROPIC_API_KEY),
};
