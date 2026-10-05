import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  DATABASE_CA_CERT_PATH: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite")
});

const parsedConfig = envSchema.parse(process.env);

function databaseUrlForPg(value: string, certificatePath?: string) {
  const url = new URL(value);
  // node-postgres connection-string SSL options override an explicit `ssl`
  // object. When a CA is supplied, remove sslmode so db.ts can apply strict
  // certificate verification. Otherwise require an encrypted connection.
  if (certificatePath) url.searchParams.delete("sslmode");
  else if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

export const config = {
  ...parsedConfig,
  DATABASE_URL: databaseUrlForPg(parsedConfig.DATABASE_URL, parsedConfig.DATABASE_CA_CERT_PATH),
  // Gemini retired this model for new API users. Keep existing local .env files
  // working by transparently upgrading the obsolete value.
  GEMINI_MODEL: parsedConfig.GEMINI_MODEL === "gemini-2.5-flash-lite"
    ? "gemini-3.5-flash-lite"
    : parsedConfig.GEMINI_MODEL
};
