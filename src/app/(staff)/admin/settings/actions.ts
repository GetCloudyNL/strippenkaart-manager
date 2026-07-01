"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { updateHourlyRates } from "@/lib/settings";

const ratesSchema = z.object({
  customer: z.coerce.number().min(0, "Ongeldig tarief"),
  nonCustomer: z.coerce.number().min(0, "Ongeldig tarief"),
});

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function saveRates(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireRole("ADMIN");
  const parsed = ratesSchema.safeParse({
    customer: String(formData.get("customer") ?? "").replace(",", "."),
    nonCustomer: String(formData.get("nonCustomer") ?? "").replace(",", "."),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await updateHourlyRates(parsed.data);
  revalidatePath("/admin/settings");
  revalidatePath("/projects");
  revalidatePath("/time");
  return { success: true };
}
