import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

const adapter = new PrismaPg({
  connectionString: config.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000
});

export const prisma = new PrismaClient({ adapter });
