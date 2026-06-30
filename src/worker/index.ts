import "dotenv/config";
import { Worker } from "bullmq";
import { QUEUE_NAMES, connectionOptions } from "../lib/queue";

// Skeleton-workers. De daadwerkelijke verwerking (HostBill-polling, mail
// versturen, maandrapportages) wordt in fase 4 en 5 ingevuld.

const mailWorker = new Worker(
  QUEUE_NAMES.mail,
  async (job) => {
    console.log(`[mail] job ${job.id} ontvangen (nog niet geïmplementeerd)`);
  },
  { connection: connectionOptions },
);

const hostbillWorker = new Worker(
  QUEUE_NAMES.hostbill,
  async (job) => {
    console.log(`[hostbill] job ${job.id} ontvangen (nog niet geïmplementeerd)`);
  },
  { connection: connectionOptions },
);

const reportsWorker = new Worker(
  QUEUE_NAMES.reports,
  async (job) => {
    console.log(`[reports] job ${job.id} ontvangen (nog niet geïmplementeerd)`);
  },
  { connection: connectionOptions },
);

for (const w of [mailWorker, hostbillWorker, reportsWorker]) {
  w.on("failed", (job, err) => {
    console.error(`Job ${job?.id} mislukt:`, err.message);
  });
}

console.log("Worker gestart. Wacht op jobs...");

async function shutdown() {
  console.log("Worker afsluiten...");
  await Promise.all([
    mailWorker.close(),
    hostbillWorker.close(),
    reportsWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
