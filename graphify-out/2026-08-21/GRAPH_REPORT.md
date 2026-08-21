# Graph Report - Ustad Ai  (2026-08-21)

## Corpus Check
- 200 files · ~86,404 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1076 nodes · 2424 edges · 93 communities (65 shown, 28 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `868dbda5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fail
- select-worker/route.test.ts
- detail.ts
- WorkerResults.tsx
- Graphify Tool
- signup/route.ts
- analyze.ts
- devDependencies
- matching.ts
- compilerOptions
- dependencies
- fileToPhotoBase64
- VoiceCapture.tsx
- AcceptJobButton
- dashboard.ts
- cancel/route.test.ts
- jobs/route.test.ts
- login/page.tsx
- extends
- opencode.json
- Worker
- graphify.js
- postcss.config.mjs
- app/layout.tsx
- next.config.mjs
- tailwind.config.ts
- God Nodes Analysis
- Obsidian Vault Export
- ai.ts
- auth.ts
- WorkerDashboard.tsx
- stream/route.ts
- WorkerHome.tsx
- stream/route.test.ts
- Upload.ts
- User.ts
- connectDB
- FlowError
- flow.ts
- index.ts
- messages/route.ts
- broadcast/route.ts
- customer/jobs/page.tsx
- Real-Time GPS Tracking Integration Plan
- CustomerRequestsPanel.tsx
- scripts
- WorkerCategory
- safety.ts
- pricing.ts
- package.json
- requireRole
- seed.ts
- [id]/respond/route.ts
- DirectRequestCard.tsx
- BottomNav.tsx
- TrackingMap.tsx
- requests.ts
- tsx
- @types/node
- @types/react
- NewWorkWizard
- vitest
- understand/route.ts
- state-machine.ts
- NewWorkWizard.tsx
- TDD Evidence Report: Service Marketplace Features
- flow.test.ts
- search/route.ts
- WorkerWorkPageClient.tsx
- track/page.tsx
- status/route.ts
- offers/route.test.ts
- WorkerChat
- NewWorkWizard.test.tsx
- Offer.ts
- media/route.test.ts
- LogoutButton
- TrackingPreview.tsx
- reject-offer/route.test.ts
- status/route.test.ts
- @testing-library/jest-dom
- @types/leaflet
- jsdom
- JobEvent.ts
- WorkerChatPageClient
- Worker.ts
- Session.ts
- eslint
- display.ts

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 113 edges
2. `connectDB()` - 82 edges
3. `fail()` - 69 edges
4. `ok()` - 68 edges
5. `authError()` - 63 edges
6. `Worker` - 46 edges
7. `FlowError` - 33 edges
8. `Job` - 21 edges
9. `Graphify Tool` - 21 edges
10. `haversineDistanceKm()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `ActiveJobPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/active/page.tsx → src/lib/auth.ts
- `CustomerJobsPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/jobs/page.tsx → src/lib/auth.ts
- `NewWorkPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/new-work/page.tsx → src/lib/auth.ts
- `CustomerHomePage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/page.tsx → src/lib/auth.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (93 total, 28 thin omitted)

### Community 0 - "fail"
Cohesion: 0.09
Nodes (41): dynamic, POST(), bodySchema, dynamic, POST(), dynamic, POST(), bodySchema (+33 more)

### Community 1 - "select-worker/route.test.ts"
Cohesion: 0.18
Nodes (5): CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, confirmJobDetails()

### Community 2 - "detail.ts"
Cohesion: 0.11
Nodes (13): CUSTOMER_SESSION, FlowError, JOB, getJobDetail(), JobDetail, JobResponder, JobResponderOffer, JobResponderWorker (+5 more)

### Community 3 - "WorkerResults.tsx"
Cohesion: 0.16
Nodes (8): formatRs(), JobDetailResponse, Responder, ResponderOffer, ResponderWorker, fetchMock, WorkerResults(), WorkerResultsProps

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "signup/route.ts"
Cohesion: 0.09
Nodes (30): dynamic, POST(), dynamic, GET(), bodySchema, dynamic, POST(), setSessionCookie() (+22 more)

### Community 6 - "analyze.ts"
Cohesion: 0.14
Nodes (16): GEMINI_MODEL, analyzeJobInput(), CATEGORY_ESTIMATES, complexityFor(), deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+8 more)

### Community 7 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint-config-next, devDependencies, eslint-config-next, postcss, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react-dom (+9 more)

### Community 8 - "matching.ts"
Cohesion: 0.07
Nodes (40): app, handle, port, GET(), job, WORKER_SESSION, buildBoundingBox(), EARTH_RADIUS_KM (+32 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.12
Nodes (17): mongoose, dependencies, leaflet, mongoose, next, react, react-dom, socket.io (+9 more)

### Community 11 - "fileToPhotoBase64"
Cohesion: 0.14
Nodes (16): NEXT_ACTIONS, PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, JobPhotoUpload() (+8 more)

### Community 12 - "VoiceCapture.tsx"
Cohesion: 0.08
Nodes (22): CustomerHomePage(), dynamic, ActiveJob, ActiveJobStatusBar(), STATUS_CONFIG, CATEGORY_LABELS, currency(), TechnicianRequestModal() (+14 more)

### Community 14 - "dashboard.ts"
Cohesion: 0.16
Nodes (14): CounterOfferModal(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB, NOW (+6 more)

### Community 16 - "jobs/route.test.ts"
Cohesion: 0.33
Nodes (3): ANALYZED_JOB, CUSTOMER_SESSION, FlowError

### Community 17 - "login/page.tsx"
Cohesion: 0.20
Nodes (7): AuthForm(), submit(), CATEGORY_LABELS, destinationFor(), Mode, Role, CANONICAL_SKILLS

### Community 18 - "extends"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 19 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 20 - "Worker"
Cohesion: 0.17
Nodes (11): dynamic, GET(), DASHBOARD, WORKER_SESSION, bodySchema, dynamic, PATCH(), POSITION (+3 more)

### Community 31 - "ai.ts"
Cohesion: 0.16
Nodes (17): AiImageInput, AiUnderstandOptions, coerceDisplayArray(), coerceNumber(), coerceToArray(), DEFAULT_CLARIFICATION_OPTIONS, geminiEndpoint(), GeminiRawJob (+9 more)

### Community 32 - "auth.ts"
Cohesion: 0.13
Nodes (15): dynamic, POST(), CUSTOMER_SESSION, JPEG_PNG, dynamic, GET(), PNG, WORKER_SESSION (+7 more)

### Community 33 - "WorkerDashboard.tsx"
Cohesion: 0.21
Nodes (8): ActiveJob, ActiveJobPanel(), NEXT_ACTIONS, STATUS_LABELS, WorkerActiveJob(), fetchMock, WorkerDashboard(), useJobStream()

### Community 34 - "stream/route.ts"
Cohesion: 0.24
Nodes (8): dynamic, GET(), getAccessibleJob(), createJobStream(), JobStreamEvent, JobStreamMessage, JobStreamOptions, DECODER

### Community 35 - "WorkerHome.tsx"
Cohesion: 0.22
Nodes (9): Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic(), WorkerHome(), WorkerProfile(), AvailabilityState (+1 more)

### Community 36 - "stream/route.test.ts"
Cohesion: 0.29
Nodes (4): CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION

### Community 38 - "User.ts"
Cohesion: 0.33
Nodes (5): SessionUser, USER_ROLES, UserDoc, UserRole, userSchema

### Community 39 - "connectDB"
Cohesion: 0.08
Nodes (30): dynamic, GET(), bodySchema, dynamic, POST(), dynamic, GET(), ChatPageProps (+22 more)

### Community 40 - "FlowError"
Cohesion: 0.29
Nodes (3): FlowError, WORKER_SESSION, FlowError

### Community 41 - "flow.ts"
Cohesion: 0.23
Nodes (24): analysisTextFor(), AttachPhotoInput, createAndAnalyzeJob(), customerCancelJob(), customerRejectWorker(), customerSelectWorker(), formatPrice(), guardJourney() (+16 more)

### Community 42 - "index.ts"
Cohesion: 0.26
Nodes (10): INPUT_TYPES, JOB_STATUSES, jobSchema, PRICING_STATUSES, Message, MessageDoc, messageSchema, MessageSenderType (+2 more)

### Community 43 - "messages/route.ts"
Cohesion: 0.27
Nodes (10): dynamic, GET(), POST(), postSchema, CUSTOMER_SESSION, WORKER_SESSION, ChatMessageView, listJobMessages() (+2 more)

### Community 44 - "broadcast/route.ts"
Cohesion: 0.27
Nodes (6): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, submitOfferAndBroadcast()

### Community 45 - "customer/jobs/page.tsx"
Cohesion: 0.33
Nodes (5): CustomerJobsPage(), dynamic, CustomerJobsList(), JobItem, STATUS_LABELS

### Community 46 - "Real-Time GPS Tracking Integration Plan"
Cohesion: 0.06
Nodes (33): 1.1 Install Dependencies, 1.2 Create Socket.io Server (`src/lib/socket.ts`), 1.3 Create Socket.io API Route (`src/app/api/socketio/route.ts`), 1.4 Socket.io Events, 1.5 Room Isolation, 2.1 New Component: `src/components/worker/LiveTracker.tsx`, 2.2 Integration with `ActiveJobPanel.tsx`, 3.1 Install React Leaflet (+25 more)

### Community 47 - "CustomerRequestsPanel.tsx"
Cohesion: 0.17
Nodes (11): ApprovalJob, CustomerApprovalPanel(), CATEGORY_LABELS, currency(), CustomerRequestsPanel(), handleCounterResponse(), ListResponse, postJson() (+3 more)

### Community 48 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, dev:next, lint, seed, start, test

### Community 49 - "WorkerCategory"
Cohesion: 0.33
Nodes (7): AiUnderstandResult, AnalysisResult, KeywordRule, ComplexityLevel, WorkerOptionsFilters, WorkerResult, WorkerCategory

### Community 50 - "safety.ts"
Cohesion: 0.40
Nodes (4): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, getSafetyGuidance(), SafetyGuidance

### Community 51 - "pricing.ts"
Cohesion: 0.33
Nodes (8): BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput, TravelCostEstimate

### Community 52 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 53 - "requireRole"
Cohesion: 0.16
Nodes (13): bodySchema, dynamic, POST(), dynamic, GET(), isCoordinatePair(), OsrmResponse, routeQuerySchema (+5 more)

### Community 54 - "seed.ts"
Cohesion: 0.33
Nodes (5): disconnectDB(), Review, ReviewDoc, reviewSchema, main()

### Community 55 - "[id]/respond/route.ts"
Cohesion: 0.16
Nodes (12): bodySchema, dynamic, POST(), bodySchema, dynamic, POST(), bodySchema, dynamic (+4 more)

### Community 56 - "DirectRequestCard.tsx"
Cohesion: 0.39
Nodes (7): CATEGORY_LABELS, currency(), DirectRequestCard(), act(), submitCounter(), postJson(), DirectRequestView

### Community 57 - "BottomNav.tsx"
Cohesion: 0.22
Nodes (11): DashboardLayout(), DashboardPage(), BottomNav(), BriefcaseIcon(), ClipboardCheckIcon(), HomeIcon(), MapIcon(), NavItem (+3 more)

### Community 58 - "TrackingMap.tsx"
Cohesion: 0.06
Nodes (29): ActiveJobPage(), dynamic, TrackingMap, TrackingPageClient(), connect(), TrackingPageClientProps, ActiveJob, ActiveJobTracking() (+21 more)

### Community 59 - "requests.ts"
Cohesion: 0.13
Nodes (17): CustomerOfferModal(), submit(), COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_HIGH_FACTOR, OFFER_LOW_FACTOR, offerIsExpired() (+9 more)

### Community 63 - "NewWorkWizard"
Cohesion: 0.17
Nodes (9): dynamic, NewWorkPage(), humanize(), NewWorkWizard(), handleConfirm(), handleEditDetails(), handleLocation(), parseJson() (+1 more)

### Community 65 - "understand/route.ts"
Cohesion: 0.40
Nodes (4): dynamic, POST(), fallbackResult(), understandJobInput()

### Community 66 - "state-machine.ts"
Cohesion: 0.20
Nodes (13): JobInputPayload, ACTOR_ALLOWANCES, assertAllowedTransition(), canTransition(), DeadlineFields, EMERGENCY_ACCEPTANCE_MINUTES, JobActor, NORMAL_ACCEPTANCE_MINUTES (+5 more)

### Community 67 - "NewWorkWizard.tsx"
Cohesion: 0.18
Nodes (10): AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, JobInput, LocationState, RADIUS_OPTIONS (+2 more)

### Community 68 - "TDD Evidence Report: Service Marketplace Features"
Cohesion: 0.18
Nodes (10): Coverage and Known Gaps, Follow-up: Clarification and Travel Pricing, Merge Evidence, P1: Authentication System, P2: Voice AI Matching Optimization, P3: Technician Recommendation & Job Request, Source Plan, Task Report (+2 more)

### Community 69 - "flow.test.ts"
Cohesion: 0.24
Nodes (8): applyUpdate(), INPUT, mockFindOneAndUpdate(), NOW, pushByPath(), setByPath(), JobStatus, JobEvent

### Community 70 - "search/route.ts"
Cohesion: 0.17
Nodes (9): dynamic, GET(), querySchema, dynamic, GET(), querySchema, CUSTOMER_SESSION, URGENCY_LEVELS (+1 more)

### Community 71 - "WorkerWorkPageClient.tsx"
Cohesion: 0.29
Nodes (3): NEXT_ACTIONS, STATUS_LABELS, WorkerWorkPageClient()

### Community 72 - "track/page.tsx"
Cohesion: 0.40
Nodes (4): CustomerTrackPage(), dynamic, TrackingJob, TrackingJobsList()

### Community 73 - "status/route.ts"
Cohesion: 0.40
Nodes (4): bodySchema, dynamic, POST(), statusSchema

### Community 75 - "WorkerChat"
Cohesion: 0.47
Nodes (5): CustomerChatPageClient(), WorkerChat(), send(), sendLocation(), sendPhoto()

### Community 77 - "Offer.ts"
Cohesion: 0.40
Nodes (4): OFFER_STATUSES, OFFER_TYPES, OfferDoc, offerSchema

### Community 87 - "JobEvent.ts"
Cohesion: 0.50
Nodes (3): ACTOR_TYPES, JobEventDoc, jobEventSchema

### Community 89 - "Worker.ts"
Cohesion: 0.40
Nodes (4): VERIFICATION_LEVELS, VerificationLevel, WorkerDoc, workerSchema

## Knowledge Gaps
- **369 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `fail`, `select-worker/route.test.ts`, `detail.ts`, `matching.ts`, `VoiceCapture.tsx`, `cancel/route.test.ts`, `jobs/route.test.ts`, `Worker`, `auth.ts`, `stream/route.ts`, `stream/route.test.ts`, `connectDB`, `FlowError`, `messages/route.ts`, `broadcast/route.ts`, `customer/jobs/page.tsx`, `[id]/respond/route.ts`, `BottomNav.tsx`, `TrackingMap.tsx`, `NewWorkWizard`, `search/route.ts`, `track/page.tsx`, `status/route.ts`, `offers/route.test.ts`, `media/route.test.ts`, `reject-offer/route.test.ts`, `status/route.test.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `haversineDistanceKm()` connect `matching.ts` to `detail.ts`, `search/route.ts`, `dashboard.ts`, `Worker`, `TrackingMap.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `connectDB` to `fail`, `auth.ts`, `stream/route.ts`, `detail.ts`, `signup/route.ts`, `search/route.ts`, `matching.ts`, `status/route.ts`, `messages/route.ts`, `dashboard.ts`, `Worker`, `requireRole`, `seed.ts`, `[id]/respond/route.ts`, `BottomNav.tsx`, `requests.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.09294199860237597 - nodes in this community are weakly interconnected._
- **Should `detail.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10822510822510822 - nodes in this community are weakly interconnected._
- **Should `Graphify Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._