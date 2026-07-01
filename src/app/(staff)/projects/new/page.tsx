import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "../project-form";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Nieuw project" />
      {customers.length === 0 ? (
        <p className="text-sm text-muted">
          Maak eerst een{" "}
          <Link href="/customers/new" className="text-primary hover:underline">
            klant
          </Link>{" "}
          aan.
        </p>
      ) : (
        <ProjectForm action={createProject} customers={customers} />
      )}
    </div>
  );
}
