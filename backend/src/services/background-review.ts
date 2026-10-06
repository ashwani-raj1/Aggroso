import pino from "pino";
import { config } from "../config.js";
import { prisma } from "../db.js";

const logger = pino().child({ component: "background-review-worker" });
const POLL_INTERVAL_MS = 3_000;
const STALE_AFTER_MS = 10 * 60_000;

export function startBackgroundReviewWorker() {
  let stopped = false;
  let draining = false;

  async function recoverStaleReviews() {
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
    const staleReviews = await prisma.review.updateMany({
      where: { status: "RUNNING", createdAt: { lt: staleBefore } },
      data: { status: "FAILED", errorMessage: "Review worker was interrupted; the listing was queued again." }
    });
    const staleListings = await prisma.listing.updateMany({
      where: { status: "REVIEWING", updatedAt: { lt: staleBefore } },
      data: { status: "PENDING" }
    });
    if (staleReviews.count || staleListings.count) {
      logger.warn({ event: "stale_reviews_requeued", reviews: staleReviews.count, listings: staleListings.count });
    }
  }

  async function drain() {
    if (stopped || draining) return;
    draining = true;
    try {
      const pending = await prisma.listing.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
        take: 3
      });

      for (const listing of pending) {
        if (stopped) break;
        logger.info({ event: "background_review_dispatched", listingId: listing.id });
        try {
          const response = await fetch(`http://127.0.0.1:${config.PORT}/api/listings/${listing.id}/review`, {
            method: "POST",
            headers: { "x-review-trigger": "background-worker" },
            signal: AbortSignal.timeout(120_000)
          });
          if (!response.ok && response.status !== 409) {
            logger.error({ event: "background_review_request_failed", listingId: listing.id, status: response.status });
          }
        } catch (error) {
          logger.error({ event: "background_review_dispatch_error", listingId: listing.id, error });
        }
      }
    } catch (error) {
      logger.error({ event: "background_review_poll_failed", error });
    } finally {
      draining = false;
    }
  }

  recoverStaleReviews().then(drain).catch((error) => logger.error({ event: "background_review_start_failed", error }));
  const timer = setInterval(drain, POLL_INTERVAL_MS);
  timer.unref();
  logger.info({ event: "background_review_worker_started", pollIntervalMs: POLL_INTERVAL_MS });

  return () => {
    stopped = true;
    clearInterval(timer);
    logger.info({ event: "background_review_worker_stopped" });
  };
}
