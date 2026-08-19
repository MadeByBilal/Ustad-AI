# Ustad AI — Local Technician Marketplace (Urdu-first)

A marketplace connecting Pakistani households with verified local technicians
(plumbers, electricians, AC repair, painters). Built with Next.js 14 + App
Router, TypeScript, Tailwind CSS and MongoDB (Mongoose). Auth is a mock
phone-OTP flow for now — no SMS provider, no AI features yet.

## Prerequisites

- Node.js 18.17+ (npm 9+)
- MongoDB running locally (default `mongodb://127.0.0.1:27017`)

## Setup

```bash
npm install
cp .env.example .env.local   # defaults point at the local MongoDB
npm run seed                 # populate demo data
npm run dev                  # http://localhost:3000
```

If port 3000 is already in use (e.g. by another service on this machine), run
`npm run dev -- -p 3100`.

## Environment Variables (`.env.local`)

| Variable          | Default                          | Purpose                          |
| ----------------- | -------------------------------- | -------------------------------- |
| `MONGODB_URI`     | `mongodb://127.0.0.1:27017/ustad_ai` | MongoDB connection string   |
| `MOCK_OTP_ENABLED`| `true`                           | When true, OTP responses include `mock_otp` and any 6-digit OTP verifies |

## Demo Accounts

| Role     | Phone         | Name          | Notes                          |
| -------- | ------------- | ------------- | ------------------------------ |
| Customer | `03001234567` | Ahmed Raza    | Can view jobs + nearby workers |
| Worker   | `03010000001` | Muhammad Imran| Plumber, sees broadcast jobs   |

Login flow: enter the phone number, read the OTP from the API response
(`mock_otp`) or the server console, enter it, and the session cookie is set.

## Scripts

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `npm run dev`    | Dev server (port 3000)                  |
| `npm run build`  | Production build + type check + lint    |
| `npm test`       | Vitest unit tests (23 tests)            |
| `npm run lint`   | ESLint                                  |
| `npm run seed`   | Reset + seed demo data (drops collections) |

## Project Layout

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{otp,verify,session,logout}/route.ts   # mock OTP auth
│   │   ├── workers/nearby/route.ts                     # $near geo search
│   │   ├── workers/me/availability/route.ts            # worker toggles
│   │   ├── jobs/route.ts                               # role-scoped job feeds
│   │   └── health/route.ts                             # DB health check
│   ├── dashboard/{customer,worker}/page.tsx            # role dashboards
│   └── login/page.tsx                                  # OTP login UI
├── lib/
│   ├── auth/otp.ts, session.ts, fingerprint.ts, auth.ts
│   ├── mongodb.ts, api.ts, geo.ts, display.ts
├── models/          # Mongoose models + barrel (User, Worker, Job, ...)
├── middleware.ts    # cookie-gated dashboard redirect
└── scripts/seed.ts  # demo data
```

## Key API Endpoints

| Endpoint                         | Method | Purpose                          |
| -------------------------------- | ------ | -------------------------------- |
| `/api/auth/otp`                  | POST   | Send (mock) OTP to a phone       |
| `/api/auth/verify`               | POST   | Verify OTP, set session cookie   |
| `/api/auth/session`              | GET    | Current session user             |
| `/api/auth/logout`               | POST   | Destroy session                  |
| `/api/workers/nearby?lat&lng&category` | GET | Workers sorted by distance |
| `/api/jobs`                      | GET    | Job feed (role-scoped)           |
| `/api/workers/me/availability`   | PATCH  | Toggle online/emergency flags    |
| `/api/health`                    | GET    | `{"ok":true,"db":"connected"}`   |

## Notes / Known Decisions

- **OTP security**: OTPs are hashed (sha256, salted with phone) at rest with a
  5-minute TTL. Sessions use a random 64-hex token in an httpOnly cookie
  (30 days) backed by a `Session` collection with a TTL index.
- **Geo search**: `$near` is used instead of `$geoNear` because the Worker
  model carries two 2dsphere indexes (`location`, `service_area`), which makes
  `$geoNear` ambiguous. Distance is re-computed with haversine for display.
- **Edge-safe sessions**: `src/lib/auth/session.ts` uses only Web Crypto so it
  can be bundled into middleware (Edge runtime). Node-only crypto lives in
  `fingerprint.ts`, imported only by server routes.
- **Seed workers have no coordinates** (by design) — geo queries return only
  the 6 workers per city that have `location`.
- The Google Fonts `<link>` in `layout.tsx` produces a harmless
  `no-page-custom-font` lint warning (App Router has no `_document.js`).
