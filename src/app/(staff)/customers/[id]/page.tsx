import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../customer-form";
import { updateCustomer } from "../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const action = updateCustomer.bind(null, customer.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Klant bewerken: ${customer.name}`} />
      <CustomerForm
        action={action}
        customer={{
          name: customer.name,
          company: customer.company,
          email: customer.email,
          type: customer.type,
          notifyOnCompletion: customer.notifyOnCompletion,
        }}
      />
    </div>
  );
}
