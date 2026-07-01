"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const cardSchema = z.object({
  customerId: z.string().min(1, "Kies een klant"),
  cardTypeId: z.string().min(1, "Kies een kaarttype"),
  projectId: z.string().optional(),
  purchasedAt: z.string().optional(),
});

export type CardFormState = { error?: string } | undefined;

export async function createCard(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = cardSchema.safeParse({
    customerId: formData.get("customerId"),
    cardTypeId: formData.get("cardTypeId"),
    projectId: formData.get("projectId") || undefined,
    purchasedAt: formData.get("purchasedAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const cardType = await prisma.cardType.findUnique({
    where: { id: parsed.data.cardTypeId },
  });
  if (!cardType) return { error: "Kaarttype niet gevonden." };

  const purchasedAt = parsed.data.purchasedAt
    ? new Date(parsed.data.purchasedAt)
    : new Date();
  const expiresAt = cardType.validityMonths
    ? addMonths(purchasedAt, cardType.validityMonths)
    : null;

  await prisma.strippenkaart.create({
    data: {
      customerId: parsed.data.customerId,
      projectId: parsed.data.projectId || null,
      cardTypeId: cardType.id,
      totalMinutes: cardType.totalMinutes,
      remainingMinutes: cardType.totalMinutes,
      roundingIncrementMin: cardType.roundingIncrementMin,
      roundingDirection: cardType.roundingDirection,
      minimumPerEntryMin: cardType.minimumPerEntryMin,
      purchasedAt,
      expiresAt,
    },
  });

  revalidatePath("/cards");
  redirect("/cards");
}

export async function cancelCard(id: string): Promise<void> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  await prisma.strippenkaart.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  redirect(`/cards/${id}`);
}
