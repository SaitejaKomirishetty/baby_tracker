# 🐣 Nestling — Newborn Baby Health Tracker

A mobile-first PWA for tracking a newborn's feeds, sleep, diapers, growth,
temperature, medications and notes — designed for **one-handed, late-night
logging**. Multiple caregivers share a household, and roles control who can do
what.

> **Design idea — "a nightlight, not a screen."** The app is built for a parent
> in a dim nursery at 3am, so the default theme is a warm, **zero-blue-light**
> nocturne lit by a honey-amber glow (with a cream daytime mode), and the
> dashboard opens on the one question that matters at that hour: _how long since
> the last feed?_

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM ·
PostgreSQL (Neon) · NextAuth v5 · Tailwind CSS v4 · Recharts · React Hook Form +
Zod**.

---

## Features

- **Mobile-first UX** — bottom navigation, 44px+ tap targets, bottom-sheet forms
  (vaul) instead of modals, a floating quick-log button, optimistic updates, and
  a warm dark theme by default (auto-detects system; light mode included).
- **Quick logging** — breast/bottle feeds, diaper changes, sleep sessions,
  temperature, growth (weight/height/head circumference), medications &
  vitamins, and free-text notes with tags. One-tap diaper and sleep toggles from
  the dashboard; everything else via a single bottom sheet.
- **Glanceable dashboard** — a glowing "time since last feed" focal that fills
  toward the next typical feed, quieter lamp chips for diaper/sleep/temp,
  today's totals, and reminder banners (e.g. fever alerts).
- **Analytics** — feeding frequency & volume, day-vs-night sleep, diaper counts,
  weight against **WHO percentile bands**, and a temperature chart with the
  fever threshold highlighted.
- **Households & roles** — a `Household → members → babies` model with
  owner / caregiver / viewer roles, multi-baby support (e.g. twins), and an
  invite-link flow. Every entry is timestamped, editable/deletable, and
  attributed to the caregiver who logged it.
- **Caregiver activity feed** — household-wide "who logged what" across babies.
- **Installable PWA** — web manifest, service worker, icons, and "Add to Home
  Screen" support.
- **Timezone-correct** — times are resolved to an absolute instant in the
  browser and stored as `timestamptz`, so a logged time shows identically no
  matter where the app is deployed (see [Notes](#implementation-notes)).

---

## Getting started

### 1. Prerequisites

- Node.js 20+ (developed on Node 22)
- A PostgreSQL database — a free [Neon](https://neon.tech) project works great

### 2. Environment

Copy `.env.example` to `.env` and fill it in:

```bash
DATABASE_URL="postgresql://…"          # Neon or any Postgres connection string
AUTH_SECRET="…"                         # generate with: npx auth secret
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional — leave blank to hide the Google sign-in button
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

`.env` is gitignored; only `.env.example` is committed.

### 3. Install & set up the database

```bash
npm install
npm run db:migrate    # apply migrations to your database
npm run db:seed       # sample household, 3 caregivers, twins + ~10 days of logs
```

### 4. Run

```bash
npm run dev           # → http://localhost:3000
```

### Demo accounts (after seeding)

| Email                 | Role      | Password      |
| --------------------- | --------- | ------------- |
| `alice@example.com`   | owner     | `password123` |
| `bob@example.com`     | caregiver | `password123` |
| `grandma@example.com` | viewer    | `password123` |

---

## Tech stack

| Area        | Choice                                                            |
| ----------- | ----------------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Server Actions), React 19, TypeScript     |
| Database    | PostgreSQL (Neon) via Drizzle ORM + `postgres` driver             |
| Auth        | NextAuth v5 (credentials + optional Google) with Drizzle adapter  |
| Styling     | Tailwind CSS v4 (CSS-first config), custom UI primitives          |
| Components  | `vaul` (bottom sheets), `lucide-react` (icons), `next-themes`     |
| Charts      | Recharts                                                          |
| Forms       | React Hook Form + Zod validation                                  |

---

## Project layout

```
src/
  app/
    (auth)/{login,register}/      # signed-out pages
    (app)/                        # protected shell (bottom nav + baby switcher)
      dashboard/  log/  analytics/  settings/  activity/
      settings/babies/…           # baby profile create / edit
    onboarding/  join/            # create or join a household
    api/auth/[...nextauth]/       # NextAuth route handler
    layout.tsx  globals.css       # root layout, theme tokens, PWA metadata
  auth.ts  auth.config.ts          # NextAuth v5 (split so middleware stays edge-safe)
  proxy.ts                         # route protection (Next 16's "proxy" middleware)
  db/{schema,index,seed}.ts        # Drizzle schema, client, seed script
  lib/{authz,context,validators,format,who,log-meta,utils}.ts
  server/{auth,household,baby,log}-actions.ts   # Server Actions (mutations)
  server/queries.ts                # read-side queries (dashboard, timeline, analytics)
  components/{ui,dashboard,quick-log,log,analytics,settings,baby,household,auth}/
drizzle/                           # generated SQL migrations
public/{manifest.webmanifest,sw.js,icons/}      # PWA assets
```

---

## Authorization model

Roles are ranked `owner > caregiver > viewer`. The session JWT caches a user's
memberships for fast checks, but **every mutation re-verifies against the
database** (`src/lib/authz.ts`) — the JWT is a cache, the DB is the source of
truth.

- **owner** — full control; manages members, invites, and baby profiles, and can
  edit/delete any log.
- **caregiver** — can log entries and edit/delete **their own** logs.
- **viewer** — read-only (e.g. grandparents who just want updates).

Routes are gated by `proxy.ts`; unauthenticated users are redirected to
`/login`.

---

## Implementation notes

- **Timezones.** `datetime-local` inputs are converted to an absolute UTC
  instant **in the browser** (where the user's zone is known) before submitting,
  and all timestamp columns are `timestamptz`. This keeps logged times correct
  even when the server runs in a different timezone than the user.
- **Growth chart.** WHO percentile bands (P3 / P50 / P97 for weight & length,
  0–24 months) in `src/lib/who.ts` are an approximate visual reference, **not a
  clinical tool**.
- **Stack version.** This project targets Next.js 16 / Tailwind v4, which differ
  from older tutorials (CSS-first Tailwind config, the `proxy.ts` middleware
  convention, etc.).

---

## Scripts

| Script                | Purpose                                       |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Start the dev server                          |
| `npm run build`       | Production build                              |
| `npm run start`       | Serve the production build                    |
| `npm run lint`        | Run ESLint                                    |
| `npm run db:generate` | Generate a Drizzle migration from the schema  |
| `npm run db:migrate`  | Apply migrations                              |
| `npm run db:push`     | Push the schema directly (no migration files) |
| `npm run db:studio`   | Open Drizzle Studio                           |
| `npm run db:seed`     | Seed sample data                              |
