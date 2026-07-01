import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { TimeEntryForm } from "../time-entry-form";
import { createTimeEntry } from "../actions";

export default async function NewTimeEntryPage() {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: { customer: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Nieuwe boeking" />
      {projects.length === 0 ? (
        <p className="text-sm text-muted">
          Maak eerst een{" "}
          <Link href="/projects/new" className="text-primary hover:underline">
            project
          </Link>{" "}
          aan.
        </p>
      ) : (
        <TimeEntryForm
          action={createTimeEntry}
          projects={projects.map((p) => ({
            id: p.id,
            label: `${p.name} (${p.customer.name})`,
          }))}
        />
      )}
    </div>
  );
}
