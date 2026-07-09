import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./prisma";
import { mailQueue, type MailJob } from "./queue";
import type { EmailType } from "../generated/prisma/enums";

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
  return transporter;
}

function mailFrom(): string {
  return process.env.MAIL_FROM || "LemonCap <noreply@lemoncap.nl>";
}

export interface QueueEmailInput {
  type: EmailType;
  to: string;
  subject: string;
  html: string;
  customerId?: string;
  strippenkaartId?: string;
  attachments?: MailJob["attachments"];
}

/**
 * Legt een e-mail vast in de EmailLog en zet 'm in de mailwachtrij. De worker
 * verstuurt de mail daadwerkelijk (met retries).
 */
export async function queueEmail(input: QueueEmailInput) {
  const log = await prisma.emailLog.create({
    data: {
      type: input.type,
      to: input.to,
      subject: input.subject,
      status: "PENDING",
      customerId: input.customerId ?? null,
      strippenkaartId: input.strippenkaartId ?? null,
    },
  });

  await mailQueue.add("send", {
    emailLogId: log.id,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });

  return log;
}

/** Verwerkt een mailjob: verstuurt de e-mail en werkt de EmailLog bij. */
export async function processMailJob(job: MailJob): Promise<void> {
  try {
    await getTransport().sendMail({
      from: mailFrom(),
      to: job.to,
      subject: job.subject,
      html: job.html,
      attachments: (job.attachments ?? []).map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.contentBase64, "base64"),
      })),
    });
    await prisma.emailLog.update({
      where: { id: job.emailLogId },
      data: { status: "SENT", sentAt: new Date(), error: null },
    });
  } catch (e) {
    await prisma.emailLog.update({
      where: { id: job.emailLogId },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "Onbekende fout",
      },
    });
    throw e;
  }
}
