import pino from "pino";
import { prisma } from "../db.js";
import { normalizedListingKey } from "../domain/listing.js";
import { sampleListings } from "../domain/sample-listings.js";

const logger = pino().child({ component: "sample-catalog" });

export async function ensureSampleCatalog() {
  let created = 0;
  let refreshed = 0;

  for (const listing of sampleListings) {
    const normalizedKey = normalizedListingKey(listing);
    const { imageUrl, ...listingData } = listing;
    const attributes = { ...listing.attributes, ...(imageUrl ? { __imageUrl: imageUrl } : {}) };
    const existing = await prisma.listing.findFirst({ where: { normalizedKey }, select: { id: true } });

    if (existing) {
      await prisma.listing.update({ where: { id: existing.id }, data: { attributes } });
      refreshed += 1;
      continue;
    }

    await prisma.listing.create({
      data: {
        ...listingData,
        attributes,
        normalizedKey,
        auditLogs: { create: { action: "SAMPLE_LISTING_CREATED", metadata: { source: "startup-catalog" } } }
      }
    });
    created += 1;
  }

  logger.info({ event: "sample_catalog_ready", created, refreshed, total: sampleListings.length });
}
