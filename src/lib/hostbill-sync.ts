import { addMonths } from "date-fns";
import { prisma } from "./prisma";
import {
  getOrders,
  getClientDetails,
  createUpsellOrder,
  isHostbillConfigured,
  type NormalizedOrder,
} from "./hostbill";

const SYNC_KEY = "orders";

function paidStatuses(): string[] {
  const raw = process.env.HOSTBILL_PAID_STATUSES;
  const list = (raw ?? "Active,Paid,Completed")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list;
}

function isPaid(status: string): boolean {
  const list = paidStatuses();
  if (list.length === 0) return true;
  return list.includes(status.toLowerCase());
}

/** Maakt/updatet een klant op basis van HostBill-clientgegevens. */
export async function syncCustomerFromHostbill(clientId: number) {
  const existing = await prisma.customer.findUnique({
    where: { hostbillClientId: clientId },
  });

  let details = null;
  try {
    details = await getClientDetails(clientId);
  } catch {
    // Klantgegevens ophalen kan falen; val terug op bestaande gegevens.
  }

  const name =
    details?.companyName ||
    [details?.firstName, details?.lastName].filter(Boolean).join(" ") ||
    existing?.name ||
    `HostBill klant ${clientId}`;

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        company: details?.companyName || existing.company,
        email: details?.email || existing.email,
      },
    });
  }

  return prisma.customer.create({
    data: {
      hostbillClientId: clientId,
      name,
      company: details?.companyName || null,
      email: details?.email || "",
      type: "CUSTOMER",
    },
  });
}

export interface ProcessResult {
  orderId: number;
  status: "created" | "skipped-no-cardtype" | "skipped-not-paid" | "exists";
}

/** Verwerkt één order: maakt zo nodig een strippenkaart aan. */
export async function processOrder(
  order: NormalizedOrder,
): Promise<ProcessResult> {
  if (!isPaid(order.status)) {
    return { orderId: order.orderId, status: "skipped-not-paid" };
  }

  const cardType = await prisma.cardType.findUnique({
    where: { hostbillProductId: order.productId },
  });
  if (!cardType) {
    return { orderId: order.orderId, status: "skipped-no-cardtype" };
  }

  const existing = await prisma.strippenkaart.findUnique({
    where: { hostbillOrderId: order.orderId },
  });
  if (existing) {
    return { orderId: order.orderId, status: "exists" };
  }

  const customer = await syncCustomerFromHostbill(order.clientId);
  const purchasedAt = new Date();
  const expiresAt = cardType.validityMonths
    ? addMonths(purchasedAt, cardType.validityMonths)
    : null;

  await prisma.strippenkaart.create({
    data: {
      customerId: customer.id,
      cardTypeId: cardType.id,
      hostbillOrderId: order.orderId,
      totalMinutes: cardType.totalMinutes,
      remainingMinutes: cardType.totalMinutes,
      roundingIncrementMin: cardType.roundingIncrementMin,
      roundingDirection: cardType.roundingDirection,
      minimumPerEntryMin: cardType.minimumPerEntryMin,
      purchasedAt,
      expiresAt,
    },
  });

  return { orderId: order.orderId, status: "created" };
}

export interface PollSummary {
  configured: boolean;
  fetched: number;
  created: number;
  skipped: number;
  errors: number;
  lastOrderId: number | null;
}

/**
 * Pollt HostBill op nieuwe orders en maakt strippenkaarten aan. Houdt een
 * cursor bij (hoogste verwerkte order-id) zodat oude orders niet opnieuw
 * worden opgehaald.
 */
export async function pollHostbillOrders(): Promise<PollSummary> {
  if (!isHostbillConfigured()) {
    return {
      configured: false,
      fetched: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      lastOrderId: null,
    };
  }

  const state = await prisma.hostbillSyncState.findUnique({
    where: { key: SYNC_KEY },
  });
  const cursor = state?.lastOrderId ?? 0;

  const orders = await getOrders();
  const nieuwe = orders.filter((o) => o.orderId > cursor);

  let created = 0;
  let skipped = 0;
  let errors = 0;
  let maxOrderId = cursor;

  for (const order of nieuwe) {
    try {
      const result = await processOrder(order);
      if (result.status === "created") created++;
      else skipped++;
    } catch {
      errors++;
    }
    if (order.orderId > maxOrderId) maxOrderId = order.orderId;
  }

  await prisma.hostbillSyncState.upsert({
    where: { key: SYNC_KEY },
    update: { lastOrderId: maxOrderId, lastPolledAt: new Date() },
    create: {
      key: SYNC_KEY,
      lastOrderId: maxOrderId,
      lastPolledAt: new Date(),
    },
  });

  return {
    configured: true,
    fetched: orders.length,
    created,
    skipped,
    errors,
    lastOrderId: maxOrderId,
  };
}

/** Maakt een upsell-order aan in HostBill voor een opgebruikte kaart. */
export async function createUpsellForCard(cardId: string): Promise<void> {
  const card = await prisma.strippenkaart.findUnique({
    where: { id: cardId },
    include: { customer: true, cardType: true },
  });
  if (!card) return;
  if (!card.customer.hostbillClientId || !card.cardType.hostbillProductId) {
    return;
  }
  await createUpsellOrder(
    card.customer.hostbillClientId,
    card.cardType.hostbillProductId,
  );
}
