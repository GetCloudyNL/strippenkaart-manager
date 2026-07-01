"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  company: z.string().trim().optional(),
  email: z.string().trim().email("Ongeldig e-mailadres"),
  type: z.enum(["CUSTOMER", "NON_CUSTOMER"]),
  notifyOnCompletion: z.boolean(),
});

export type CustomerFormState = { error?: string } | undefined;

function parse(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") || undefined,
    email: formData.get("email"),
    type: formData.get("type"),
    notifyOnCompletion: formData.get("notifyOnCompletion") === "on",
  });
}

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await prisma.customer.create({ data: parsed.data });
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  id: string,
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await prisma.customer.update({ where: { id }, data: parsed.data });
  revalidatePath("/customers");
  redirect("/customers");
}
