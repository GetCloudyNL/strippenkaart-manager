import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const u = new URL(url);
  const db = u.pathname && u.pathname !== "/" ? Number(u.pathname.slice(1)) : 0;
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    password: u.password || undefined,
    username: u.username || undefined,
    db: Number.isFinite(db) ? db : 0,
    tls: u.protocol === "rediss:" ? {} : undefined,
  };
}

// Plain options object i.p.v. een ioredis-instantie, zodat BullMQ zijn eigen
// (intern gebundelde) ioredis gebruikt en er geen versieconflict ontstaat.
export const connectionOptions = {
  ...parseRedisUrl(redisUrl),
  maxRetriesPerRequest: null,
};

export const QUEUE_NAMES = {
  hostbill: "hostbill",
  mail: "mail",
  reports: "reports",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface MailJob {
  emailLogId: string;
}

export const mailQueue = new Queue<MailJob>(QUEUE_NAMES.mail, {
  connection: connectionOptions,
});
export const hostbillQueue = new Queue(QUEUE_NAMES.hostbill, {
  connection: connectionOptions,
});
export const reportsQueue = new Queue(QUEUE_NAMES.reports, {
  connection: connectionOptions,
});
