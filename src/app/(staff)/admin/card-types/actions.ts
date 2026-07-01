"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const cardTypeSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht"),
  totalHours: z.coerce.number().positive("Aantal uren moet groter zijn dan 0"),
  price: z.coerce.number().min(0, "Ongeldige prijs"),
  roundingIncrementMin: z.coerce.number().int().min(1).max(240),
  roundingDirection: z.enum(["UP", "NEAREST", "DOWN"]),
  minimumPerEntryMin: z.coerce.number().int().min(0).max(1440),
  validityMonths: z
    .union([z.string(), z.null()])
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    }),
  hostbillProductId: z
    .union([z.string(), z.null()])
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isInteger(n) && n > 0 ? n : null;
    }),
  termsText: z.string().trim().optional(),
  active: z.boolean(),
});

export type CardTypeFormState = { error?: string } | undefined;

function parse(formData: FormData) {
  return cardTypeSchema.safeParse({
    name: formData.get("name"),
    totalHours: String(formData.get("totalHours") ?? "").replace(",", "."),
    price: String(formData.get("price") ?? "").replace(",", "."),
    roundingIncrementMin: formData.get("roundingIncrementMin"),
    roundingDirection: formData.get("roundingDirection"),
    minimumPerEntryMin: formData.get("minimumPerEntryMin") || 0,
    validityMonths: (formData.get("validityMonths") as string | null) ?? null,
    hostbillProductId:
      (formData.get("hostbillProductId") as string | null) ?? null,
    termsText: formData.get("termsText") || undefined,
    active: formData.get("active") === "on",
  });
}

function toData(input: z.infer<typeof cardTypeSchema>) {
  return {
    name: input.name,
    totalMinutes: Math.round(input.totalHours * 60),
    price: input.price,
    roundingIncrementMin: input.roundingIncrementMin,
    roundingDirection: input.roundingDirection,
    minimumPerEntryMin: input.minimumPerEntryMin,
    validityMonths: input.validityMonths,
    hostbillProductId: input.hostbillProductId,
    termsText: input.termsText || null,
    active: input.active,
  };
}

export async function createCardType(
  _prev: CardTypeFormState,
  formData: FormData,
): Promise<CardTypeFormState> {
  await requireRole("ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await prisma.cardType.create({ data: toData(parsed.data) });
  revalidatePath("/admin/card-types");
  redirect("/admin/card-types");
}

export async function updateCardType(
  id: string,
  _prev: CardTypeFormState,
  formData: FormData,
): Promise<CardTypeFormState> {
  await requireRole("ADMIN");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  await prisma.cardType.update({ where: { id }, data: toData(parsed.data) });
  revalidatePath("/admin/card-types");
  redirect("/admin/card-types");
}
