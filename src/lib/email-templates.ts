import { formatMinutes } from "./rounding";

export interface RenderedEmail {
  subject: string;
  html: string;
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="nl">
<body style="margin:0;background:#f7f6f1;font-family:Arial,Helvetica,sans-serif;color:#021f18;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border:1px solid #e6e2d6;border-radius:12px;border-top:4px solid #fbc202;padding:24px;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#021f18;">${title}</h1>
      ${body}
    </div>
    <p style="color:#64748b;font-size:12px;margin:16px 4px;">
      Deze e-mail is automatisch verstuurd door LemonCap.
    </p>
  </div>
</body>
</html>`;
}

export function workCompletedEmail(input: {
  customerName: string;
  cardTypeName: string;
  description: string;
  chargedMinutes: number;
  remainingMinutes: number;
  lowThresholdMin: number;
}): RenderedEmail {
  const low = input.remainingMinutes < input.lowThresholdMin;
  const remainingColor = input.remainingMinutes < 0 ? "#dc2626" : "#0f172a";
  const body = `
    <p>Beste ${input.customerName},</p>
    <p>Er zijn werkzaamheden afgerond op uw strippenkaart <strong>${input.cardTypeName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
      <tr><td style="padding:6px 0;color:#64748b;">Werkzaamheden</td><td style="padding:6px 0;text-align:right;">${input.description}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Afgeschreven</td><td style="padding:6px 0;text-align:right;">${formatMinutes(input.chargedMinutes)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Resterend saldo</td><td style="padding:6px 0;text-align:right;color:${remainingColor};font-weight:bold;">${formatMinutes(input.remainingMinutes)}</td></tr>
    </table>
    ${low ? `<p style="color:#b45309;">Let op: uw resterende saldo is laag. Neem gerust contact op om uw strippenkaart aan te vullen.</p>` : ""}
  `;
  return {
    subject: `Werkzaamheden afgerond – resterend saldo ${formatMinutes(input.remainingMinutes)}`,
    html: layout("Werkzaamheden afgerond", body),
  };
}

export function lowBalanceEmail(input: {
  customerName: string;
  cardTypeName: string;
  remainingMinutes: number;
}): RenderedEmail {
  const body = `
    <p>Beste ${input.customerName},</p>
    <p>Het saldo van uw strippenkaart <strong>${input.cardTypeName}</strong> is laag: nog <strong>${formatMinutes(input.remainingMinutes)}</strong> beschikbaar.</p>
    <p>Neem gerust contact op om uw tegoed aan te vullen zodat support gewaarborgd blijft.</p>
  `;
  return {
    subject: `Laag saldo op uw strippenkaart (${formatMinutes(input.remainingMinutes)})`,
    html: layout("Laag saldo", body),
  };
}

export function expiryReminderEmail(input: {
  customerName: string;
  cardTypeName: string;
  remainingMinutes: number;
  expiresAtLabel: string;
}): RenderedEmail {
  const body = `
    <p>Beste ${input.customerName},</p>
    <p>Uw strippenkaart <strong>${input.cardTypeName}</strong> verloopt op <strong>${input.expiresAtLabel}</strong>.</p>
    <p>U heeft nog <strong>${formatMinutes(input.remainingMinutes)}</strong> tegoed. Maak hier gerust nog gebruik van of neem contact op voor verlenging.</p>
  `;
  return {
    subject: `Uw strippenkaart verloopt op ${input.expiresAtLabel}`,
    html: layout("Strippenkaart verloopt binnenkort", body),
  };
}

export function monthlySummaryEmail(input: {
  customerName: string;
  monthLabel: string;
  entries: { dateLabel: string; projectName: string; description: string; minutes: number }[];
  totalMinutes: number;
  cards: { name: string; remainingMinutes: number }[];
}): RenderedEmail {
  const rows = input.entries
    .map(
      (e) => `
      <tr>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0;">${e.dateLabel}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0;">${e.projectName}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0;">${e.description}</td>
        <td style="padding:6px 8px;border-top:1px solid #e2e8f0;text-align:right;">${formatMinutes(e.minutes)}</td>
      </tr>`,
    )
    .join("");

  const cardsHtml = input.cards.length
    ? `<p style="margin-top:16px;">Huidig saldo:</p><ul>${input.cards
        .map(
          (c) =>
            `<li>${c.name}: <strong>${formatMinutes(c.remainingMinutes)}</strong></li>`,
        )
        .join("")}</ul>`
    : "";

  const body = `
    <p>Beste ${input.customerName},</p>
    <p>Hierbij het overzicht van de verrichte werkzaamheden in ${input.monthLabel}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">
      <thead>
        <tr style="text-align:left;color:#64748b;">
          <th style="padding:6px 8px;">Datum</th>
          <th style="padding:6px 8px;">Project</th>
          <th style="padding:6px 8px;">Omschrijving</th>
          <th style="padding:6px 8px;text-align:right;">Tijd</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="4" style="padding:8px;color:#64748b;">Geen werkzaamheden.</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:6px 8px;border-top:2px solid #e2e8f0;font-weight:bold;">Totaal</td>
          <td style="padding:6px 8px;border-top:2px solid #e2e8f0;text-align:right;font-weight:bold;">${formatMinutes(input.totalMinutes)}</td>
        </tr>
      </tfoot>
    </table>
    ${cardsHtml}
    <p style="margin-top:16px;">Het volledige overzicht vindt u in de bijgevoegde PDF.</p>
  `;
  return {
    subject: `Maandoverzicht ${input.monthLabel}`,
    html: layout(`Maandoverzicht ${input.monthLabel}`, body),
  };
}
