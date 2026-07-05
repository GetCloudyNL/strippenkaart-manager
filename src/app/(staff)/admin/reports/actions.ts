"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { runMonthlyReports, runAlerts } from "@/lib/reports";

export type ReportState = { message?: string; error?: string } | undefined;

export async function triggerMonthly(): Promise<ReportState> {
  await requireRole("ADMIN");
  try {
    const sent = await runMonthlyReports();
    revalidatePath("/admin/reports");
    return { message: `Maandoverzichten in de wachtrij gezet: ${sent}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Mislukt" };
  }
}

export async function triggerAlerts(): Promise<ReportState> {
  await requireRole("ADMIN");
  try {
    const res = await runAlerts();
    revalidatePath("/admin/reports");
    return {
      message: `Alerts in de wachtrij: laag saldo ${res.lowBalance}, vervaldatum ${res.expiry}`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Mislukt" };
  }
}
