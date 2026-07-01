import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { CustomerForm } from "../customer-form";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requireRole(["ADMIN", "TECHNICIAN"]);
  return (
    <div className="space-y-6">
      <PageHeader title="Nieuwe klant" />
      <CustomerForm action={createCustomer} />
    </div>
  );
}
