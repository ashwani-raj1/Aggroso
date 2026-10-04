import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { policies } from "../src/domain/policy.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const adapter = new PrismaPg({
  connectionString,
  max: 1,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (const policy of policies) {
    await prisma.policySection.upsert({
      where: { code: policy.code },
      update: policy,
      create: policy
    });
  }
}

main()
  .then(() => console.log(`Seeded ${policies.length} policy sections.`))
  .finally(() => prisma.$disconnect());
