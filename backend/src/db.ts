import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const bundledCaPath = fileURLToPath(new URL("../certs/supabase-ca.crt", import.meta.url));
const caPath = config.DATABASE_CA_CERT_PATH || (existsSync(bundledCaPath) ? bundledCaPath : undefined);
const ssl = caPath ? { ca: readFileSync(caPath, "utf8"), rejectUnauthorized: true } : undefined;

function connectionStringForExplicitSsl(value: string) {
  if (!ssl) return value;
  const url = new URL(value);
  // pg connection-string SSL parameters override the verified SSL object.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  return url.toString();
}

const adapter = new PrismaPg({
  connectionString: connectionStringForExplicitSsl(config.DATABASE_URL),
  ssl,
  // Detail views load several related collections. A small pool lets Prisma
  // fetch them concurrently instead of paying one network round-trip each.
  max: 5,
  keepAlive: true,
  idleTimeoutMillis: 5 * 60_000,
  connectionTimeoutMillis: 30_000
});

export const prisma = new PrismaClient({ adapter });
