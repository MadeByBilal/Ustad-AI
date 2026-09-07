# Ustad AI

AI-powered home repair marketplace for Pakistan. Speak your problem in Roman Urdu, Urdu, or English — Ustad understands it, finds the right worker, and tracks the job to completion.

Built for the Alibaba AI Hackathon 2026.

---

## How It Works

```
Customer speaks                    AI understands                     Worker responds
─────────────────                  ─────────────────                  ─────────────────

  "Mera pipe leak                   Gemini reads your words,           Nearby workers get
   kar raha hai"                    classifies the job,                alerted. They accept
       │                            estimates price in PKR              or counter the offer.
       ▼                                  │                                  │
  ┌─────────┐                     ┌───────┴───────┐                 ┌───────┴───────┐
  │  Voice  │ ─── AssemblyAI ──▶ │   Category:   │ ─── Broadcast ─▶│  Accept or   │
  │  or     │     transcribes    │   plumber     │    to workers    │  Counter the │
  │  Text   │                    │   Skills: pipe│    in 5km        │  offer       │
  └─────────┘                    │   Urgency: low│                  └───────┬──────┘
                                 │   Price: 800- │                          │
                                 │   1500 PKR    │                          ▼
                                 └───────────────┘                   Deal is struck
                                                                      │
                                                                      ▼
                                                            ┌─────────────────┐
                                                            │  Worker drives  │
                                                            │  to you. You    │
                                                            │  watch on map.  │
                                                            │                 │
                                                            │  Job done.      │
                                                            │  Confirm & pay. │
                                                            └─────────────────┘
```

---

## The 8-Step Job Lifecycle

```
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │    1     │    │    2     │    │    3     │    │    4     │
   │  SPEAK   │───▶│ AI READS │───▶│  FIND    │───▶│  AGREE   │
   │          │    │          │    │ WORKER   │    │  PRICE   │
   │ "My pipe │    │ Category │    │          │    │          │
   │  leaks"  │    │ Skills   │    │ Ranked   │    │ Customer │
   │          │    │ Urgency  │    │ by match │    │ offers,  │
   │          │    │ Price    │    │ score    │    │ worker   │
   │          │    │ range    │    │ nearby   │    │ counters │
   └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                       │
   ┌──────────┐    ┌──────────┐    ┌──────────┐       │
   │    8     │    │    7     │    │    6     │       │
   │  DONE    │◀───│  WORK    │◀───│  DRIVE   │◀──────┘
   │          │    │          │    │          │
   │ Confirm  │    │ Worker   │    │ Worker   │
   │ Rate     │    │ fixes    │    │ navigates│
   │ Pay      │    │ problem  │    │ to you   │
   └──────────┘    └──────────┘    └──────────┘
```

---

## The AI Pipeline

```
  YOUR VOICE              ASSEMBLYAI                 GEMINI
  ──────────              ──────────                 ──────

  "Mera pipe    ───────▶  Transcribes to   ───────▶  Extracts:
   leak kar                text in Urdu                  Category
   raha hai"               or English                    Skills
                                                             Urgency
                                                             Price range
                                                             Safety flags

                                                         ┌─────────┐
                                                    ──▶  │ UNSURE? │ ──▶  Asks you
                                                         │         │      a question
                                                         └─────────┘      first
```

---

## Features

### Voice-First
Hold the mic, speak naturally. No typing needed.

### AI Understanding
Gemini classifies the job, estimates urgency and price. If unsure, asks a clarifying question in Roman Urdu.

### Smart Matching
Workers scored by: skill match (30%), distance (25%), reliability (20%), reputation (15%), response rate (10%).

### Live Tracking
Both sides watch each other on a Leaflet map in real time via Socket.IO.

### Price Negotiation
AI estimates a range. Customer offers. Worker counters. Deal struck before work begins.

### Profile Pictures
Cloudinary upload for both customer and worker profiles.

---

## Architecture

```
ustad/
├── contracts/              Shared TypeScript types
│   ├── job.ts              16 statuses, pricing, matching
│   ├── worker.ts           Categories, scoring, dashboard views
│   └── api.ts              Response envelope, geo utils
│
├── server/                 Express + Mongoose + Socket.IO
│   └── src/
│       ├── models/         User, Worker, Job, Offer, Review
│       ├── routes/         auth, jobs, workers, ai, photos
│       └── lib/
│           ├── job/        ai.ts (Gemini + AssemblyAI), state-machine.ts
│           ├── matching.ts Weighted scoring + geo queries
│           └── socket.ts   Real-time events
│
└── client/                 Next.js 14 + React 18 + Tailwind
    └── src/
        ├── app/dashboard/
        │   ├── customer/   home, new-work, active, track/, profile
        │   └── worker/     dashboard, active, inspection, work, profile
        └── components/
            ├── tracking/   Map, live locations, route display
            ├── matching/   Worker cards, review screen
            └── MicVisualizer  Voice recording with animated rings
```

---

## Tech Stack

| Layer | What | Why |
|-------|------|-----|
| Frontend | Next.js 14 + React 18 | App Router, SSR, type safety |
| Styling | Tailwind + Framer Motion | Utility-first + animations |
| Maps | Leaflet + OpenStreetMap | Free, no API key |
| Real-time | Socket.IO | Live location streaming |
| Backend | Express 4 + TypeScript | Fast to build |
| Database | MongoDB + Mongoose | Geo queries, flexible schema |
| AI | Google Gemini + AssemblyAI | Job understanding + voice |
| Uploads | Cloudinary | Profile images |
| Routes | OSRM public API | Free route computation |
| Deploy | Vercel + Render | Free tier |

---

## Quick Start

```bash
git clone <repo-url> && cd ustad
cp .env.example .env
npm install && cd server && npm install && cd ../client && npm install && cd ..
cd server && npm run seed && cd ..
cd server && npm run dev
cd client && npm run dev
```

Server: `http://localhost:5000` | Client: `http://localhost:3001`

### Environment Variables

```env
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=...
ASSEMBLYAI_API_KEY=...
CLOUDINARY_CLOUD_NAME=dbbrfcgpv
CLOUDINARY_API_KEY=918617413785261
CLOUDINARY_API_SECRET=g4rPd_qH_jcR3CjXrpzjw3z3dow
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dbbrfcgpv
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ustad_uploads
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Session |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/:id` | Job detail |
| POST | `/api/jobs/:id/offer` | Make offer |
| PATCH | `/api/jobs/:id/status` | Update state |
| GET | `/api/workers/dashboard` | Worker dashboard |
| POST | `/api/ai/understand` | Analyze input |
| POST | `/api/ai/transcribe` | Transcribe audio |

---

## Database

**User** — email, password, role, phone, language, location, profile_image.

**Worker** — name, category, skills, verified, location, reputation score, completed jobs, rating.

**Job** — status (14 states), AI-extracted understanding, location, pricing, matched worker, route.

**Offer** — worker response (accept/counter/reject).

**Review** — rating (1–5) + text after completion.
