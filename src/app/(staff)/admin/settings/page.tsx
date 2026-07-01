import { requireRole } from "@/lib/auth-helpers";
import { PageHeader, Card } from "@/components/ui";
import { getHourlyRates } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const rates = await getHourlyRates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instellingen"
        description="Standaard uurtarieven voor klanten en niet-klanten."
      />
      <Card>
        <SettingsForm rates={rates} />
      </Card>
    </div>
  );
}
