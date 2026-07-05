import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isMailConfigured } from "@/lib/mail";
import { PageHeader, Card } from "@/components/ui";
import { ReportButtons } from "./report-buttons";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "short",
  timeStyle: "short",
});

const TYPE_LABEL: Record<string, string> = {
  WORK_COMPLETED: "Werk afgerond",
  MONTHLY_SUMMARY: "Maandoverzicht",
  LOW_BALANCE: "Laag saldo",
  EXPIRY_REMINDER: "Vervaldatum",
};

const STATUS_CLASS: Record<string, string> = {
  SENT: "text-green-600",
  PENDING: "text-amber-600",
  FAILED: "text-red-600",
};

export default async function ReportsPage() {
  await requireRole("ADMIN");
  const [configured, logs] = await Promise.all([
    isMailConfigured(),
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapporten &amp; mail"
        description="Maandoverzichten, alerts en verstuurde e-mails."
      />

      <Card>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">SMTP-status:</span>
          {configured ? (
            <span className="text-green-600">Geconfigureerd</span>
          ) : (
            <span className="text-red-600">Niet geconfigureerd</span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          E-mails worden via de wachtrij verstuurd. De worker verstuurt ze en
          werkt de status hieronder bij. Maandoverzichten (1e van de maand) en
          dagelijkse alerts worden automatisch ingepland als{" "}
          <code>REPORTS_ENABLED=true</code>.
        </p>
        <div className="mt-4">
          <ReportButtons />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Recente e-mails</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">Nog geen e-mails.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 pr-2">Datum</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">Aan</th>
                <th className="py-1 pr-2">Onderwerp</th>
                <th className="py-1 pr-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border align-top">
                  <td className="py-1 pr-2 whitespace-nowrap">
                    {dateFmt.format(log.createdAt)}
                  </td>
                  <td className="py-1 pr-2">
                    {TYPE_LABEL[log.type] ?? log.type}
                  </td>
                  <td className="py-1 pr-2">{log.to}</td>
                  <td className="py-1 pr-2">{log.subject}</td>
                  <td className={`py-1 pr-2 ${STATUS_CLASS[log.status] ?? ""}`}>
                    {log.status}
                    {log.error ? (
                      <span className="block text-xs text-red-600">
                        {log.error}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
