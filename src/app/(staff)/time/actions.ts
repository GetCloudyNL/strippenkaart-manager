"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import {
  pickActiveCard,
  deductFromCard,
  reverseFromCard,
} from "@/lib/strippenkaart";
import { sendWorkCompletedMail } from "@/lib/notify";

class NoCardError extends Error {}

const timeEntrySchema = z.object({
  projectId: z.string().min(1, "Kies een project"),
  date: z.string().min(1, "Datum is verplicht"),
  description: z.string().trim().min(1, "Omschrijving is verplicht"),
  hours: z.coerce.number().int().min(0).max(1000),
  minutes: z.coerce.number().int().min(0).max(59),
  ticketRef: z.string().trim().optional(),
});

export type TimeEntryFormState = { error?: string } | undefined;

const NO_CARD_MESSAGE =
  "Geen actieve strippenkaart voor deze klant/dit project. Maak eerst een strippenkaart aan.";

function parse(formData: FormData) {
  return timeEntrySchema.safeParse({
    projectId: formData.get("projectId"),
    date: formData.get("date"),
    description: formData.get("description"),
    hours: formData.get("hours") || 0,
    minutes: formData.get("minutes") || 0,
    ticketRef: formData.get("ticketRef") || undefined,
  });
}

export async function createTimeEntry(
  _prev: TimeEntryFormState,
  formData: FormData,
): Promise<TimeEntryFormState> {
  const session = await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { projectId, date, description, hours, minutes, ticketRef } =
    parsed.data;
  const rawMinutes = hours * 60 + minutes;
  if (rawMinutes <= 0) return { error: "Duur moet groter zijn dan 0." };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project niet gevonden." };

  let createdId: string | null = null;
  let isStrippenkaart = false;
  try {
    await prisma.$transaction(async (tx) => {
      let chargedMinutes = rawMinutes;
      let strippenkaartId: string | null = null;

      if (project.billingType === "STRIPPENKAART") {
        const card = await pickActiveCard(tx, project);
        if (!card) throw new NoCardError();
        chargedMinutes = await deductFromCard(
          tx,
          card,
          rawMinutes,
          session.user.id,
        );
        strippenkaartId = card.id;
        isStrippenkaart = true;
      }

      const created = await tx.timeEntry.create({
        data: {
          projectId,
          userId: session.user.id,
          date: new Date(date),
          description,
          rawMinutes,
          chargedMinutes,
          strippenkaartId,
          ticketRef: ticketRef || null,
        },
      });
      createdId = created.id;
    });
  } catch (e) {
    if (e instanceof NoCardError) return { error: NO_CARD_MESSAGE };
    throw e;
  }

  // Best-effort: mail met restant na afronden werkzaamheden.
  if (createdId && isStrippenkaart) {
    try {
      await sendWorkCompletedMail(createdId);
    } catch {
      // mailfout mag het boeken niet blokkeren
    }
  }

  revalidatePath("/time");
  revalidatePath("/cards");
  redirect("/time");
}

export async function updateTimeEntry(
  id: string,
  _prev: TimeEntryFormState,
  formData: FormData,
): Promise<TimeEntryFormState> {
  const session = await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { projectId, date, description, hours, minutes, ticketRef } =
    parsed.data;
  const rawMinutes = hours * 60 + minutes;
  if (rawMinutes <= 0) return { error: "Duur moet groter zijn dan 0." };

  const [existing, project] = await Promise.all([
    prisma.timeEntry.findUnique({ where: { id } }),
    prisma.project.findUnique({ where: { id: projectId } }),
  ]);
  if (!existing) return { error: "Boeking niet gevonden." };
  if (!project) return { error: "Project niet gevonden." };

  try {
    await prisma.$transaction(async (tx) => {
      // Oude afschrijving terugboeken.
      if (existing.strippenkaartId) {
        await reverseFromCard(
          tx,
          existing.strippenkaartId,
          existing.chargedMinutes,
        );
      }

      let chargedMinutes = rawMinutes;
      let strippenkaartId: string | null = null;

      if (project.billingType === "STRIPPENKAART") {
        const card = await pickActiveCard(tx, project);
        if (!card) throw new NoCardError();
        chargedMinutes = await deductFromCard(
          tx,
          card,
          rawMinutes,
          session.user.id,
        );
        strippenkaartId = card.id;
      }

      await tx.timeEntry.update({
        where: { id },
        data: {
          projectId,
          date: new Date(date),
          description,
          rawMinutes,
          chargedMinutes,
          strippenkaartId,
          ticketRef: ticketRef || null,
        },
      });
    });
  } catch (e) {
    if (e instanceof NoCardError) return { error: NO_CARD_MESSAGE };
    throw e;
  }

  revalidatePath("/time");
  revalidatePath("/cards");
  redirect("/time");
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const existing = await prisma.timeEntry.findUnique({ where: { id } });
  if (existing) {
    await prisma.$transaction(async (tx) => {
      if (existing.strippenkaartId) {
        await reverseFromCard(
          tx,
          existing.strippenkaartId,
          existing.chargedMinutes,
        );
      }
      await tx.timeEntry.delete({ where: { id } });
    });
  }
  revalidatePath("/time");
  revalidatePath("/cards");
  redirect("/time");
}
