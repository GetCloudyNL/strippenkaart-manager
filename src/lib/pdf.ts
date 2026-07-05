import PDFDocument from "pdfkit";
import { formatMinutes } from "./rounding";

export interface MonthlySummaryData {
  customerName: string;
  monthLabel: string;
  entries: {
    dateLabel: string;
    projectName: string;
    description: string;
    minutes: number;
  }[];
  totalMinutes: number;
  cards: { name: string; remainingMinutes: number }[];
}

export interface CardOverviewData {
  customerName: string;
  cardTypeName: string;
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  purchasedAtLabel: string;
  expiresAtLabel: string;
  entries: {
    dateLabel: string;
    projectName: string;
    description: string;
    minutes: number;
  }[];
}

export function generateCardOverviewPdf(
  data: CardOverviewData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.fontSize(18).text(`Strippenkaart – ${data.cardTypeName}`);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#64748b").text(data.customerName);
    doc.fillColor("#000000").moveDown(1);

    doc.fontSize(10);
    doc.text(`Totaal: ${formatMinutes(data.totalMinutes)}`);
    doc.text(`Verbruikt: ${formatMinutes(data.usedMinutes)}`);
    doc.text(`Resterend: ${formatMinutes(data.remainingMinutes)}`);
    doc.text(`Aangekocht: ${data.purchasedAtLabel}`);
    doc.text(`Vervalt: ${data.expiresAtLabel}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Boekingen");
    doc.moveDown(0.5);

    const cols = {
      date: left,
      project: left + 80,
      desc: left + 210,
      time: left + width - 70,
    };
    doc.fontSize(10).fillColor("#64748b");
    const headerY = doc.y;
    doc.text("Datum", cols.date, headerY);
    doc.text("Project", cols.project, headerY);
    doc.text("Omschrijving", cols.desc, headerY);
    doc.text("Tijd", cols.time, headerY, { width: 70, align: "right" });
    doc.fillColor("#000000").moveDown(0.5);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.3);

    if (data.entries.length === 0) {
      doc.fontSize(10).fillColor("#64748b").text("Geen boekingen.");
      doc.fillColor("#000000");
    } else {
      doc.fontSize(10);
      for (const e of data.entries) {
        const y = doc.y;
        doc.text(e.dateLabel, cols.date, y, { width: 75 });
        doc.text(e.projectName, cols.project, y, { width: 125 });
        doc.text(e.description, cols.desc, y, {
          width: cols.time - cols.desc - 10,
        });
        doc.text(formatMinutes(e.minutes), cols.time, y, {
          width: 70,
          align: "right",
        });
        doc.moveDown(0.5);
      }
    }

    doc.end();
  });
}

export function generateMonthlySummaryPdf(
  data: MonthlySummaryData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(`Maandoverzicht ${data.monthLabel}`);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#64748b").text(data.customerName);
    doc.fillColor("#000000").moveDown(1);

    // Kolomindeling
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const cols = {
      date: left,
      project: left + 80,
      desc: left + 210,
      time: left + width - 70,
    };

    doc.fontSize(10).fillColor("#64748b");
    doc.text("Datum", cols.date, doc.y, { continued: false });
    const headerY = doc.y - 12;
    doc.text("Project", cols.project, headerY);
    doc.text("Omschrijving", cols.desc, headerY);
    doc.text("Tijd", cols.time, headerY, { width: 70, align: "right" });
    doc.fillColor("#000000").moveDown(0.5);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.3);

    if (data.entries.length === 0) {
      doc.fontSize(10).fillColor("#64748b").text("Geen werkzaamheden.");
      doc.fillColor("#000000");
    } else {
      doc.fontSize(10);
      for (const e of data.entries) {
        const y = doc.y;
        doc.text(e.dateLabel, cols.date, y, { width: 75 });
        doc.text(e.projectName, cols.project, y, { width: 125 });
        doc.text(e.description, cols.desc, y, { width: cols.time - cols.desc - 10 });
        doc.text(formatMinutes(e.minutes), cols.time, y, {
          width: 70,
          align: "right",
        });
        doc.moveDown(0.5);
      }
    }

    doc.moveDown(0.5);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .text("Totaal", cols.desc, doc.y, { continued: true })
      .text(formatMinutes(data.totalMinutes), cols.time, doc.y, {
        width: 70,
        align: "right",
      });

    if (data.cards.length > 0) {
      doc.moveDown(1.5);
      doc.fontSize(12).text("Huidig saldo");
      doc.moveDown(0.3).fontSize(10);
      for (const c of data.cards) {
        doc.text(`${c.name}: ${formatMinutes(c.remainingMinutes)}`);
      }
    }

    doc.end();
  });
}
