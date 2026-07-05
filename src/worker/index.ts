import "dotenv/config";
import { Worker } from "bullmq";
import {
  QUEUE_NAMES,
  connectionOptions,
  hostbillQueue,
  reportsQueue,
  type MailJob,
} from "../lib/queue";
import { pollHostbillOrders, createUpsellForCard } from "../lib/hostbill-sync";
import { processMailJob } from "../lib/mail";
import { runMonthlyReports, runAlerts } from "../lib/reports";

interface HostbillJob {
  type: "poll" | "upsell";
  cardId?: string;
}

const mailWorker = new Worker<MailJob>(
  QUEUE_NAMES.mail,
  async (job) => {
    await processMailJob(job.data);
    console.log(`[mail] verstuurd naar ${job.data.to}`);
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
    if (job.name === "monthly") {
      const sent = await runMonthlyReports();
      console.log(`[reports] maandoverzichten verstuurd: ${sent}`);
    } else if (job.name === "alerts") {
      const res = await runAlerts();
      console.log(
        `[reports] alerts: laag saldo ${res.lowBalance}, vervaldatum ${res.expiry}`,
      );
    }
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

async function scheduleReports() {
  if (process.env.REPORTS_ENABLED !== "true") {
    console.log("Geplande rapporten staan uit (REPORTS_ENABLED != true).");
    return;
  }
  await reportsQueue.add(
    "monthly",
    {},
    { repeat: { pattern: "0 8 1 * *" }, removeOnComplete: true, removeOnFail: 50 },
  );
  await reportsQueue.add(
    "alerts",
    {},
    { repeat: { pattern: "0 8 * * *" }, removeOnComplete: true, removeOnFail: 50 },
  );
  console.log("Maandoverzicht (1e v/d maand) en dagelijkse alerts ingepland.");
}

void scheduleHostbillPoll().catch((e) =>
  console.error("Plannen van HostBill-poll mislukt:", e),
);
void scheduleReports().catch((e) =>
  console.error("Plannen van rapporten mislukt:", e),
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
