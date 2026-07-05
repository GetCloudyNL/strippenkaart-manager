import { prisma } from "./prisma";
import { queueEmail } from "./mail";
import { workCompletedEmail } from "./email-templates";

function lowThreshold(): number {
  return Number(process.env.LOW_BALANCE_THRESHOLD_MIN || 60);
}

/**
 * Verstuurt (indien de klant dat wil) een 'werk afgerond'-mail met het
 * resterende saldo voor een strippenkaart-boeking.
 */
export async function sendWorkCompletedMail(entryId: string): Promise<boolean> {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { strippenkaart: { include: { customer: true, cardType: true } } },
  });
  if (!entry?.strippenkaart) return false;

  const customer = entry.strippenkaart.customer;
  if (!customer.notifyOnCompletion || !customer.email) return false;

  const mail = workCompletedEmail({
    customerName: customer.name,
    cardTypeName: entry.strippenkaart.cardType.name,
    description: entry.description,
    chargedMinutes: entry.chargedMinutes,
    remainingMinutes: entry.strippenkaart.remainingMinutes,
    lowThresholdMin: lowThreshold(),
  });

  await queueEmail({
    type: "WORK_COMPLETED",
    to: customer.email,
    subject: mail.subject,
    html: mail.html,
    customerId: customer.id,
    strippenkaartId: entry.strippenkaart.id,
  });
  return true;
}
