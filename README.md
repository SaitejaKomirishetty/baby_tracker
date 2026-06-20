# 🐣 Nestling — Newborn Baby Health Tracker

A mobile-first PWA for tracking a newborn's feeds, sleep, diapers, growth,
temperature, medications and notes — designed for **one-handed, late-night
logging**. Multiple caregivers share a household; roles control who can do what.

Built with **Next.js 16 (App Router) · TypeScript · Drizzle ORM · PostgreSQL
(Neon) · NextAuth v5 · Tailwind CSS v4 · Recharts · React Hook Form + Zod**.

## Features

- **Mobile-first UX** — bottom navigation, 44px+ tap targets, bottom-sheet
  forms (vaul), a floating quick-log button, optimistic UI, and dark mode by
  default (auto-detects system).
- **Installable PWA** — web manifest, service worker, and "Add to Home Screen".
- **Auth & households** — email/password (+ optional Google), with a
  `Household → members (owner / caregiver / viewer) → babies` model and an
  invite-link flow. Every server action re-checks the session against the DB.
- **Quick-log tracking** — breast/bottle feeds, diapers, sleep sessions,
  temperature, growth (weight/height/head), medications, and tagged notes.
  Each entry is timestamped, editable/deletable, and attributed to its author.
- **Glanceable dashboard** — "time since last feed/diaper", current sleep
  status, today's totals, reminder banners, and a one-tap quick-add sheet.
- **Analytics** — feeding frequency & volume, day/night sleep, diaper counts,
  weight vs. WHO percentile bands, and a temperature chart with a fever line.
- **Caregiver activity feed** — household-wide "who logged what".

## Getting started

### 1. Environment

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL="postgresql://…"     # Neon or any Postgres
AUTH_SECRET="…"                    # generate with: npx auth secret
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Optional Google OAuth:
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

### 2. Install & set up the database

```bash
npm install
npm run db:generate   # generate SQL migration from the schema
npm run db:migrate    # apply it to your database
npm run db:seed       # sample household, 3 caregivers, twins + ~10 days of logs
```

### 3. Run

```bash
npm run dev           # http://localhost:3000
```

### Demo accounts (after seeding)

| Email                 | Role      | Password      |
| --------------------- | --------- | ------------- |
| `alice@example.com`   | owner     | `password123` |
| `bob@example.com`     | caregiver | `password123` |
| `grandma@example.com` | viewer    | `password123` |

## Project layout

```
src/
  app/
    (auth)/{login,register}     # signed-out pages
    (app)/{dashboard,log,analytics,settings,activity}   # protected shell + bottom nav
    onboarding/  join/          # create / join a household
    api/auth/[...nextauth]/     # NextAuth route handler
  auth.ts  auth.config.ts       # NextAuth v5 (config split for edge proxy)
  proxy.ts                      # route protection (Next 16 "proxy" middleware)
  db/{schema,index,seed}.ts     # Drizzle schema, client, seed
  lib/{authz,context,validators,format,who,log-meta}.ts
  server/{auth,household,baby,log}-actions.ts  +  queries.ts
  components/{ui,dashboard,quick-log,log,analytics,settings,baby,...}
```

## Authorization model

Roles are ranked `owner > caregiver > viewer`. The JWT caches a user's
memberships for fast checks, but **every mutation re-verifies against the
database** (`src/lib/authz.ts`):

- **owner** — full control; can manage members, invites, and baby profiles, and
  edit/delete any log.
- **caregiver** — can log entries and edit/delete **their own** logs.
- **viewer** — read-only.

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push the schema directly (no migration files) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed sample data |
