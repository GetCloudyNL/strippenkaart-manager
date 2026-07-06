"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseExportFilter, buildExportWhere } from "./query";

export type MarkBilledState = { message?: string; error?: string } | undefined;

export async function markBilled(
  _prev: MarkBilledState,
  formData: FormData,
): Promise<MarkBilledState> {
  const session = await requireRole("ADMIN");
  const filter = parseExportFilter({
    customerId: (formData.get("customerId") as string) || undefined,
    from: (formData.get("from") as string) || undefined,
    to: (formData.get("to") as string) || undefined,
    unbilled: "1",
  });

  const where = buildExportWhere(filter);
  const result = await prisma.timeEntry.updateMany({
    where,
    data: { billed: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "ENTRIES_BILLED",
    entity: "TimeEntry",
    meta: { count: result.count, ...filter },
  });

  revalidatePath("/admin/export");
  return {
    message: `${result.count} boeking(en) gemarkeerd als gefactureerd.`,
  };
}
