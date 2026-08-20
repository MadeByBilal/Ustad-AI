# Ustad AI — Local Technician Marketplace (Urdu-first)

A marketplace connecting Pakistani households with local technicians
(plumbers, electricians, AC repair, carpenters). Built with Next.js 14 + App
Router, TypeScript, Tailwind CSS and MongoDB (Mongoose).

Customers speak their problem naturally (speech-to-text), the AI matches them
with the best available technician, and they negotiate price directly.

## Prerequisites

- Node.js 18.17+ (npm 9+)
- MongoDB running locally (default `mongodb://127.0.0.1:27017`)

## Setup

```bash
npm install
cp .env.example .env.local   # defaults point at the local MongoDB
npm run seed                 # reset database (drops all collections)
npm run dev                  # http://localhost:3000
```

If port 3000 is already in use (e.g. by another service on this machine), run
`npm run dev -- -p 3100`.

## Environment Variables (`.env.local`)

| Variable          | Default                          | Purpose                          |
| ----------------- | -------------------------------- | -------------------------------- |
| `MONGODB_URI`     | `mongodb://127.0.0.1:27017/ustad_ai` | MongoDB connection string   |
| `ASSEMBLYAI_API_KEY` | *(empty)*                     | Urdu voice transcription (AssemblyAI) |
| `GEMINI_API_KEY`     | *(empty)*                     | Job understanding (Gemini); falls back to keyword engine |

## Authentication

Users sign up with email + password. Technicians choose a trade (plumber,
electrician, AC technician, carpenter) and skills at registration.

Passwords are hashed with scrypt (Node.js built-in, no native dependency).
Sessions use a random 64-hex token in an httpOnly cookie (30 days) backed by
a `Session` collection with a TTL index.

## How It Works

1. **Voice input** — Customer holds the mic button and describes the problem
2. **AI understanding** — Transcription (AssemblyAI) + Gemini classifies the
   job type, urgency, required skills, and price estimate
3. **Technician matching** — Ranked list of available technicians shown with
   skill match, rating, distance, and verification status
4. **Send request** — Customer proposes a price to a specific technician
5. **Negotiate** — Technician accepts, counters, or declines
6. **Confirm** — Acceptance locks the technician and confirms the job

## Scripts

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `npm run dev`    | Dev server (port 3000)                  |
| `npm run build`  | Production build + type check + lint    |
| `npm test`       | Vitest unit tests                       |
| `npm run lint`   | ESLint                                  |
| `npm run seed`   | Reset database (drops all collections)  |

## Project Layout

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{signup,signin,session,logout}/route.ts
│   │   ├── requests/{,respond,counter-response,list}/route.ts
│   │   ├── ai/understand/route.ts
│   │   ├── workers/nearby/route.ts
│   │   └── jobs/route.ts
│   ├── dashboard/{customer,worker}/page.tsx
│   └── login/page.tsx
├── components/
│   ├── VoiceCapture.tsx          # Speech-to-text + AI + ranked results
│   ├── TechnicianRequestModal.tsx # Send request with proposed price
│   ├── CustomerRequestsPanel.tsx  # Customer's request history
│   └── worker/
│       ├── DirectRequestCard.tsx  # Worker accepts/counters/declines
│       ├── IncomingJobCard.tsx    # Broadcast job responses
│       └── WorkerDashboard.tsx
├── lib/
│   ├── auth/
│   │   ├── password.ts           # scrypt hash/verify
│   │   ├── session.ts            # Edge-safe session tokens
│   │   └── fingerprint.ts        # Device fingerprint
│   ├── matching.ts               # Technician ranking engine
│   ├── job/
│   │   ├── ai.ts                 # Gemini + keyword job understanding
│   │   ├── analyze.ts            # Keyword-based fallback
│   │   ├── requests.ts           # Direct request + negotiation flow
│   │   └── flow.ts               # Broadcast job lifecycle
│   └── mongodb.ts
├── models/          # Mongoose models (User, Worker, Job, Offer, ...)
├── middleware.ts    # cookie-gated dashboard redirect
└── scripts/seed.ts  # database reset utility
```

## Key API Endpoints

| Endpoint                         | Method | Purpose                          |
| -------------------------------- | ------ | -------------------------------- |
| `/api/auth/signup`               | POST   | Create account (customer/worker) |
| `/api/auth/signin`               | POST   | Sign in with email + password    |
| `/api/auth/session`              | GET    | Current session user             |
| `/api/auth/logout`               | POST   | Destroy session                  |
| `/api/ai/understand`             | POST   | Voice/text → AI job understanding|
| `/api/requests`                  | POST   | Send direct request to technician|
| `/api/requests/respond`          | POST   | Worker accepts/counter/declines  |
| `/api/requests/counter-response` | POST   | Customer responds to counter     |
| `/api/requests/list`             | GET    | Customer's request history       |
| `/api/workers/nearby`            | GET    | Workers sorted by distance       |
| `/api/jobs`                      | GET    | Job feed (role-scoped)           |
| `/api/workers/me/availability`   | PATCH  | Toggle online/emergency flags    |
| `/api/health`                    | GET    | `{"ok":true,"db":"connected"}`   |

## Notes

- **Matching engine** uses weighted scoring: skill match (35%), reliability
  (25%), ustad score (20%), response rate (10%), rating (10%) with a
  verified-worker bonus. Skill matching includes synonym expansion
  (tap→faucet, naali→drain, etc.).
- **Geo search** uses `$near` with bounding-box pre-filter on the Worker
  model's two 2dsphere indexes. The voice-match showcase path skips geo
  entirely for broader results.
- **Edge-safe sessions**: `src/lib/auth/session.ts` uses only Web Crypto so
  it can be bundled into middleware (Edge runtime).
