"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { pollHostbillOrders, type PollSummary } from "@/lib/hostbill-sync";

export type SyncState =
  | { ok: true; summary: PollSummary }
  | { ok: false; error: string }
  | undefined;

export async function runSync(): Promise<SyncState> {
  await requireRole("ADMIN");
  try {
    const summary = await pollHostbillOrders();
    revalidatePath("/admin/hostbill");
    revalidatePath("/cards");
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Synchronisatie mislukt",
    };
  }
}
