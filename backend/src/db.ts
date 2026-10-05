import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { config } from "./config.js";

const ssl = config.DATABASE_CA_CERT_PATH
  ? { ca: readFileSync(config.DATABASE_CA_CERT_PATH, "utf8"), rejectUnauthorized: true }
  : undefined;

const adapter = new PrismaPg({
  connectionString: config.DATABASE_URL,
  ssl,
  // Detail views load several related collections. A small pool lets Prisma
  // fetch them concurrently instead of paying one network round-trip each.
  max: 5,
  keepAlive: true,
  idleTimeoutMillis: 5 * 60_000,
  connectionTimeoutMillis: 30_000
});

export const prisma = new PrismaClient({ adapter });
