import "dotenv/config";
import { Worker } from "bullmq";
import {
  QUEUE_NAMES,
  connectionOptions,
  hostbillQueue,
} from "../lib/queue";
import { pollHostbillOrders, createUpsellForCard } from "../lib/hostbill-sync";

interface HostbillJob {
  type: "poll" | "upsell";
  cardId?: string;
}

const mailWorker = new Worker(
  QUEUE_NAMES.mail,
  async (job) => {
    console.log(`[mail] job ${job.id} ontvangen (fase 5)`);
  },
  { connection: connectionOptions },
);

const hostbillWorker = new Worker<HostbillJob>(
  QUEUE_NAMES.hostbill,
  async (job) => {
    if (job.data.type === "upsell" && job.data.cardId) {
      await createUpsellForCard(job.data.cardId);
      console.log(`[hostbill] upsell verwerkt voor kaart ${job.data.cardId}`);
      return;
    }
    const summary = await pollHostbillOrders();
    console.log("[hostbill] poll:", JSON.stringify(summary));
  },
  { connection: connectionOptions },
);

const reportsWorker = new Worker(
  QUEUE_NAMES.reports,
  async (job) => {
    console.log(`[reports] job ${job.id} ontvangen (fase 5)`);
  },
  { connection: connectionOptions },
);

for (const w of [mailWorker, hostbillWorker, reportsWorker]) {
  w.on("failed", (job, err) => {
    console.error(`Job ${job?.id} mislukt:`, err.message);
  });
}

async function scheduleHostbillPoll() {
  if (process.env.HOSTBILL_POLL_ENABLED !== "true") {
    console.log("HostBill-polling staat uit (HOSTBILL_POLL_ENABLED != true).");
    return;
  }
  const minutes = Number(process.env.HOSTBILL_POLL_INTERVAL_MIN || 15);
  await hostbillQueue.add(
    "poll",
    { type: "poll" },
    {
      repeat: { every: Math.max(1, minutes) * 60_000 },
      removeOnComplete: true,
      removeOnFail: 50,
    },
  );
  console.log(`HostBill-polling elke ${minutes} min ingepland.`);
}

void scheduleHostbillPoll().catch((e) =>
  console.error("Plannen van HostBill-poll mislukt:", e),
);

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
