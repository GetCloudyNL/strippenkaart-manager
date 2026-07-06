import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getHourlyRates } from "@/lib/settings";
import { resolveHourlyRate, amountForMinutes } from "@/lib/rates";
import { parseExportFilter, buildExportWhere } from "../query";

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function nl(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function csvField(value: string | number): string {
  const s = String(value);
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const filter = parseExportFilter({
    customerId: url.searchParams.get("customerId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    unbilled: url.searchParams.get("unbilled") ?? undefined,
  });

  const [entries, rates] = await Promise.all([
    prisma.timeEntry.findMany({
      where: buildExportWhere(filter),
      include: { project: { include: { customer: true } }, user: true },
      orderBy: { date: "asc" },
    }),
    getHourlyRates(),
  ]);

  const header = [
    "Datum",
    "Klant",
    "Project",
    "Omschrijving",
    "Ticket",
    "Uren",
    "Tarief",
    "Bedrag",
    "Gefactureerd",
    "Medewerker",
  ];

  const lines = [header.map(csvField).join(";")];
  for (const e of entries) {
    const rate = resolveHourlyRate(
      e.project.hourlyRate ? Number(e.project.hourlyRate) : null,
      e.project.customer.type,
      rates,
    );
    const amount = amountForMinutes(e.chargedMinutes, rate);
    lines.push(
      [
        dateFmt.format(e.date),
        e.project.customer.name,
        e.project.name,
        e.description,
        e.ticketRef ?? "",
        nl(e.chargedMinutes / 60),
        nl(rate),
        nl(amount),
        e.billed ? "ja" : "nee",
        e.user.name,
      ]
        .map(csvField)
        .join(";"),
    );
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="facturatie-export-${stamp}.csv"`,
    },
  });
}
