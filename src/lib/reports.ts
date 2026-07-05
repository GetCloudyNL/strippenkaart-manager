import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addDays,
} from "date-fns";
import { prisma } from "./prisma";
import { queueEmail } from "./mail";
import {
  monthlySummaryEmail,
  lowBalanceEmail,
  expiryReminderEmail,
} from "./email-templates";
import { generateMonthlySummaryPdf } from "./pdf";

const monthFmt = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});
const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function lowThreshold(): number {
  return Number(process.env.LOW_BALANCE_THRESHOLD_MIN || 60);
}

/** Genereert en verstuurt maandoverzichten voor de vorige maand. */
export async function runMonthlyReports(reference = new Date()): Promise<number> {
  const monthStart = startOfMonth(subMonths(reference, 1));
  const monthEnd = endOfMonth(subMonths(reference, 1));
  const monthLabel = monthFmt.format(monthStart);

  const entries = await prisma.timeEntry.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    include: { project: { include: { customer: true } } },
    orderBy: { date: "asc" },
  });

  // Groepeer per klant.
  const byCustomer = new Map<string, typeof entries>();
  for (const e of entries) {
    const id = e.project.customerId;
    const list = byCustomer.get(id) ?? [];
    list.push(e);
    byCustomer.set(id, list);
  }

  let sent = 0;
  for (const [customerId, custEntries] of byCustomer) {
    const customer = custEntries[0].project.customer;
    if (!customer.email) continue;

    const cards = await prisma.strippenkaart.findMany({
      where: { customerId, status: { in: ["ACTIVE", "DEPLETED"] } },
      include: { cardType: true },
    });

    const rows = custEntries.map((e) => ({
      dateLabel: dateFmt.format(e.date),
      projectName: e.project.name,
      description: e.description,
      minutes: e.chargedMinutes,
    }));
    const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
    const cardSummaries = cards.map((c) => ({
      name: c.cardType.name,
      remainingMinutes: c.remainingMinutes,
    }));

    const pdf = await generateMonthlySummaryPdf({
      customerName: customer.name,
      monthLabel,
      entries: rows,
      totalMinutes,
      cards: cardSummaries,
    });

    const mail = monthlySummaryEmail({
      customerName: customer.name,
      monthLabel,
      entries: rows,
      totalMinutes,
      cards: cardSummaries,
    });

    await queueEmail({
      type: "MONTHLY_SUMMARY",
      to: customer.email,
      subject: mail.subject,
      html: mail.html,
      customerId: customer.id,
      attachments: [
        {
          filename: `maandoverzicht-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`,
          contentBase64: pdf.toString("base64"),
        },
      ],
    });
    sent++;
  }

  return sent;
}

async function alreadyNotified(
  strippenkaartId: string,
  type: "LOW_BALANCE" | "EXPIRY_REMINDER",
  sinceDays = 14,
): Promise<boolean> {
  const since = addDays(new Date(), -sinceDays);
  const existing = await prisma.emailLog.findFirst({
    where: { strippenkaartId, type, createdAt: { gte: since } },
  });
  return existing !== null;
}

/** Verstuurt alerts voor laag saldo en naderende vervaldatum. */
export async function runAlerts(): Promise<{ lowBalance: number; expiry: number }> {
  const threshold = lowThreshold();
  const expiryDays = Number(process.env.EXPIRY_REMINDER_DAYS || 14);

  let lowBalance = 0;
  let expiry = 0;

  // Laag saldo: actieve kaarten met te weinig resterend tegoed.
  const lowCards = await prisma.strippenkaart.findMany({
    where: { status: "ACTIVE", remainingMinutes: { lt: threshold } },
    include: { customer: true, cardType: true },
  });
  for (const card of lowCards) {
    if (!card.customer.email) continue;
    if (await alreadyNotified(card.id, "LOW_BALANCE")) continue;
    const mail = lowBalanceEmail({
      customerName: card.customer.name,
      cardTypeName: card.cardType.name,
      remainingMinutes: card.remainingMinutes,
    });
    await queueEmail({
      type: "LOW_BALANCE",
      to: card.customer.email,
      subject: mail.subject,
      html: mail.html,
      customerId: card.customer.id,
      strippenkaartId: card.id,
    });
    lowBalance++;
  }

  // Vervaldatum: actieve kaarten die binnenkort verlopen en nog tegoed hebben.
  const until = addDays(new Date(), expiryDays);
  const expiringCards = await prisma.strippenkaart.findMany({
    where: {
      status: "ACTIVE",
      remainingMinutes: { gt: 0 },
      expiresAt: { not: null, lte: until, gte: new Date() },
    },
    include: { customer: true, cardType: true },
  });
  for (const card of expiringCards) {
    if (!card.customer.email || !card.expiresAt) continue;
    if (await alreadyNotified(card.id, "EXPIRY_REMINDER")) continue;
    const mail = expiryReminderEmail({
      customerName: card.customer.name,
      cardTypeName: card.cardType.name,
      remainingMinutes: card.remainingMinutes,
      expiresAtLabel: dateFmt.format(card.expiresAt),
    });
    await queueEmail({
      type: "EXPIRY_REMINDER",
      to: card.customer.email,
      subject: mail.subject,
      html: mail.html,
      customerId: card.customer.id,
      strippenkaartId: card.id,
    });
    expiry++;
  }

  return { lowBalance, expiry };
}
