# Graph Report - Ustad Ai  (2026-08-21)

## Corpus Check
- 211 files · ~96,748 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1142 nodes · 2582 edges · 88 communities (69 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6885ea19`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fail
- select-worker/route.ts
- flow.ts
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
- confirm/route.ts
- jobs/route.test.ts
- login/page.tsx
- extends
- opencode.json
- location/route.ts
- graphify.js
- postcss.config.mjs
- app/layout.tsx
- next.config.mjs
- tailwind.config.ts
- God Nodes Analysis
- Obsidian Vault Export
- ai.ts
- jobs/photos/route.ts
- haversineDistanceKm
- stream.ts
- TrackingMap.tsx
- stream/route.test.ts
- Upload.ts
- index.ts
- connectDB
- FlowError
- e2e-workflow.test.ts
- LoadingState.tsx
- Worker
- socket-client.ts
- customer/jobs/page.tsx
- Real-Time GPS Tracking Integration Plan
- CustomerRequestsPanel.tsx
- scripts
- WorkerCategory
- safety.ts
- pricing.ts
- MatchResults.tsx
- requireRole
- VoiceCapture.test.tsx
- counter-response/route.ts
- WorkerActiveTracking.tsx
- BottomNav.tsx
- ActiveJobTracking.tsx
- requests.ts
- tsx
- TechnicianRequestModal.tsx
- @types/react
- NewWorkWizard
- Job.ts
- server.ts
- state-machine.ts
- NewWorkWizard.tsx
- TDD Evidence Report: Service Marketplace Features
- flow.test.ts
- detail.ts
- User.ts
- track/page.tsx
- customer/page.tsx
- status/route.ts
- requests/route.ts
- NewWorkWizard.test.tsx
- framer-motion
- @testing-library/user-event
- LogoutButton
- TrackingPreview.tsx
- reject-offer/route.ts
- @testing-library/jest-dom
- @types/leaflet
- jsdom
- seed.ts

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 113 edges
2. `connectDB()` - 82 edges
3. `fail()` - 77 edges
4. `ok()` - 72 edges
5. `authError()` - 65 edges
6. `Worker` - 48 edges
7. `FlowError` - 33 edges
8. `Job` - 23 edges
9. `Graphify Tool` - 21 edges
10. `haversineDistanceKm()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `shutdown()` --calls--> `disconnectDB()`  [EXTRACTED]
  server.ts → src/lib/mongodb.ts
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `ActiveJobPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/active/page.tsx → src/lib/auth.ts
- `CustomerJobsPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/jobs/page.tsx → src/lib/auth.ts
- `NewWorkPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/new-work/page.tsx → src/lib/auth.ts

## Import Cycles
- 3-file cycle: `src/components/MatchResults.tsx -> src/components/TechnicianRequestModal.tsx -> src/components/VoiceCapture.tsx -> src/components/MatchResults.tsx`

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (88 total, 19 thin omitted)

### Community 0 - "fail"
Cohesion: 0.09
Nodes (43): dynamic, GET(), bodySchema, dynamic, POST(), bodySchema, dynamic, POST() (+35 more)

### Community 1 - "select-worker/route.ts"
Cohesion: 0.27
Nodes (6): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, customerSelectWorker()

### Community 2 - "flow.ts"
Cohesion: 0.11
Nodes (17): FlowError, WORKER_SESSION, NOW, JobDetail, AttachPhotoInput, BroadcastResult, formatPrice(), rollbackClaim() (+9 more)

### Community 3 - "WorkerResults.tsx"
Cohesion: 0.16
Nodes (8): formatRs(), JobDetailResponse, Responder, ResponderOffer, ResponderWorker, fetchMock, WorkerResults(), WorkerResultsProps

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "signup/route.ts"
Cohesion: 0.09
Nodes (29): dynamic, POST(), bodySchema, dynamic, POST(), setSessionCookie(), STORED_HASH, USER_DOC (+21 more)

### Community 6 - "analyze.ts"
Cohesion: 0.14
Nodes (16): GEMINI_MODEL, analyzeJobInput(), CATEGORY_ESTIMATES, complexityFor(), deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+8 more)

### Community 7 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @testing-library/react (+13 more)

### Community 8 - "matching.ts"
Cohesion: 0.12
Nodes (24): CUSTOMER_SESSION, canonicalizeSkill(), clamp(), CompletenessSignals, EMERGENCY_CAPABILITY_BONUS, FRESH_LOCATION_DAYS, getWorkerOptions(), getWorkerResults() (+16 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.09
Nodes (23): clsx, mongoose, dependencies, clsx, leaflet, mongoose, next, react (+15 more)

### Community 11 - "fileToPhotoBase64"
Cohesion: 0.07
Nodes (31): CustomerChatPageClient(), NEXT_ACTIONS, WorkerChatPageClient(), NEXT_ACTIONS, STATUS_LABELS, WorkerWorkPageClient(), PhotoPicker(), handleFiles() (+23 more)

### Community 12 - "VoiceCapture.tsx"
Cohesion: 0.22
Nodes (7): CATEGORY_LABELS, currency(), ResultPanel(), Status, URGENCY_LABELS, VoiceCapture(), VoiceCaptureProps

### Community 14 - "dashboard.ts"
Cohesion: 0.07
Nodes (37): dynamic, GET(), DASHBOARD, WORKER_SESSION, CounterOfferModal(), CATEGORY_LABELS, currency(), DirectRequestCard() (+29 more)

### Community 15 - "confirm/route.ts"
Cohesion: 0.18
Nodes (7): CUSTOMER_SESSION, FlowError, dynamic, POST(), CUSTOMER_SESSION, FlowError, confirmJobDetails()

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

### Community 20 - "location/route.ts"
Cohesion: 0.29
Nodes (5): bodySchema, dynamic, PATCH(), POSITION, WORKER_SESSION

### Community 31 - "ai.ts"
Cohesion: 0.13
Nodes (24): POST(), AiImageInput, AiUnderstandOptions, coerceDisplayArray(), coerceNumber(), coerceToArray(), DEFAULT_CLARIFICATION_OPTIONS, mockGeminiResponse() (+16 more)

### Community 32 - "jobs/photos/route.ts"
Cohesion: 0.13
Nodes (14): dynamic, POST(), CUSTOMER_SESSION, JPEG_PNG, dynamic, GET(), PNG, WORKER_SESSION (+6 more)

### Community 33 - "haversineDistanceKm"
Cohesion: 0.38
Nodes (8): buildBoundingBox(), EARTH_RADIUS_KM, estimateETAMinutes(), haversineDistanceKm(), isWithinRadius(), kmToDegreesRadius(), toRad(), registerSocketHandlers()

### Community 34 - "stream.ts"
Cohesion: 0.18
Nodes (9): JobStreamEvent, JobStreamMessage, JobStreamOptions, DECODER, ACTOR_TYPES, JobEvent, JobEventDoc, jobEventSchema (+1 more)

### Community 35 - "TrackingMap.tsx"
Cohesion: 0.24
Nodes (8): TrackingMap, TrackingPageClientProps, hasValidCoordinate(), isRouteCoordinate(), TrackingMap(), loadRoute(), TrackingMapProps, TrackingMarker

### Community 36 - "stream/route.test.ts"
Cohesion: 0.29
Nodes (4): CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION

### Community 38 - "index.ts"
Cohesion: 0.18
Nodes (13): MessageDoc, messageSchema, MessageSenderType, SENDER_TYPES, SYSTEM_SENDER_ID, OFFER_STATUSES, OFFER_TYPES, OfferDoc (+5 more)

### Community 39 - "connectDB"
Cohesion: 0.08
Nodes (32): dynamic, GET(), GET(), job, WORKER_SESSION, bodySchema, dynamic, POST() (+24 more)

### Community 40 - "FlowError"
Cohesion: 0.25
Nodes (6): dynamic, POST(), FlowError, WORKER_SESSION, FlowError, workerAcceptJob()

### Community 41 - "e2e-workflow.test.ts"
Cohesion: 0.09
Nodes (22): FlowError, WORKER_SESSION, FlowError, WORKER_SESSION, FlowError, WORKER_SESSION, EMERGENCY_INPUT, NORMAL_INPUT (+14 more)

### Community 42 - "LoadingState.tsx"
Cohesion: 0.14
Nodes (11): EASE_OUT, EmptyState(), EmptyStateIcon, EmptyStateProps, EASE_OUT, LoadingState(), LoadingStateProps, LoadingStateType (+3 more)

### Community 43 - "Worker"
Cohesion: 0.19
Nodes (15): dynamic, GET(), POST(), postSchema, CUSTOMER_SESSION, WORKER_SESSION, dynamic, GET() (+7 more)

### Community 44 - "socket-client.ts"
Cohesion: 0.22
Nodes (6): TrackingPageClient(), connect(), LiveTracker(), LiveTrackerProps, connectSocket(), getSocket()

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
Cohesion: 0.17
Nodes (11): name, private, scripts, build, dev, dev:next, lint, seed (+3 more)

### Community 49 - "WorkerCategory"
Cohesion: 0.24
Nodes (11): dynamic, AnalysisResult, KeywordRule, JobInputPayload, ComplexityLevel, MatchContext, SearchFilters, WorkerOptionsFilters (+3 more)

### Community 50 - "safety.ts"
Cohesion: 0.40
Nodes (4): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, getSafetyGuidance(), SafetyGuidance

### Community 51 - "pricing.ts"
Cohesion: 0.33
Nodes (8): BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput, TravelCostEstimate

### Community 52 - "MatchResults.tsx"
Cohesion: 0.21
Nodes (11): Avatar(), CATEGORY_LABELS, formatPKR(), initials(), MatchResults(), MatchResultsData, MatchResultsProps, URGENCY_DOT (+3 more)

### Community 53 - "requireRole"
Cohesion: 0.15
Nodes (14): dynamic, GET(), PATCH(), patchSchema, dynamic, GET(), isCoordinatePair(), OsrmResponse (+6 more)

### Community 54 - "VoiceCapture.test.tsx"
Cohesion: 0.22
Nodes (4): FakeMediaRecorder, fetchMock, UNDERSTANDING, WORKERS

### Community 55 - "counter-response/route.ts"
Cohesion: 0.16
Nodes (12): bodySchema, dynamic, POST(), bodySchema, dynamic, POST(), bodySchema, dynamic (+4 more)

### Community 56 - "WorkerActiveTracking.tsx"
Cohesion: 0.22
Nodes (6): ActiveJob, NEXT_ACTIONS, STATUS_LABELS, TrackingMap, WorkerActiveTracking(), connect()

### Community 57 - "BottomNav.tsx"
Cohesion: 0.22
Nodes (11): DashboardLayout(), DashboardPage(), BottomNav(), BriefcaseIcon(), ClipboardCheckIcon(), HomeIcon(), MapIcon(), NavItem (+3 more)

### Community 58 - "ActiveJobTracking.tsx"
Cohesion: 0.15
Nodes (9): ActiveJobPage(), dynamic, ActiveJob, ActiveJobTracking(), connect(), STATUS_LABELS, TrackingMap, ReviewScreen() (+1 more)

### Community 59 - "requests.ts"
Cohesion: 0.13
Nodes (17): CustomerOfferModal(), submit(), COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_LOW_FACTOR, offerIsExpired(), OfferValidation (+9 more)

### Community 61 - "TechnicianRequestModal.tsx"
Cohesion: 0.39
Nodes (6): CATEGORY_LABELS, currency(), TechnicianRequestModal(), TechnicianRequestModalProps, UnderstandResponse, WorkerOption

### Community 63 - "NewWorkWizard"
Cohesion: 0.17
Nodes (9): dynamic, NewWorkPage(), humanize(), NewWorkWizard(), handleConfirm(), handleEditDetails(), handleLocation(), parseJson() (+1 more)

### Community 64 - "Job.ts"
Cohesion: 0.25
Nodes (6): JOB_STATUS_STYLES, INPUT_TYPES, JOB_STATUSES, jobSchema, JobStatus, PRICING_STATUSES

### Community 65 - "server.ts"
Cohesion: 0.22
Nodes (5): app, handle, port, shutdown(), initIO()

### Community 66 - "state-machine.ts"
Cohesion: 0.17
Nodes (14): markExpired(), ACTOR_ALLOWANCES, assertAllowedTransition(), canTransition(), DeadlineFields, EMERGENCY_ACCEPTANCE_MINUTES, expireIfDeadlinePassed(), JobActor (+6 more)

### Community 67 - "NewWorkWizard.tsx"
Cohesion: 0.18
Nodes (10): AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, JobInput, LocationState, RADIUS_OPTIONS (+2 more)

### Community 68 - "TDD Evidence Report: Service Marketplace Features"
Cohesion: 0.18
Nodes (10): Coverage and Known Gaps, Follow-up: Clarification and Travel Pricing, Merge Evidence, P1: Authentication System, P2: Voice AI Matching Optimization, P3: Technician Recommendation & Job Request, Source Plan, Task Report (+2 more)

### Community 69 - "flow.test.ts"
Cohesion: 0.31
Nodes (6): applyUpdate(), INPUT, mockFindOneAndUpdate(), NOW, pushByPath(), setByPath()

### Community 70 - "detail.ts"
Cohesion: 0.13
Nodes (9): CUSTOMER_SESSION, FlowError, JOB, getJobDetail(), JobResponder, JobResponderOffer, JobResponderWorker, NOW (+1 more)

### Community 71 - "User.ts"
Cohesion: 0.33
Nodes (5): SessionUser, USER_ROLES, UserDoc, UserRole, userSchema

### Community 72 - "track/page.tsx"
Cohesion: 0.40
Nodes (4): CustomerTrackPage(), dynamic, TrackingJob, TrackingJobsList()

### Community 73 - "customer/page.tsx"
Cohesion: 0.33
Nodes (5): CustomerHomePage(), dynamic, ActiveJob, ActiveJobStatusBar(), STATUS_CONFIG

### Community 74 - "status/route.ts"
Cohesion: 0.40
Nodes (4): bodySchema, dynamic, POST(), statusSchema

### Community 75 - "requests/route.ts"
Cohesion: 0.50
Nodes (4): bodySchema, dynamic, POST(), createDirectRequest()

### Community 81 - "reject-offer/route.ts"
Cohesion: 0.27
Nodes (6): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, customerRejectWorker()

### Community 87 - "seed.ts"
Cohesion: 0.33
Nodes (5): disconnectDB(), Review, ReviewDoc, reviewSchema, main()

## Knowledge Gaps
- **392 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+387 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `fail`, `select-worker/route.ts`, `flow.ts`, `matching.ts`, `dashboard.ts`, `confirm/route.ts`, `jobs/route.test.ts`, `location/route.ts`, `jobs/photos/route.ts`, `stream/route.test.ts`, `connectDB`, `FlowError`, `e2e-workflow.test.ts`, `Worker`, `customer/jobs/page.tsx`, `counter-response/route.ts`, `BottomNav.tsx`, `ActiveJobTracking.tsx`, `NewWorkWizard`, `detail.ts`, `track/page.tsx`, `customer/page.tsx`, `status/route.ts`, `requests/route.ts`, `reject-offer/route.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `connectDB` to `fail`, `jobs/photos/route.ts`, `signup/route.ts`, `detail.ts`, `matching.ts`, `status/route.ts`, `Worker`, `requests/route.ts`, `dashboard.ts`, `location/route.ts`, `requireRole`, `seed.ts`, `counter-response/route.ts`, `BottomNav.tsx`, `requests.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `cn()` connect `LoadingState.tsx` to `MatchResults.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _392 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.08506493506493507 - nodes in this community are weakly interconnected._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `Graphify Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._