import { prisma } from "@/lib/prisma";
import { calculateChargedMinutes } from "@/lib/rounding";
import { hostbillQueue } from "@/lib/queue";

// Interactieve transactie-client (Prisma). We laten de lifecycle-methodes weg
// zodat zowel `prisma` als de transactie-client hieraan voldoen.
export type Tx = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

interface ProjectRef {
  id: string;
  customerId: string;
}

/**
 * Kiest de strippenkaart waarvan afgeschreven moet worden voor een project:
 * eerst een kaart die direct aan het project hangt, anders een kaart van de
 * klant. Alleen actieve kaarten, FIFO op vervaldatum (eerst wat het eerst
 * verloopt), daarna op aankoopdatum.
 */
export async function pickActiveCard(tx: Tx, project: ProjectRef) {
  return tx.strippenkaart.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        { projectId: project.id },
        { projectId: null, customerId: project.customerId },
      ],
    },
    orderBy: [
      { expiresAt: { sort: "asc", nulls: "last" } },
      { purchasedAt: "asc" },
    ],
  });
}

interface DeductableCard {
  id: string;
  remainingMinutes: number;
  status: "ACTIVE" | "DEPLETED" | "EXPIRED" | "CANCELLED";
  roundingIncrementMin: number;
  roundingDirection: "UP" | "NEAREST" | "DOWN";
  minimumPerEntryMin: number;
}

/**
 * Schrijft ruwe tijd af van een kaart volgens de (gesnapshotte)
 * afrondingsregels. Negatief saldo is toegestaan; zodra het saldo op of onder
 * nul komt wordt de kaart als opgebruikt gemarkeerd en een upsell-trigger
 * vastgelegd. Retourneert het afgeschreven aantal minuten.
 */
export async function deductFromCard(
  tx: Tx,
  card: DeductableCard,
  rawMinutes: number,
  actorId?: string,
): Promise<number> {
  const charged = calculateChargedMinutes(rawMinutes, {
    roundingIncrementMin: card.roundingIncrementMin,
    roundingDirection: card.roundingDirection,
    minimumPerEntryMin: card.minimumPerEntryMin,
  });
  const newRemaining = card.remainingMinutes - charged;
  const becameDepleted = card.status === "ACTIVE" && newRemaining <= 0;

  await tx.strippenkaart.update({
    where: { id: card.id },
    data: {
      remainingMinutes: newRemaining,
      status: newRemaining <= 0 ? "DEPLETED" : "ACTIVE",
    },
  });

  if (becameDepleted) {
    await recordDepletion(tx, card.id, newRemaining, actorId);
  }

  return charged;
}

/** Draait een eerdere afschrijving terug (bij bewerken/verwijderen). */
export async function reverseFromCard(
  tx: Tx,
  cardId: string,
  chargedMinutes: number,
): Promise<void> {
  const card = await tx.strippenkaart.findUnique({ where: { id: cardId } });
  if (!card) return;
  const newRemaining = card.remainingMinutes + chargedMinutes;
  const status =
    card.status === "ACTIVE" || card.status === "DEPLETED"
      ? newRemaining > 0
        ? "ACTIVE"
        : "DEPLETED"
      : card.status;
  await tx.strippenkaart.update({
    where: { id: cardId },
    data: { remainingMinutes: newRemaining, status },
  });
}

/**
 * Legt vast dat een kaart is opgebruikt. Dit is de upsell-trigger; in fase 4
 * wordt hier een HostBill-order/factuur van gemaakt.
 */
async function recordDepletion(
  tx: Tx,
  cardId: string,
  remaining: number,
  actorId?: string,
) {
  await tx.auditLog.create({
    data: {
      userId: actorId ?? null,
      action: "CARD_DEPLETED",
      entity: "Strippenkaart",
      entityId: cardId,
      meta: { remainingMinutes: remaining },
    },
  });

  // Best-effort: zet een upsell-job in de wachtrij. Faalt dit (bijv. Redis
  // onbereikbaar), dan blijft de audit-log als trigger staan.
  try {
    await hostbillQueue.add("upsell", { type: "upsell", cardId });
  } catch {
    // stil negeren; de afschrijving mag hier niet op stuklopen
  }
}
