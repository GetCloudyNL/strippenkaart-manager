import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui";
import { CardTypeForm } from "../card-type-form";
import { createCardType } from "../actions";

export default async function NewCardTypePage() {
  await requireRole("ADMIN");
  return (
    <div className="space-y-6">
      <PageHeader title="Nieuw kaarttype" />
      <CardTypeForm action={createCardType} />
    </div>
  );
}
