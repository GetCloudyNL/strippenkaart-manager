import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Db = Pick<typeof prisma, "auditLog">;

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}

/**
 * Legt een gebeurtenis vast in de audit log. Best-effort: een fout hier mag de
 * onderliggende actie nooit laten falen.
 */
export async function logAudit(input: AuditInput, db: Db = prisma): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: input.meta,
      },
    });
  } catch {
    // audit mag nooit de hoofdactie blokkeren
  }
}

/** Nederlandse labels voor bekende audit-acties. */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  CARD_CREATED: "Strippenkaart aangemaakt",
  CARD_CANCELLED: "Strippenkaart geannuleerd",
  CARD_DEPLETED: "Strippenkaart opgebruikt",
  TIME_CREATED: "Boeking aangemaakt",
  TIME_UPDATED: "Boeking gewijzigd",
  TIME_DELETED: "Boeking verwijderd",
  ENTRIES_BILLED: "Boekingen gefactureerd",
};
