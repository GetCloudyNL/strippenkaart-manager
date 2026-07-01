"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const projectSchema = z.object({
  customerId: z.string().min(1, "Kies een klant"),
  name: z.string().trim().min(1, "Naam is verplicht"),
  billingType: z.enum(["STRIPPENKAART", "HOURLY", "RETAINER", "FIXED_PRICE"]),
  hourlyRate: z
    .union([z.string(), z.null()])
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

export type ProjectFormState = { error?: string } | undefined;

function parse(formData: FormData) {
  return projectSchema.safeParse({
    customerId: formData.get("customerId"),
    name: formData.get("name"),
    billingType: formData.get("billingType"),
    hourlyRate: (formData.get("hourlyRate") as string | null) ?? null,
    status: formData.get("status"),
  });
}

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { hourlyRate, ...rest } = parsed.data;
  await prisma.project.create({
    data: { ...rest, hourlyRate: hourlyRate ?? null },
  });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProject(
  id: string,
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { hourlyRate, ...rest } = parsed.data;
  await prisma.project.update({
    where: { id },
    data: { ...rest, hourlyRate: hourlyRate ?? null },
  });
  revalidatePath("/projects");
  redirect("/projects");
}
