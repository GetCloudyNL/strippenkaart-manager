# Projectplanning – Strippenkaart Manager

Interne tool voor **strippenkaarten** (vooruitbetaalde supporturen), **projecten**
en **tijdregistratie**, met HostBill-koppeling en mailrapportages. Dit document is
de leidraad om het project op te pakken vanaf elke plek.

## Tech-stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **PostgreSQL** + **Prisma 7** (pg driver-adapter, ESM client in `src/generated/prisma`)
- **Auth.js v5** (credentials + JWT, rol-gebaseerd)
- **BullMQ + Redis** worker voor achtergrondtaken
- **Docker Compose** (db, redis, app, worker) voor deployment op eigen VPS
- Hosting: **eigen VPS** (draait als Node-server, geen serverless)

## Architectuur

```
[HostBill] --polling--> [Next.js app] --> [PostgreSQL]
                             |  ^
                    admin UI |  | klantportaal (/portal)
                             v
                   [BullMQ + Redis worker]
                             |
                        [Mail / PDF]
```

- Medewerkers-UI onder route-group `src/app/(staff)` (dashboard, klanten,
  projecten, tijd, kaarten, admin).
- Klantportaal onder `src/app/portal`.
- Auth/rollen via `src/proxy.ts` (Next 16 "proxy", voorheen middleware).
- Server actions per feature in `actions.ts`, herbruikbare UI in `src/components`.

## Datamodel (Prisma)

- **User** – rollen: ADMIN, TECHNICIAN, READONLY, CUSTOMER (portal-login gekoppeld
  aan Customer).
- **Customer** – `type`: CUSTOMER / NON_CUSTOMER (bepaalt standaard uurtarief),
  `hostbillClientId`, mailvoorkeur.
- **Project** – `billingType`: STRIPPENKAART / HOURLY / RETAINER / FIXED_PRICE,
  optioneel `hourlyRate` (override).
- **CardType** – configureerbaar kaarttype met afrondingsregels
  (`roundingIncrementMin`, `roundingDirection`, `minimumPerEntryMin`),
  `validityMonths`, prijs, `hostbillProductId`, actief.
- **Strippenkaart** – concrete kaart met **snapshot** van voorwaarden, saldo
  (`remainingMinutes`, negatief toegestaan), status, vervaldatum.
- **TimeEntry** – boeking op een project; bij strippenkaart gekoppeld aan kaart
  met `rawMinutes` en (afgerond) `chargedMinutes`.
- **EmailLog**, **AuditLog**, **Setting** (o.a. twee uurtarieven),
  **HostbillSyncState** (poll-cursor).

## Kernlogica

- `src/lib/rounding.ts` – `calculateChargedMinutes` (increment + richting + minimum).
- `src/lib/rates.ts` – tariefresolutie (project-override → standaardtarief o.b.v.
  klanttype) + bedragberekening.
- `src/lib/settings.ts` – twee instelbare uurtarieven (klant/niet-klant).
- `src/lib/strippenkaart.ts` – kaartselectie (FIFO), afschrijven met afronding,
  terugboeken, upsell-trigger bij opgebruikt saldo.

## Fasering & status

- [x] **Fase 1 – Fundament**: scaffold, datamodel, auth + rollen, Docker Compose,
  seed (admin + 4/8/12u kaarttypes).
- [x] **Fase 2 – Tijdregistratie**: klanten-CRUD, projecten-CRUD, boekingen met
  overzicht/filters/totalen, twee instelbare uurtarieven (klant/niet-klant),
  admin-instellingen.
- [x] **Fase 3 – Strippenkaart-laag**: kaarttypes-CRUD met afrondingsregels,
  strippenkaarten aanmaken/beheren (snapshot voorwaarden), automatische
  afschrijving met afronding, negatief saldo + upsell-trigger, terugboeken bij
  bewerken/verwijderen.
- [x] **Fase 4 – HostBill-koppeling**: `HostBillClient` (`src/lib/hostbill.ts`),
  sync-logica (`src/lib/hostbill-sync.ts`): polling op nieuwe betaalde orders →
  strippenkaart aanmaken (mapping `hostbillProductId` → CardType), klant-sync
  (`hostbillClientId`), upsell-order bij opgebruikt saldo via de hostbill-queue.
  Worker draait de poll-job periodiek; admin-pagina `/admin/hostbill` toont status
  en heeft "Nu synchroniseren".
  - Nog voor go-live: echte API-credentials invullen, `hostbillProductId` per
    kaarttype zetten, en de HostBill method-namen/velden verifiëren tegen jullie
    instance (`HOSTBILL_ORDERS_CALL`, `HOSTBILL_UPSELL_CALL`,
    `HOSTBILL_PAID_STATUSES`), daarna `HOSTBILL_POLL_ENABLED=true`.
- [ ] **Fase 5 – Mail/PDF**: mail met restant na afronden werk, maandoverzicht
  (cron + PDF-bijlage), lage-saldo- en vervaldatum-alerts. Via `mailQueue`.
- [ ] **Fase 6 – Klantportaal**: klant ziet eigen saldo/verbruik per project,
  PDF-download.
- [ ] **Fase 7 – Extra's**: dashboard-statistieken, audit log-weergave,
  timer/quick-entry, facturatie-export.

## Belangrijke keuzes

- Bleeding-edge stack (Next 16 / Prisma 7 / Auth.js v5-beta). Docker-image draait
  Node 22; lokaal Node 20 werkt maar overweeg Node 22.
- Strippenkaart-voorwaarden worden bij aankoop **gesnapshot** in de kaart, zodat
  wijzigen van een CardType bestaande kaarten niet raakt.
- Negatief saldo is toegestaan; opgebruikte kaart → status DEPLETED + upsell-trigger
  (nu AuditLog `CARD_DEPLETED`, in fase 4 een HostBill-order/factuur).
- HostBill: starten met **pollen** (geen hook in HostBill nodig); later evt. webhook.

## Lokaal draaien

```bash
docker compose up -d db redis
cp .env.example .env            # vul AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:migrate
npm run db:seed
npm run dev                     # app op http://localhost:3000
npm run worker:dev              # worker (tweede terminal)
```

Login (seed): `admin@example.com` / `admin12345`.

## Nog nodig van de gebruiker (voor fase 4/5)

- **HostBill**: API-URL, API-id en API-key (admin), plus de product-ID's van de
  4/8/12-uurs producten (invullen bij de kaarttypes als `hostbillProductId`).
- **SMTP**: host/poort/gebruiker/wachtwoord + afzender (`MAIL_FROM`) voor mail.

## Git / deployment

- Repo: `GetCloudyNL/strippenkaart-manager` (alles via Get Cloudy-account).
- Productie: `docker compose --profile prod up -d --build` (app past migraties toe
  en start Next; worker draait de queues).
