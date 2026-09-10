import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.string().default('3000').transform(Number),
    DATABASE_URL: z.string().url(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379').transform(Number),
    REDIS_URL: z.string().url().optional(),
    // Optional, and only a health-check flag. Object storage is reached through
    // the S3 SDK in common/storage, which talks to whatever STORAGE_ENDPOINT
    // names — Supabase, MinIO, or S3 itself. Requiring these made the API
    // refuse to boot on a deployment that had moved off Supabase entirely,
    // failing on two variables nothing in the request path reads.
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    // The bucket the photographs live in. Optional so a deployment without
    // uploads still starts; the storage service reports its own misconfiguration.
    STORAGE_BUCKET_NAME: z.string().optional(),
    STORAGE_ENDPOINT: z.string().url().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    FASTAPI_INFERENCE_URL: z.string().url().default('http://localhost:8000'),
    FASTAPI_API_KEY: z.string().optional(),
  })
  .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}
