# Strippenkaart Manager

## Omschrijving

Strippenkaart Manager is een webapplicatie om **vooruitbetaalde supporturen
(strippenkaarten)** en **tijdregistratie op klantprojecten** te beheren.

Klanten kopen een strippenkaart (bijv. 4, 8 of 12 uur). Wanneer er
werkzaamheden worden uitgevoerd, registreer je de bestede tijd; die wordt
volgens **per kaarttype instelbare afrondingsregels** (afrondingseenheid,
richting en minimum per registratie) van het saldo afgeschreven. Naast
strippenkaarten ondersteunt de app ook andere afrekenvormen per project
(uurtarief, retainer, vaste prijs), zodat je er voor al je klantprojecten tijd
in kunt schrijven.

Kernfunctionaliteit:

- **Kaarttypes beheren** via een admin-dashboard: 4/8/12 uur met eigen
  voorwaarden en afrondingsregels, toe te voegen en te wijzigen.
- **Projecten en tijdregistratie** voor alle klanten, met saldo-afschrijving en
  afronding voor strippenkaart-projecten (negatief saldo toegestaan, met
  upsell-trigger).
- **HostBill-koppeling**: nieuwe bestellingen worden opgehaald en automatisch
  omgezet naar een strippenkaart voor de juiste klant.
- **Mailrapportages**: mail met restant na afronden werkzaamheden, een
  maandelijks overzicht, plus waarschuwingen bij laag saldo of naderende
  vervaldatum.
- **Klantenportaal**: klanten zien hun eigen saldo en verbruik en kunnen een
  overzicht downloaden.
- **Rollen**: admin, technicus, alleen-lezen en klant.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma 7** (pg driver-adapter)
- **Auth.js v5** (credentials + JWT, rol-gebaseerd)
- **BullMQ + Redis** worker voor achtergrondtaken (HostBill-polling, mail, rapporten)
- **Tailwind CSS v4**
- **Docker Compose** voor deployment

## Lokale ontwikkeling

1. Start database en Redis:

```bash
docker compose up -d db redis
```

2. Maak `.env` aan (kopieer `.env.example`) en zet minimaal `AUTH_SECRET`:

```bash
cp .env.example .env
# AUTH_SECRET genereren:
openssl rand -base64 32
```

3. Installeer dependencies en zet de database op:

```bash
npm install
npm run db:migrate
npm run db:seed
```

4. Start de app en (in een tweede terminal) de worker:

```bash
npm run dev
npm run worker:dev
```

Inloggen met de seed-admin: `admin@example.com` / `admin12345`
(aanpasbaar via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Handige scripts

| Script | Doel |
|---|---|
| `npm run dev` | Next.js dev-server |
| `npm run worker:dev` | BullMQ worker (watch) |
| `npm run db:migrate` | Prisma-migratie (dev) |
| `npm run db:deploy` | Migraties toepassen (productie) |
| `npm run db:seed` | Seed (admin + kaarttypes) |
| `npm run db:studio` | Prisma Studio |

## Productie (VPS)

```bash
docker compose --profile prod up -d --build
```

Dit start `db`, `redis`, `app` (past migraties toe en start Next) en `worker`.

## Rollen

- **ADMIN** – volledig beheer, inclusief kaarttypes
- **TECHNICIAN** – tijd boeken
- **READONLY** – alleen inzien
- **CUSTOMER** – klantportaal (`/portal`)

## Roadmap

1. ✅ Fundament (datamodel, auth, Docker)
2. Tijdregistratie op projecten
3. Strippenkaart-laag (kaarttypes, afronding, saldo)
4. HostBill-koppeling
5. Mail/PDF-rapportages
6. Klantenportaal
7. Extra's (statistieken, audit log, timer, facturatie-export)
