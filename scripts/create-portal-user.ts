import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEV_EMAIL = "portal-test@example.com";
const DEV_PASSWORD = "portal12345";

async function main() {
  // Pak bij voorkeur een klant met een strippenkaart, anders de eerste klant.
  const customer =
    (await prisma.customer.findFirst({
      where: { cards: { some: {} } },
      orderBy: { createdAt: "asc" },
    })) ?? (await prisma.customer.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!customer) {
    console.log("GEEN_KLANT_GEVONDEN — maak eerst een klant (en kaart) aan.");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    update: { customerId: customer.id, role: "CUSTOMER", passwordHash },
    create: {
      email: DEV_EMAIL,
      name: "Portal Test",
      role: "CUSTOMER",
      passwordHash,
      customerId: customer.id,
    },
  });

  const cards = await prisma.strippenkaart.count({
    where: { customerId: customer.id },
  });
  console.log("Portallogin klaar:");
  console.log(`  e-mail:     ${DEV_EMAIL}`);
  console.log(`  wachtwoord: ${DEV_PASSWORD}`);
  console.log(`  kaarten bij deze klant: ${cards}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
