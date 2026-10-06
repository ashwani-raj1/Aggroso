import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { startBackgroundReviewWorker } from "./services/background-review.js";

let server: ReturnType<typeof app.listen> | undefined;
let stopReviewWorker: (() => void) | undefined;

async function start() {
  server = app.listen(config.PORT, () => {
    console.log(`Marketplace reviewer API listening on port ${config.PORT}`);
    stopReviewWorker = startBackgroundReviewWorker();
  });
}

async function shutdown() {
  stopReviewWorker?.();
  server?.close();
  await prisma.$disconnect();
}

start().catch((error) => {
  console.error("Backend startup failed", error);
  process.exitCode = 1;
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
