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
  max: 1,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 30_000
});

export const prisma = new PrismaClient({ adapter });
