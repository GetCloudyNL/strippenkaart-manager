import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { TimeEntryForm } from "../time-entry-form";
import { updateTimeEntry } from "../actions";

export default async function EditTimeEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const { id } = await params;
  const [entry, projects] = await Promise.all([
    prisma.timeEntry.findUnique({ where: { id } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      include: { customer: true },
    }),
  ]);
  if (!entry) notFound();
  // Boekingen die direct op een strippenkaart staan (zonder project) bewerk je
  // op de kaartpagina.
  if (!entry.projectId) {
    redirect(entry.strippenkaartId ? `/cards/${entry.strippenkaartId}` : "/time");
  }

  const action = updateTimeEntry.bind(null, entry.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Boeking bewerken" />
      <TimeEntryForm
        action={action}
        projects={projects.map((p) => ({
          id: p.id,
          label: `${p.name} (${p.customer.name})`,
        }))}
        entry={{
          projectId: entry.projectId,
          date: entry.date.toISOString().slice(0, 10),
          description: entry.description,
          hours: Math.floor(entry.rawMinutes / 60),
          minutes: entry.rawMinutes % 60,
          ticketRef: entry.ticketRef,
        }}
      />
    </div>
  );
}
