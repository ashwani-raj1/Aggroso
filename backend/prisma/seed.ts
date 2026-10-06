import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { policies } from "../src/domain/policy.js";
import { normalizedListingKey } from "../src/domain/listing.js";
import { sampleListings } from "../src/domain/sample-listings.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const secureConnectionUrl = new URL(connectionString);
const certificatePath = process.env.DATABASE_CA_CERT_PATH;
if (certificatePath) secureConnectionUrl.searchParams.delete("sslmode");
else if (!secureConnectionUrl.searchParams.has("sslmode")) secureConnectionUrl.searchParams.set("sslmode", "require");

const adapter = new PrismaPg({
  connectionString: secureConnectionUrl.toString(),
  ssl: certificatePath ? { ca: readFileSync(certificatePath, "utf8"), rejectUnauthorized: true } : undefined,
  max: 1,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 30_000
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

  let createdSamples = 0;
  let updatedSamples = 0;
  for (const listing of sampleListings) {
    const normalizedKey = normalizedListingKey(listing);
    const existing = await prisma.listing.findFirst({ where: { normalizedKey }, select: { id: true } });
    const { imageUrl, ...listingData } = listing;
    const attributes = { ...listing.attributes, ...(imageUrl ? { __imageUrl: imageUrl } : {}) };
    if (existing) {
      await prisma.listing.update({ where: { id: existing.id }, data: { attributes } });
      updatedSamples += 1;
      continue;
    }
    await prisma.listing.create({
      data: {
        ...listingData,
        attributes,
        price: listing.price,
        normalizedKey,
        auditLogs: { create: { action: "SAMPLE_LISTING_CREATED", metadata: { source: "seed" } } }
      }
    });
    createdSamples += 1;
  }
  console.log(`Created ${createdSamples} and refreshed ${updatedSamples} sample listings.`);
}

main()
  .then(() => console.log(`Seeded ${policies.length} policy sections and verified ${sampleListings.length} samples.`))
  .finally(() => prisma.$disconnect());
