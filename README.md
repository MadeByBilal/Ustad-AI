# Ustad AI

AI-powered home repair marketplace for Pakistan. Customers speak their problem in Roman Urdu, Urdu, or English — Ustad understands it, finds the right worker, and tracks the job from request to completion.

Built for the Alibaba AI Hackathon 2026.

---

## How It Works

### Customer Journey

```
  HOLD MIC           AI UNDERSTANDS         PICK A WORKER        TRACK LIVE
     |                     |                     |                    |
     v                     v                     v                    v
+----------+      +------------------+    +-----------+       +------------+
| Record   | ---> | Gemini reads     |    | See ranked| --->  | Map shows  |
| voice or |      | your words       |    | workers   |       | worker     |
| type text|      | (Roman Urdu/Urdu/|    | with      |       | driving to |
+----------+      | English)         |    | prices &  |       | you in     |
                  +------------------+    | ratings   |       | real time  |
                         |                +-----------+       +------------+
                         v                       |                    |
                  +------------------+           v                    v
                  | Knows: category, |    +-----------+       +------------+
                  | skills needed,   |    | Worker    |       | Job done.  |
                  | urgency, price   |    | accepts.  |       | Confirm &  |
                  | range in PKR     |    | Deal made.|       | pay.       |
                  +------------------+    +-----------+       +------------+
```

### Worker Journey

```
  GET ALERTED          RESPOND               NAVIGATE              FINISH
       |                  |                      |                    |
       v                  v                      v                    v
+-------------+    +-------------+        +-------------+      +-------------+
| Push notif: |    | See job     |        | Map with    |      | Mark work   |
| "New job     | -> | details +   | -----> | route to    | ---> | done.       |
| near you"   |    | AI price    |        | customer.   |      | Upload      |
+-------------+    | estimate    |        | Drive there.|      | before/after|
                   +-------------+        +-------------+      | photos.     |
                          |                                    +-------------+
                          v                                          |
                   +-------------+                                  v
                   | Counter or  |                           +-------------+
                   | accept the  |                           | Customer    |
                   | offer.      |                           | confirms &  |
                   +-------------+                           | pays.       |
                                                             +-------------+
```

### The AI Pipeline

```
+------------------+      +------------------+      +------------------+
|  YOUR VOICE      |      |  ASSEMBLYAI      |      |  GEMINI          |
|  "Mera pipe      | ---> |  Transcribes to  | ---> |  Extracts:       |
|  leak kar raha    |      |  text (Urdu/EN)  |      |  - Category      |
|  hai"             |      |                  |      |  - Skills needed |
+------------------+      +------------------+      |  - Urgency       |
                                                    |  - Price range   |
                                                    |  - Safety flags  |
                                                    +------------------+
                                                             |
                                                    +------------------+
                                                    |  IF UNSURE:      |
                                                    |  Asks you a      |
                                                    |  question first  |
                                                    |  ("Bijli/Pani/   |
                                                    |   AC/Lakri?")    |
                                                    +------------------+
```

---

## The Complete Job Lifecycle

```
 1. DESCRIBE         2. AI ANALYZES       3. MATCH             4. AGREE PRICE
 +-----------+       +-----------+        +-----------+        +-----------+
 | Voice or  | ----> | Category:  | ----> | Broadcast | ----> | Customer  |
 | text      |       | plumber    |       | to nearby |       | offers    |
 | input     |       | Skills:    |       | workers   |       | PKR 1200  |
 +-----------+       | pipe repair|       | in 5km    |       |           |
                     | Urgency:   |       | radius    |       | Worker    |
                     | normal     |       |           |       | counters  |
                     | Price:     |       | Workers   |       | PKR 1500  |
                     | 800-1500   |       | respond   |       |           |
                     +-----------+       +-----------+       +-----------+
                                                                |
 8. COMPLETE         7. WORK DONE        6. ON THE JOB        5. GO
 +-----------+       +-----------+       +-----------+        +-----------+
 | Customer  | ----> | Worker     | ----> | Customer  | <---- | Worker    |
 | confirms, |       | uploads    |       | watches   |       | drives to |
 | rates,    |       | before/    |       | worker    |       | customer  |
 | pays      |       | after      |       | live on   |       | on map    |
 +-----------+       | photos     |       | map       |       +-----------+
                     +-----------+       +-----------+
```

---

## Features

### Voice-First
Hold the mic button, speak naturally in Roman Urdu, Urdu, or English. AssemblyAI transcribes it, Gemini understands it. No typing needed.

### AI Understanding (Two Rounds)
- **Round 1**: Gemini classifies the job, extracts skills, estimates urgency, gives a PKR price range.
- **Round 2** (if needed): Asks a short clarifying question in Roman Urdu ("Bijli / Pani / AC / Lakri?").
- **Fallback**: If Gemini is offline, a keyword-based engine handles classification.

### Smart Worker Matching
Scored across 5 weighted dimensions:

| Dimension | Weight | What It Means |
|-----------|--------|---------------|
| Skill match | 30% | Worker has the exact skills needed |
| Distance | 25% | How close they are (2dsphere geo query) |
| Reliability | 20% | Completion rate, low cancellations |
| Ustad score | 15% | Platform reputation score |
| Response rate | 10% | How often they accept jobs |

Emergency jobs: +10 bonus for emergency-available workers.
Verified workers: +5 bonus.

### Price Negotiation
AI estimates a range. Customer offers. Worker counters (validated within 0.5x–2x). Deal struck before work begins. Inspection fee paid upfront.

### Live Tracking
Leaflet map + Socket.IO. Customer watches worker en route. Worker navigates to customer. Both see real-time positions and route via OSRM.

### Profile Pictures
Cloudinary upload for both sides. Photos appear on match cards, review screens, and tracking views.

---

## Architecture

```
ustad/
├── contracts/              Shared TypeScript types (no runtime code)
│   ├── job.ts              16 job statuses, pricing, matching interfaces
│   ├── worker.ts           Worker categories, scoring, dashboard views
│   ├── api.ts              Response envelope, haversine, bounding box
│   └── ai.ts               AI result types
│
├── server/                 Express + Mongoose + Socket.IO
│   └── src/
│       ├── models/         User, Worker, Job, Offer, Review, Broadcast
│       ├── routes/         auth, jobs, workers, requests, ai, photos, routes
│       ├── lib/
│       │   ├── job/        ai.ts (Gemini + AssemblyAI), state-machine.ts
│       │   ├── matching.ts Weighted scoring + geo queries
│       │   ├── geo.ts      Haversine distance, bounding box
│       │   └── socket.ts   Real-time events
│       └── scripts/        seed.ts (test data)
│
└── client/                 Next.js 14 + React 18 + Tailwind
    └── src/
        ├── app/
        │   ├── dashboard/
        │   │   ├── customer/   home, new-work, active, track/, result, profile
        │   │   └── worker/     dashboard, active, inspection, work, stats, profile
        │   └── login/
        └── client/components/
            ├── tracking/       TrackingMap, LiveWorkerLocation, LiveCustomerLocation
            ├── matching/       MatchResults, ReviewScreen
            ├── MicVisualizer   Voice recording UI with animated rings
            └── ProfileAvatar   Cloudinary-backed profile images
```

---

## Tech Stack

| Layer | What | Why |
|-------|------|-----|
| Frontend | Next.js 14 + React 18 + TypeScript | App Router, SSR, type safety |
| Styling | Tailwind CSS + Framer Motion + GSAP | Utility-first + animations |
| Maps | Leaflet + OpenStreetMap | Free, no API key required |
| Real-time | Socket.IO | Bidirectional location streaming |
| Charts | Recharts | Worker stats dashboard |
| Backend | Express 4 + TypeScript | Simple, fast to build |
| Database | MongoDB + Mongoose | Geo queries (2dsphere), flexible schema |
| AI | Google Gemini + AssemblyAI | Job understanding + voice transcription |
| Uploads | Cloudinary | Profile images, unsigned upload |
| Routes | OSRM public API | Free route computation |
| Validation | Zod | Shared schemas, runtime checks |
| Testing | Vitest | Fast unit tests |
| Deploy | Vercel (client) + Render (server) | Free tier, zero config |

---

## Quick Start

```bash
git clone <repo-url> && cd ustad
cp .env.example .env    # fill in your API keys
npm install && cd server && npm install && cd ../client && npm install && cd ..
cd server && npm run seed && cd ..   # create test data
cd server && npm run dev             # terminal 1: localhost:5000
cd client && npm run dev             # terminal 2: localhost:3001
```

### Required Environment Variables

```env
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas or local
GEMINI_API_KEY=...                     # Google AI Studio
ASSEMBLYAI_API_KEY=...                 # assemblyai.com
CLOUDINARY_CLOUD_NAME=dbbrfcgpv        # Cloudinary
CLOUDINARY_API_KEY=918617413785261
CLOUDINARY_API_SECRET=g4rPd_qH_jcR3CjXrpzjw3z3dow
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dbbrfcgpv
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ustad_uploads
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register (customer or worker) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current session |
| POST | `/api/jobs` | Create job from voice/text |
| GET | `/api/jobs/:id` | Job detail |
| POST | `/api/jobs/:id/offer` | Customer makes offer |
| PATCH | `/api/jobs/:id/status` | Update job state |
| GET | `/api/workers/dashboard` | Worker dashboard |
| POST | `/api/ai/understand` | Analyze job input |
| POST | `/api/ai/transcribe` | Transcribe audio |
| POST | `/api/routes/compute` | OSRM route |

---

## Database

**User** — email, password_hash, role (customer/worker/admin), phone, language (ur/en), location, profile_image.

**Worker** — name, category (plumber/electrician/ac_technician/carpenter), skills[], verified, location (GeoJSON Point), ustad_score, completed_jobs, average_rating.

**Job** — status (14 states), input (voice/text/photo), understanding (AI-extracted category, skills, urgency, price), location, pricing (estimate, offer, counter, final), matching (broadcast, eligible workers, selected worker), route (polyline from OSRM).

**Offer** — worker response to a job (accept, counter, reject).

**Review** — customer rating (1–5) + text after job completion.

---

## License

MIT
