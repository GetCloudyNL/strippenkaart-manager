import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AUDIT_ACTION_LABEL } from "@/lib/audit";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "short",
  timeStyle: "short",
});

function metaSummary(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");
}

export default async function AuditPage() {
  await requireRole("ADMIN");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Belangrijke gebeurtenissen in het systeem (laatste 100)."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Wanneer</th>
              <th className="px-4 py-3 font-medium">Wie</th>
              <th className="px-4 py-3 font-medium">Actie</th>
              <th className="px-4 py-3 font-medium">Entiteit</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  {dateFmt.format(log.createdAt)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {log.user?.name ?? "systeem"}
                </td>
                <td className="px-4 py-3">
                  {AUDIT_ACTION_LABEL[log.action] ?? log.action}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">
                  {log.entity}
                  {log.entityId ? (
                    <span className="block text-xs">{log.entityId}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {metaSummary(log.meta)}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nog geen gebeurtenissen vastgelegd.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
