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
- `src/lib/mail.ts` / `email-templates.ts` / `pdf.ts` / `reports.ts` / `notify.ts` –
  mail via wachtrij (EmailLog + worker), HTML-templates, PDF-maandoverzicht,
  rapport-/alertlogica en de "werk afgerond"-mail.

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
- [x] **Fase 5 – Mail/PDF**: mailinfra (`src/lib/mail.ts`: nodemailer-transport,
  `queueEmail` → EmailLog + `mailQueue`, `processMailJob`), HTML-templates
  (`src/lib/email-templates.ts`) en PDF-maandoverzicht via pdfkit (`src/lib/pdf.ts`).
  Rapportfuncties (`src/lib/reports.ts`): maandoverzichten (vorige maand, per klant,
  met PDF-bijlage) en alerts (laag saldo + naderende vervaldatum, met dedup via
  EmailLog). "Werk afgerond"-mail met restant bij strippenkaart-boeking
  (`src/lib/notify.ts`, aangeroepen vanuit `time/actions.ts`). Worker verstuurt mail
  en plant maand-/dagjobs in (cron) als `REPORTS_ENABLED=true`. Admin-pagina
  `/admin/reports` toont SMTP-status, recente mails en knoppen om handmatig te
  versturen. Lokaal testen via **Mailpit** (docker-compose, SMTP 1025, web 8025).
- [x] **Fase 6 – Klantportaal**: portal (`src/app/portal`) voor CUSTOMER-logins met
  `requireCustomer()` (rol + gekoppelde `customerId`). Home toont resterend saldo,
  actieve kaarten en verbruik per project (deze maand) plus kaartoverzicht met
  voortgangsbalk. Kaartdetail (`/portal/cards/[id]`) toont saldo, voorwaarden en
  boekingen; PDF-download via route-handler `/portal/cards/[id]/pdf`
  (`generateCardOverviewPdf`). Toegang afgeschermd via `src/proxy.ts` + eigenaarscheck.
- [x] **Fase 7 – Extra's**: uitgebreid dashboard (uren/omzet per maand,
  aandachtslijsten laag saldo & bijna verlopen, top-projecten, recente boekingen)
  met **timer/quick-entry** (`dashboard/quick-entry.tsx`). Audit-logging via
  `src/lib/audit.ts` (kaart aanmaken/annuleren, boeking aanmaken/wijzigen/
  verwijderen, facturatie) met weergave op `/admin/audit`. Facturatie-export
  (`/admin/export`): filters, CSV-download (`/admin/export/csv`) en "markeer als
  gefactureerd" (`billed`-vlag) voor uurtarief-boekingen.

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
docker compose up -d db redis mailpit   # mailpit = lokale mailserver (web: http://localhost:8025)
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
