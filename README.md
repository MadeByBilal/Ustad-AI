# Ustad AI

AI-powered home repair marketplace for Pakistan. Customers describe a problem in Roman Urdu, Urdu, or English — Ustad matches them with verified nearby workers and handles the full lifecycle from request to payment.

Built for the Alibaba AI Hackathon 2026.

---

## What It Does

A customer holds a button, describes a leaking pipe or dead outlet in their own words. Ustad understands the problem using Gemini, determines the category (plumber, electrician, AC technician, carpenter), estimates urgency, and broadcasts the job to qualified workers within a configurable radius. Workers respond, the customer picks one, and both track each other in real time on a map until the job is done.

---

## Features

### Voice-First Job Creation
Customers record audio or type text. AssemblyAI transcribes voice in Urdu or English; Gemini analyzes the transcript to extract category, skills, urgency, and price estimate. If confidence is low, Ustad asks a clarification question in Roman Urdu before proceeding.

### AI Job Understanding
Two-round analysis pipeline:
- **Round 1**: Gemini classifies the job into a category, extracts required skills, estimates urgency, and provides a PKR price range.
- **Round 2** (optional): If the model is unsure, it asks the customer a short clarifying question with checkbox-friendly options.
- **Fallback engine**: When Gemini or AssemblyAI is unavailable, a keyword-based analyzer classifies jobs from the same canonical skill taxonomy.

### Worker Matching & Ranking
Weighted scoring across five dimensions:
- Skill match (30%)
- Distance (25%)
- Reliability — completion rate, response rate, cancellation rate (20%)
- Ustad score (15%)
- Response rate (10%)

Emergency jobs get a +10 bonus for workers who opted into emergency service. Verified workers get a +5 bonus. The system handles geo-bounding-box queries via MongoDB 2dsphere indexes.

### Real-Time Tracking
Both customer and worker see each other's live location on a Leaflet map with Socket.IO. Routes are precomputed using the OSRM public API. Adjustable map/panel split via draggable slider handle on all tracking pages.

### Multi-Round Pricing
- AI-estimated price range per category (e.g., plumber: 800–1500 PKR)
- Customer makes an offer
- Worker can counter (validated within 0.5x–2x of customer offer)
- Final price agreed before work begins
- Inspection fee charged upfront

### Job State Machine
14 states with actor-based transition permissions (customer, worker, system):

```
DRAFT → ANALYZING → WAITING_FOR_CUSTOMER → READY_TO_MATCH → BROADCASTING
→ WORKER_RESPONSES → CUSTOMER_SELECTING → ACCEPTED → EN_ROUTE → ARRIVED
→ IN_PROGRESS → AWAITING_CUSTOMER_CONFIRMATION → COMPLETED
```

Terminal states: COMPLETED, CANCELLED, EXPIRED, DISPUTED.

### Profile Pictures
Cloudinary unsigned upload for both customer and worker profiles. Profile images appear across match cards, review screens, and the active job tracking view.

---

## Architecture

```
ustad/
├── contracts/          Shared TypeScript interfaces (Job, Worker, API, AI)
├── server/             Express + Mongoose + Socket.IO
│   └── src/
│       ├── models/         User, Worker, Job, Offer, Review, Broadcast
│       ├── routes/         auth, jobs, workers, requests, ai, photos, routes, health
│       ├── lib/
│       │   ├── job/        ai.ts (Gemini+AssemblyAI), analyze.ts (fallback), state-machine.ts, pricing.ts
│       │   ├── matching.ts Worker scoring & geo queries
│       │   ├── geo.ts      Haversine, bounding box
│       │   ├── socket.ts   Socket.IO setup
│       │   └── mongodb.ts  Mongoose connection
│       └── scripts/        seed.ts
├── client/             Next.js 14 + React 18 + Tailwind + Leaflet
│   └── src/
│       ├── app/            Next.js App Router pages
│       │   ├── dashboard/
│       │   │   ├── customer/   home, new-work, active, track, result, jobs, chat, profile, demo
│       │   │   └── worker/     dashboard, active, inspection, work, jobs, stats, chat, profile
│       │   └── login/
│       └── client/
│           ├── components/
│           │   ├── tracking/   TrackingMap, LiveWorkerLocation, LiveCustomerLocation, JobRoute
│           │   ├── matching/   MatchResults, ReviewScreen, WorkerCard
│           │   ├── ProfileAvatar, CloudinaryUpload
│           │   ├── MicVisualizer, VoiceCapture, AudioWaveform
│           │   └── ui/         Button, Card, GlassCard, Badge, StatusBadge, etc.
│           └── hooks/      useSocket, useAuth, useGeolocation, useWorkerLocation
```

### Shared Contracts
The `contracts/` package defines all TypeScript interfaces shared between server and client — job statuses, worker categories, API response envelopes, pricing validation, and geo utilities (haversine distance, bounding box, ETA estimation).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Animations | Framer Motion, GSAP, CSS custom animations |
| Maps | Leaflet + OpenStreetMap tiles |
| Real-time | Socket.IO (client + server) |
| Charts | Recharts |
| Backend | Express 4, TypeScript, tsx |
| Database | MongoDB + Mongoose 8 (2dsphere geo indexes) |
| AI | Google Gemini (job understanding), AssemblyAI (speech-to-text) |
| Media | Cloudinary (profile image upload) |
| Routing | OSRM public API (job route computation) |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel (client), Render (server) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- API keys: Gemini, AssemblyAI, Cloudinary

### 1. Clone and install

```bash
git clone <repo-url> && cd ustad
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Environment variables

Copy the example and fill in your keys:

```bash
cp .env.example .env
```

Required variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ustad

# Server
PORT=5000
CLIENT_URL=http://localhost:3001

# AI
GEMINI_API_KEY=<your-gemini-key>
ASSEMBLYAI_API_KEY=<your-assemblyai-key>

# Cloudinary
CLOUDINARY_CLOUD_NAME=dbbrfcgpv
CLOUDINARY_API_KEY=918617413785261
CLOUDINARY_API_SECRET=g4rPd_qH_jcR3CjXrpzjw3z3dow

# Client (NEXT_PUBLIC_ prefix for browser access)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dbbrfcgpv
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=ustad_uploads
NEXT_PUBLIC_CARTO_API_KEY=<optional, for basemap tiles>
```

### 3. Seed the database

```bash
cd server && npm run seed && cd ..
```

Creates test users, workers across all four categories, and sample jobs.

### 4. Run

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

Server runs on `http://localhost:5000`, client on `http://localhost:3001`.

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register (customer or worker) |
| POST | `/api/auth/login` | Email + password login |
| GET | `/api/auth/me` | Current session user |
| PATCH | `/api/auth/profile-image` | Upload customer profile image |
| POST | `/api/jobs` | Create job from voice/text |
| GET | `/api/jobs` | List jobs for current user |
| GET | `/api/jobs/:id` | Get job detail |
| POST | `/api/jobs/:id/offer` | Submit customer offer |
| PATCH | `/api/jobs/:id/accept` | Accept a worker |
| PATCH | `/api/jobs/:id/status` | Update job status |
| GET | `/api/workers/dashboard` | Worker dashboard data |
| PATCH | `/api/workers/me/profile-image` | Upload worker profile image |
| PATCH | `/api/workers/me/location` | Update worker location |
| POST | `/api/requests/offer` | Worker submits counter-offer |
| POST | `/api/ai/understand` | Analyze job input (text/image) |
| POST | `/api/ai/transcribe` | Transcribe audio file |
| POST | `/api/photos/upload` | Upload job photo |
| POST | `/api/routes/compute` | Compute route via OSRM |

---

## Database Models

**User** — email, password_hash, role (customer/worker/admin), phone, language (ur/en), location (GeoJSON Point), profile_image, stats (rating, trust score, cancellations).

**Worker** — user_id (ref), name, profile_image, category (plumber/electrician/ac_technician/carpenter), skills[], is_online, is_available, emergency_available, verified, verification_level, location (GeoJSON Point), ustad_score, completed_jobs, response_rate, cancellation_rate, average_rating.

**Job** — customer_id (ref), status (14-state enum), input (type, original_text, transcript, photo_ids), understanding (category, subcategory, description, required_skills, urgency, safety_flags, confidence, complexity), location (GeoJSON Point + address_label), pricing (estimate_min/max, inspection_fee, customer_offer, worker_counter_offer, final_price, currency, status), matching (search_radius_km, broadcast_round, eligible_workers_count, selected_worker_id), completion (before/after photos, note, customer_confirmed), route (polyline, distance, duration).

**Offer** — job_id, worker_id, type (broadcast_response/direct_request), status (pending/accepted/rejected/countered/expired), price, counter_price, message.

**Review** — job_id, customer_id, worker_id, rating (1–5), tags[], text.

**Broadcast** — job_id, search_radius_km, eligible_worker_ids[], round, status.

---

## Deployment

### Vercel (Client)
- Framework: Next.js
- Build command: `cd client && npm install && npm run build`
- Output: `.next`
- Env vars: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### Render (Server)
- Build command: `cd server && npm install && npm run build`
- Start command: `cd server && node --import tsx/esm dist/index.js`
- Env vars: all server-side vars from `.env.example`

---

## License

MIT
