import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "../project-form";
import { updateProject } from "../actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const { id } = await params;
  const [project, customers] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!project) notFound();

  const action = updateProject.bind(null, project.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Project bewerken: ${project.name}`} />
      <ProjectForm
        action={action}
        customers={customers}
        project={{
          customerId: project.customerId,
          name: project.name,
          billingType: project.billingType,
          hourlyRate: project.hourlyRate ? String(project.hourlyRate) : null,
          status: project.status,
        }}
      />
    </div>
  );
}
