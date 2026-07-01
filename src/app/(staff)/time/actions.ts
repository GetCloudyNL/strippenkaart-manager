"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const timeEntrySchema = z.object({
  projectId: z.string().min(1, "Kies een project"),
  date: z.string().min(1, "Datum is verplicht"),
  description: z.string().trim().min(1, "Omschrijving is verplicht"),
  hours: z.coerce.number().int().min(0).max(1000),
  minutes: z.coerce.number().int().min(0).max(59),
  ticketRef: z.string().trim().optional(),
});

export type TimeEntryFormState = { error?: string } | undefined;

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
  if (rawMinutes <= 0) {
    return { error: "Duur moet groter zijn dan 0." };
  }

  // Strippenkaart-afschrijving en afronding volgen in fase 3; voorlopig is
  // het afgeschreven aantal gelijk aan de ruwe tijd.
  await prisma.timeEntry.create({
    data: {
      projectId,
      userId: session.user.id,
      date: new Date(date),
      description,
      rawMinutes,
      chargedMinutes: rawMinutes,
      ticketRef: ticketRef || null,
    },
  });
  revalidatePath("/time");
  redirect("/time");
}

export async function updateTimeEntry(
  id: string,
  _prev: TimeEntryFormState,
  formData: FormData,
): Promise<TimeEntryFormState> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }
  const { projectId, date, description, hours, minutes, ticketRef } =
    parsed.data;
  const rawMinutes = hours * 60 + minutes;
  if (rawMinutes <= 0) {
    return { error: "Duur moet groter zijn dan 0." };
  }

  await prisma.timeEntry.update({
    where: { id },
    data: {
      projectId,
      date: new Date(date),
      description,
      rawMinutes,
      chargedMinutes: rawMinutes,
      ticketRef: ticketRef || null,
    },
  });
  revalidatePath("/time");
  redirect("/time");
}

export async function deleteTimeEntry(id: string): Promise<void> {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/time");
  redirect("/time");
}
