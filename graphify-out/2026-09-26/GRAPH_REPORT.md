# Graph Report - Ustad Ai  (2026-08-29)

## Corpus Check
- 229 files · ~111,815 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1243 nodes · 2784 edges · 99 communities (79 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3525c5e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fail
- WorkerProfile.tsx
- VoiceCapture.tsx
- NewWorkWizard.tsx
- Graphify Tool
- seed.ts
- analyze.ts
- devDependencies
- matching.ts
- compilerOptions
- dependencies
- fileToPhotoBase64
- WorkerDashboard.tsx
- AcceptJobButton
- dashboard.ts
- select-worker/route.test.ts
- jobs/route.test.ts
- context.tsx
- extends
- opencode.json
- location/route.ts
- graphify.js
- postcss.config.mjs
- flow-route-push.test.ts
- next.config.mjs
- tailwind.config.ts
- God Nodes Analysis
- Obsidian Vault Export
- ai.ts
- photos/route.test.ts
- MatchResults.tsx
- JobEvent.ts
- counter-response/route.ts
- VoiceCapture.test.tsx
- customer/chat/[jobId]/page.tsx
- index.ts
- requireRole
- status/route.ts
- flow.ts
- LoadingState.tsx
- chat.ts
- socket-client.ts
- parseApiResponse
- Real-Time GPS Tracking Integration Plan
- CustomerRequestsPanel.tsx
- scripts
- WorkerCategory
- DirectRequestCard.tsx
- pricing.ts
- Worker
- routes/route.ts
- jobs/[id]/route.ts
- dev-monitor.sh
- WorkerActiveTracking.tsx
- WorkerResults.tsx
- ActiveJobTracking.tsx
- offers.ts
- Job
- WorkerWorkPageClient.tsx
- theme-contract.test.ts
- TechnicianRequestModal.tsx
- e2e-workflow.test.ts
- socket-handlers.ts
- state-machine.ts
- TDD Evidence Report: Instant Tracking Routes
- TDD Evidence Report: Service Marketplace Features
- flow.test.ts
- TrackingMap.tsx
- jobs/photos/route.ts
- track/page.tsx
- leaflet
- track/[jobId]/page.tsx
- dashboard/route.ts
- safety.ts
- @types/react-dom
- @testing-library/user-event
- LogoutButton
- TrackingPreview.tsx
- auth.ts
- @vitejs/plugin-react
- haversineDistanceKm
- requests.ts
- media/route.ts
- TDD Evidence Report: Voice Capture Hardening
- stream/route.test.ts
- offers/route.ts
- User.ts
- eslint-config-next
- requests/route.ts
- NewWorkWizard.test.tsx
- Review.ts
- WorkerChatPageClient
- postcss
- display.ts

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 113 edges
2. `connectDB()` - 84 edges
3. `fail()` - 77 edges
4. `ok()` - 72 edges
5. `authError()` - 65 edges
6. `Worker` - 50 edges
7. `FlowError` - 33 edges
8. `Job` - 24 edges
9. `Graphify Tool` - 21 edges
10. `haversineDistanceKm()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `transcribeAudio()`  [EXTRACTED]
  scripts/test-transcribe.ts → src/lib/job/ai.ts
- `shutdown()` --calls--> `disconnectDB()`  [EXTRACTED]
  server.ts → src/lib/mongodb.ts
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `ActiveJobPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/active/page.tsx → src/lib/auth.ts
- `CustomerJobsPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/jobs/page.tsx → src/lib/auth.ts

## Import Cycles
- 3-file cycle: `src/components/MatchResults.tsx -> src/components/TechnicianRequestModal.tsx -> src/components/VoiceCapture.tsx -> src/components/MatchResults.tsx`

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (99 total, 20 thin omitted)

### Community 0 - "fail"
Cohesion: 0.10
Nodes (38): dynamic, POST(), dynamic, GET(), POST(), postSchema, bodySchema, dynamic (+30 more)

### Community 1 - "WorkerProfile.tsx"
Cohesion: 0.23
Nodes (8): Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic(), WorkerProfile(), AvailabilityState, WorkerAvailability()

### Community 2 - "VoiceCapture.tsx"
Cohesion: 0.15
Nodes (15): audioFileExtension(), CATEGORY_LABELS, Coordinates, currency(), getSupportedAudioMimeType(), locationFailureMessage(), LocationFailureReason, RecordingSession (+7 more)

### Community 3 - "NewWorkWizard.tsx"
Cohesion: 0.10
Nodes (19): dynamic, NewWorkPage(), AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, humanize() (+11 more)

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "seed.ts"
Cohesion: 0.05
Nodes (49): app, handle, port, shutdown(), dynamic, GET(), bodySchema, dynamic (+41 more)

### Community 6 - "analyze.ts"
Cohesion: 0.14
Nodes (16): GEMINI_MODEL, analyzeJobInput(), CATEGORY_ESTIMATES, complexityFor(), deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+8 more)

### Community 7 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, jsdom, devDependencies, eslint, jsdom, tailwindcss, @testing-library/jest-dom, @testing-library/react (+15 more)

### Community 8 - "matching.ts"
Cohesion: 0.12
Nodes (23): CUSTOMER_SESSION, canonicalizeSkill(), clamp(), CompletenessSignals, EMERGENCY_CAPABILITY_BONUS, FRESH_LOCATION_DAYS, getWorkerOptions(), getWorkerResults() (+15 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): clsx, framer-motion, lucide-react, mongoose, dependencies, clsx, framer-motion, lucide-react (+17 more)

### Community 11 - "fileToPhotoBase64"
Cohesion: 0.14
Nodes (16): NEXT_ACTIONS, PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, JobPhotoUpload() (+8 more)

### Community 12 - "WorkerDashboard.tsx"
Cohesion: 0.21
Nodes (8): ActiveJob, ActiveJobPanel(), NEXT_ACTIONS, STATUS_LABELS, WorkerActiveJob(), fetchMock, WorkerDashboard(), useJobStream()

### Community 14 - "dashboard.ts"
Cohesion: 0.15
Nodes (15): CounterOfferModal(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB, NOW (+7 more)

### Community 16 - "jobs/route.test.ts"
Cohesion: 0.33
Nodes (3): ANALYZED_JOB, CUSTOMER_SESSION, FlowError

### Community 17 - "context.tsx"
Cohesion: 0.07
Nodes (32): CustomerHomePage(), dynamic, DashboardLayout(), DashboardPage(), metadata, AuthForm(), submit(), destinationFor() (+24 more)

### Community 18 - "extends"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 19 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 20 - "location/route.ts"
Cohesion: 0.29
Nodes (5): bodySchema, dynamic, PATCH(), POSITION, WORKER_SESSION

### Community 23 - "flow-route-push.test.ts"
Cohesion: 0.19
Nodes (8): acceptedJob, route, computeAndStoreRoute(), isCoordinatePair(), OsrmResponse, findOneAndUpdate, getIO(), JobEvent

### Community 31 - "ai.ts"
Cohesion: 0.11
Nodes (27): main(), POST(), AiImageInput, AiUnderstandOptions, ASSEMBLYAI_LANGUAGE_CODE, coerceDisplayArray(), coerceNumber(), coerceToArray() (+19 more)

### Community 32 - "photos/route.test.ts"
Cohesion: 0.18
Nodes (7): CUSTOMER_SESSION, JPEG_PNG, PNG, WORKER_SESSION, Upload, UploadDoc, uploadSchema

### Community 33 - "MatchResults.tsx"
Cohesion: 0.21
Nodes (11): Avatar(), CATEGORY_LABELS, formatPKR(), initials(), MatchResults(), MatchResultsData, MatchResultsProps, URGENCY_DOT (+3 more)

### Community 34 - "JobEvent.ts"
Cohesion: 0.50
Nodes (3): ACTOR_TYPES, JobEventDoc, jobEventSchema

### Community 35 - "counter-response/route.ts"
Cohesion: 0.16
Nodes (12): bodySchema, dynamic, POST(), bodySchema, dynamic, POST(), bodySchema, dynamic (+4 more)

### Community 36 - "VoiceCapture.test.tsx"
Cohesion: 0.15
Nodes (6): FakeAnalyser, FakeAudioContext, FakeMediaRecorder, fetchMock, UNDERSTANDING, WORKERS

### Community 37 - "customer/chat/[jobId]/page.tsx"
Cohesion: 0.31
Nodes (7): CustomerChatPageClient(), ChatPageProps, dynamic, WorkerChat(), send(), sendLocation(), sendPhoto()

### Community 38 - "index.ts"
Cohesion: 0.18
Nodes (14): MessageDoc, messageSchema, MessageSenderType, SENDER_TYPES, SYSTEM_SENDER_ID, OFFER_STATUSES, OFFER_TYPES, OfferDoc (+6 more)

### Community 39 - "requireRole"
Cohesion: 0.10
Nodes (29): dynamic, GET(), bodySchema, dynamic, POST(), dynamic, GET(), CustomerChatPage() (+21 more)

### Community 40 - "status/route.ts"
Cohesion: 0.22
Nodes (6): bodySchema, dynamic, POST(), statusSchema, FlowError, WORKER_SESSION

### Community 41 - "flow.ts"
Cohesion: 0.21
Nodes (26): AttachPhotoInput, confirmJobDetails(), customerCancelJob(), customerRejectWorker(), customerSelectWorker(), formatPrice(), guardJourney(), markExpired() (+18 more)

### Community 42 - "LoadingState.tsx"
Cohesion: 0.14
Nodes (11): EASE_OUT, EmptyState(), EmptyStateIcon, EmptyStateProps, EASE_OUT, LoadingState(), LoadingStateProps, LoadingStateType (+3 more)

### Community 43 - "chat.ts"
Cohesion: 0.18
Nodes (12): CUSTOMER_SESSION, WORKER_SESSION, ChatMessageView, getAccessibleJob(), listJobMessages(), sendJobMessage(), SendMessageInput, createJobStream() (+4 more)

### Community 44 - "socket-client.ts"
Cohesion: 0.22
Nodes (6): LiveTracker(), LiveTrackerProps, WorkerActiveTracking(), connect(), connectSocket(), getSocket()

### Community 45 - "parseApiResponse"
Cohesion: 0.19
Nodes (8): CustomerJobsPage(), dynamic, ApprovalJob, CustomerApprovalPanel(), CustomerJobsList(), JobItem, STATUS_LABELS, parseApiResponse()

### Community 46 - "Real-Time GPS Tracking Integration Plan"
Cohesion: 0.06
Nodes (33): 1.1 Install Dependencies, 1.2 Create Socket.io Server (`src/lib/socket.ts`), 1.3 Create Socket.io API Route (`src/app/api/socketio/route.ts`), 1.4 Socket.io Events, 1.5 Room Isolation, 2.1 New Component: `src/components/worker/LiveTracker.tsx`, 2.2 Integration with `ActiveJobPanel.tsx`, 3.1 Install React Leaflet (+25 more)

### Community 47 - "CustomerRequestsPanel.tsx"
Cohesion: 0.28
Nodes (8): CATEGORY_LABELS, currency(), CustomerRequestsPanel(), handleCounterResponse(), ListResponse, postJson(), RequestItem, STATUS_LABELS

### Community 48 - "scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, dev:next, lint, seed (+3 more)

### Community 49 - "WorkerCategory"
Cohesion: 0.24
Nodes (11): dynamic, AnalysisResult, KeywordRule, JobInputPayload, ComplexityLevel, MatchContext, SearchFilters, WorkerOptionsFilters (+3 more)

### Community 50 - "DirectRequestCard.tsx"
Cohesion: 0.39
Nodes (7): CATEGORY_LABELS, currency(), DirectRequestCard(), act(), submitCounter(), postJson(), DirectRequestView

### Community 51 - "pricing.ts"
Cohesion: 0.33
Nodes (8): BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput, TravelCostEstimate

### Community 52 - "Worker"
Cohesion: 0.17
Nodes (8): dynamic, POST(), FlowError, WORKER_SESSION, GET(), job, WORKER_SESSION, Worker

### Community 53 - "routes/route.ts"
Cohesion: 0.24
Nodes (10): CacheEntry, cacheGet(), cacheKey(), cacheSet(), dynamic, GET(), isCoordinatePair(), OsrmResponse (+2 more)

### Community 54 - "jobs/[id]/route.ts"
Cohesion: 0.17
Nodes (10): dynamic, GET(), patchSchema, CUSTOMER_SESSION, FlowError, JOB, getJobDetail(), analysisTextFor() (+2 more)

### Community 55 - "dev-monitor.sh"
Cohesion: 0.83
Nodes (3): cleanup(), log(), dev-monitor.sh script

### Community 56 - "WorkerActiveTracking.tsx"
Cohesion: 0.24
Nodes (9): TrackingPageClientProps, MapFallback(), TrackingMap, ActiveJob, NEXT_ACTIONS, STATUS_LABELS, PrecomputedRoute, RouteComputedPayload (+1 more)

### Community 57 - "WorkerResults.tsx"
Cohesion: 0.16
Nodes (8): formatRs(), JobDetailResponse, Responder, ResponderOffer, ResponderWorker, fetchMock, WorkerResults(), WorkerResultsProps

### Community 58 - "ActiveJobTracking.tsx"
Cohesion: 0.16
Nodes (8): ActiveJobPage(), dynamic, ActiveJob, ActiveJobTracking(), connect(), STATUS_LABELS, ReviewScreen(), ReviewScreenProps

### Community 59 - "offers.ts"
Cohesion: 0.24
Nodes (10): CustomerOfferModal(), submit(), COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_LOW_FACTOR, offerIsExpired(), OfferValidation (+2 more)

### Community 60 - "Job"
Cohesion: 0.22
Nodes (6): JobResponder, JobResponderOffer, JobResponderWorker, NOW, Job, Offer

### Community 61 - "WorkerWorkPageClient.tsx"
Cohesion: 0.29
Nodes (3): NEXT_ACTIONS, STATUS_LABELS, WorkerWorkPageClient()

### Community 63 - "TechnicianRequestModal.tsx"
Cohesion: 0.39
Nodes (6): CATEGORY_LABELS, currency(), TechnicianRequestModal(), TechnicianRequestModalProps, UnderstandResponse, WorkerOption

### Community 64 - "e2e-workflow.test.ts"
Cohesion: 0.11
Nodes (15): NOW, JobDetail, EMERGENCY_INPUT, NORMAL_INPUT, NOW, BroadcastResult, WorkerOfferResult, searchEligibleWorkers() (+7 more)

### Community 65 - "socket-handlers.ts"
Cohesion: 0.31
Nodes (5): isRoutePoint(), registerSocketHandlers(), route, TestSocket, toRoutePayload()

### Community 66 - "state-machine.ts"
Cohesion: 0.18
Nodes (14): ACTOR_ALLOWANCES, assertAllowedTransition(), canTransition(), DeadlineFields, EMERGENCY_ACCEPTANCE_MINUTES, JobActor, NORMAL_ACCEPTANCE_MINUTES, resolveAcceptanceDeadline() (+6 more)

### Community 67 - "TDD Evidence Report: Instant Tracking Routes"
Cohesion: 0.29
Nodes (6): Coverage and Known Gaps, Merge Evidence, Task Report, TDD Evidence Report: Instant Tracking Routes, Test Specification, User Journeys

### Community 68 - "TDD Evidence Report: Service Marketplace Features"
Cohesion: 0.18
Nodes (10): Coverage and Known Gaps, Follow-up: Clarification and Travel Pricing, Merge Evidence, P1: Authentication System, P2: Voice AI Matching Optimization, P3: Technician Recommendation & Job Request, Source Plan, Task Report (+2 more)

### Community 69 - "flow.test.ts"
Cohesion: 0.31
Nodes (6): applyUpdate(), INPUT, mockFindOneAndUpdate(), NOW, pushByPath(), setByPath()

### Community 70 - "TrackingMap.tsx"
Cohesion: 0.22
Nodes (13): distanceFromPolyline(), hasValidCoordinate(), isRouteCoordinate(), perpendicularDistanceToSegment(), TrackingMap(), loadRoute(), renderRoadRoute(), TrackingMapProps (+5 more)

### Community 71 - "jobs/photos/route.ts"
Cohesion: 0.24
Nodes (7): dynamic, POST(), dynamic, POST(), MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema

### Community 72 - "track/page.tsx"
Cohesion: 0.40
Nodes (4): CustomerTrackPage(), dynamic, TrackingJob, TrackingJobsList()

### Community 74 - "track/[jobId]/page.tsx"
Cohesion: 0.25
Nodes (6): dynamic, isCoordinatePair(), TrackingPage(), TrackingPageProps, TrackingPageClient(), connect()

### Community 75 - "dashboard/route.ts"
Cohesion: 0.43
Nodes (5): dynamic, GET(), DASHBOARD, WORKER_SESSION, getWorkerDashboard()

### Community 76 - "safety.ts"
Cohesion: 0.40
Nodes (4): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, getSafetyGuidance(), SafetyGuidance

### Community 81 - "auth.ts"
Cohesion: 0.07
Nodes (21): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, bodySchema, dynamic, POST() (+13 more)

### Community 84 - "haversineDistanceKm"
Cohesion: 0.47
Nodes (7): buildBoundingBox(), EARTH_RADIUS_KM, estimateETAMinutes(), haversineDistanceKm(), isWithinRadius(), kmToDegreesRadius(), toRad()

### Community 85 - "requests.ts"
Cohesion: 0.25
Nodes (6): CounterResponseInput, CounterResponseResult, DirectRequestInput, DirectRequestResult, WorkerRespondInput, WorkerRespondResult

### Community 87 - "media/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 88 - "TDD Evidence Report: Voice Capture Hardening"
Cohesion: 0.29
Nodes (6): Coverage and Known Gaps, Merge Evidence, Task Report, TDD Evidence Report: Voice Capture Hardening, Test Specification, User Journeys

### Community 89 - "stream/route.test.ts"
Cohesion: 0.29
Nodes (4): CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION

### Community 90 - "offers/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 91 - "User.ts"
Cohesion: 0.33
Nodes (5): SessionUser, USER_ROLES, UserDoc, UserRole, userSchema

### Community 93 - "requests/route.ts"
Cohesion: 0.50
Nodes (4): bodySchema, dynamic, POST(), createDirectRequest()

### Community 95 - "Review.ts"
Cohesion: 0.50
Nodes (3): Review, ReviewDoc, reviewSchema

## Knowledge Gaps
- **431 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+426 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `fail`, `NewWorkWizard.tsx`, `matching.ts`, `select-worker/route.test.ts`, `jobs/route.test.ts`, `context.tsx`, `location/route.ts`, `photos/route.test.ts`, `counter-response/route.ts`, `customer/chat/[jobId]/page.tsx`, `status/route.ts`, `chat.ts`, `parseApiResponse`, `Worker`, `routes/route.ts`, `jobs/[id]/route.ts`, `ActiveJobTracking.tsx`, `jobs/photos/route.ts`, `track/page.tsx`, `track/[jobId]/page.tsx`, `dashboard/route.ts`, `auth.ts`, `media/route.ts`, `stream/route.test.ts`, `offers/route.ts`, `requests/route.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `requireRole` to `fail`, `seed.ts`, `matching.ts`, `dashboard.ts`, `context.tsx`, `location/route.ts`, `counter-response/route.ts`, `customer/chat/[jobId]/page.tsx`, `status/route.ts`, `chat.ts`, `Worker`, `jobs/[id]/route.ts`, `Job`, `e2e-workflow.test.ts`, `jobs/photos/route.ts`, `track/[jobId]/page.tsx`, `dashboard/route.ts`, `auth.ts`, `requests.ts`, `media/route.ts`, `offers/route.ts`, `requests/route.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `parseApiResponse()` connect `parseApiResponse` to `WorkerResults.tsx`, `VoiceCapture.tsx`, `CustomerRequestsPanel.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _431 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.0963265306122449 - nodes in this community are weakly interconnected._
- **Should `VoiceCapture.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
- **Should `NewWorkWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._