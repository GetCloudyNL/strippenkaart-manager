import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Beheerder",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin klaar: ${admin.email}`);

  const cardTypes = [
    { name: "Strippenkaart 4 uur", totalMinutes: 240, price: "300.00" },
    { name: "Strippenkaart 8 uur", totalMinutes: 480, price: "560.00" },
    { name: "Strippenkaart 12 uur", totalMinutes: 720, price: "780.00" },
  ];

  for (const ct of cardTypes) {
    const existing = await prisma.cardType.findFirst({
      where: { name: ct.name },
    });
    if (existing) continue;
    await prisma.cardType.create({
      data: {
        name: ct.name,
        totalMinutes: ct.totalMinutes,
        price: ct.price,
        roundingIncrementMin: 15,
        roundingDirection: "UP",
        minimumPerEntryMin: 15,
        validityMonths: 12,
        termsText:
          "Tijd wordt per 15 minuten naar boven afgerond, met een minimum van 15 minuten per registratie. Geldig 12 maanden na aankoop.",
      },
    });
    console.log(`Kaarttype aangemaakt: ${ct.name}`);
  }

  const settings = [
    { key: "HOURLY_RATE_CUSTOMER", value: "95" },
    { key: "HOURLY_RATE_NON_CUSTOMER", value: "125" },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("Standaard uurtarieven ingesteld.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
