# Graph Report - Ustad Ai  (2026-08-21)

## Corpus Check
- 200 files · ~87,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1079 nodes · 2429 edges · 89 communities (66 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `868dbda5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fail
- broadcast/route.test.ts
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
- FlowError
- jobs/route.test.ts
- login/page.tsx
- extends
- opencode.json
- location/route.test.ts
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
- chat.ts
- TrackingMap.tsx
- Worker
- photos/route.test.ts
- index.ts
- requireRole
- accept/route.test.ts
- cancel/route.ts
- approve/route.ts
- messages/route.ts
- socket-client.ts
- customer/jobs/page.tsx
- Real-Time GPS Tracking Integration Plan
- CustomerRequestsPanel.tsx
- scripts
- WorkerCategory
- safety.ts
- pricing.ts
- package.json
- auth.ts
- VoiceCapture.test.tsx
- counter-response/route.ts
- WorkerActiveTracking.tsx
- BottomNav.tsx
- ActiveJobTracking.tsx
- requests.ts
- tsx
- @types/node
- @types/react
- NewWorkWizard
- vitest
- server.ts
- state-machine.ts
- NewWorkWizard.tsx
- TDD Evidence Report: Service Marketplace Features
- flow.test.ts
- jobs/[id]/route.ts
- workerOffer
- track/page.tsx
- customer/page.tsx
- offers/route.test.ts
- chat/page.tsx
- NewWorkWizard.test.tsx
- media/route.ts
- LogoutButton
- TrackingPreview.tsx
- reject-offer/route.test.ts
- status/route.test.ts
- @testing-library/jest-dom
- @types/leaflet
- jsdom
- seed.ts
- Worker.ts
- eslint

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

## Communities (89 total, 23 thin omitted)

### Community 0 - "fail"
Cohesion: 0.10
Nodes (37): dynamic, POST(), bodySchema, dynamic, POST(), bodySchema, dynamic, bodySchema (+29 more)

### Community 1 - "broadcast/route.test.ts"
Cohesion: 0.18
Nodes (5): CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, confirmJobDetails()

### Community 2 - "flow.ts"
Cohesion: 0.13
Nodes (15): JobDetail, JobResponder, JobResponderOffer, JobResponderWorker, NOW, AttachPhotoInput, BroadcastResult, STATUS_SYSTEM_MESSAGES (+7 more)

### Community 3 - "WorkerResults.tsx"
Cohesion: 0.16
Nodes (8): formatRs(), JobDetailResponse, Responder, ResponderOffer, ResponderWorker, fetchMock, WorkerResults(), WorkerResultsProps

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "signup/route.ts"
Cohesion: 0.08
Nodes (32): dynamic, POST(), dynamic, GET(), bodySchema, dynamic, POST(), setSessionCookie() (+24 more)

### Community 6 - "analyze.ts"
Cohesion: 0.16
Nodes (14): analyzeJobInput(), CATEGORY_ESTIMATES, complexityFor(), deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword(), HIGH_COMPLEXITY_KEYWORDS (+6 more)

### Community 7 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint-config-next, devDependencies, eslint-config-next, postcss, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react-dom (+9 more)

### Community 8 - "matching.ts"
Cohesion: 0.11
Nodes (27): dynamic, GET(), querySchema, CUSTOMER_SESSION, canonicalizeSkill(), clamp(), CompletenessSignals, EMERGENCY_CAPABILITY_BONUS (+19 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.12
Nodes (17): mongoose, dependencies, leaflet, mongoose, next, react, react-dom, socket.io (+9 more)

### Community 11 - "fileToPhotoBase64"
Cohesion: 0.07
Nodes (31): CustomerChatPageClient(), NEXT_ACTIONS, WorkerChatPageClient(), NEXT_ACTIONS, STATUS_LABELS, WorkerWorkPageClient(), PhotoPicker(), handleFiles() (+23 more)

### Community 12 - "VoiceCapture.tsx"
Cohesion: 0.16
Nodes (13): CATEGORY_LABELS, currency(), TechnicianRequestModal(), TechnicianRequestModalProps, CATEGORY_LABELS, currency(), ResultPanel(), Status (+5 more)

### Community 14 - "dashboard.ts"
Cohesion: 0.06
Nodes (39): dynamic, GET(), DASHBOARD, WORKER_SESSION, dynamic, dynamic, CounterOfferModal(), CATEGORY_LABELS (+31 more)

### Community 15 - "FlowError"
Cohesion: 0.16
Nodes (8): dynamic, POST(), CUSTOMER_SESSION, FlowError, bodySchema, dynamic, POST(), FlowError

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

### Community 31 - "ai.ts"
Cohesion: 0.12
Nodes (23): dynamic, POST(), AiImageInput, AiUnderstandOptions, coerceDisplayArray(), coerceNumber(), coerceToArray(), DEFAULT_CLARIFICATION_OPTIONS (+15 more)

### Community 32 - "jobs/photos/route.ts"
Cohesion: 0.24
Nodes (7): dynamic, POST(), dynamic, POST(), MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema

### Community 33 - "haversineDistanceKm"
Cohesion: 0.35
Nodes (9): GET(), buildBoundingBox(), EARTH_RADIUS_KM, estimateETAMinutes(), haversineDistanceKm(), isWithinRadius(), kmToDegreesRadius(), toRad() (+1 more)

### Community 34 - "chat.ts"
Cohesion: 0.16
Nodes (12): ChatMessageView, getAccessibleJob(), SendMessageInput, JobStreamEvent, JobStreamMessage, JobStreamOptions, DECODER, Message (+4 more)

### Community 35 - "TrackingMap.tsx"
Cohesion: 0.24
Nodes (8): TrackingMap, TrackingPageClientProps, hasValidCoordinate(), isRouteCoordinate(), TrackingMap(), loadRoute(), TrackingMapProps, TrackingMarker

### Community 36 - "Worker"
Cohesion: 0.23
Nodes (8): dynamic, GET(), CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION, createJobStream(), Worker

### Community 37 - "photos/route.test.ts"
Cohesion: 0.25
Nodes (5): CUSTOMER_SESSION, JPEG_PNG, Upload, UploadDoc, uploadSchema

### Community 38 - "index.ts"
Cohesion: 0.12
Nodes (19): SessionUser, INPUT_TYPES, JOB_STATUSES, jobSchema, PRICING_STATUSES, URGENCY_LEVELS, OFFER_STATUSES, OFFER_TYPES (+11 more)

### Community 39 - "requireRole"
Cohesion: 0.10
Nodes (30): dynamic, GET(), POST(), bodySchema, dynamic, POST(), statusSchema, dynamic (+22 more)

### Community 41 - "cancel/route.ts"
Cohesion: 0.18
Nodes (17): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION, analysisTextFor(), createAndAnalyzeJob(), customerCancelJob() (+9 more)

### Community 42 - "approve/route.ts"
Cohesion: 0.18
Nodes (7): bodySchema, dynamic, job, WORKER_SESSION, dynamic, Job, SYSTEM_SENDER_ID

### Community 43 - "messages/route.ts"
Cohesion: 0.33
Nodes (8): dynamic, GET(), POST(), postSchema, CUSTOMER_SESSION, WORKER_SESSION, listJobMessages(), sendJobMessage()

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
Cohesion: 0.25
Nodes (8): scripts, build, dev, dev:next, lint, seed, start, test

### Community 49 - "WorkerCategory"
Cohesion: 0.25
Nodes (11): AiUnderstandResult, AnalysisResult, KeywordRule, JobInputPayload, ComplexityLevel, MatchContext, SearchFilters, WorkerOptionsFilters (+3 more)

### Community 50 - "safety.ts"
Cohesion: 0.40
Nodes (4): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, getSafetyGuidance(), SafetyGuidance

### Community 51 - "pricing.ts"
Cohesion: 0.33
Nodes (8): BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput, TravelCostEstimate

### Community 52 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 53 - "auth.ts"
Cohesion: 0.18
Nodes (10): dynamic, GET(), PNG, WORKER_SESSION, dynamic, GET(), isCoordinatePair(), OsrmResponse (+2 more)

### Community 54 - "VoiceCapture.test.tsx"
Cohesion: 0.22
Nodes (4): FakeMediaRecorder, fetchMock, UNDERSTANDING, WORKERS

### Community 55 - "counter-response/route.ts"
Cohesion: 0.20
Nodes (9): bodySchema, dynamic, POST(), bodySchema, dynamic, POST(), createDirectRequest(), RequestError (+1 more)

### Community 56 - "WorkerActiveTracking.tsx"
Cohesion: 0.22
Nodes (6): ActiveJob, NEXT_ACTIONS, STATUS_LABELS, TrackingMap, WorkerActiveTracking(), connect()

### Community 57 - "BottomNav.tsx"
Cohesion: 0.27
Nodes (9): DashboardLayout(), BottomNav(), BriefcaseIcon(), ClipboardCheckIcon(), HomeIcon(), MapIcon(), NavItem, UserIcon() (+1 more)

### Community 58 - "ActiveJobTracking.tsx"
Cohesion: 0.15
Nodes (9): ActiveJobPage(), dynamic, ActiveJob, ActiveJobTracking(), connect(), STATUS_LABELS, TrackingMap, ReviewScreen() (+1 more)

### Community 59 - "requests.ts"
Cohesion: 0.13
Nodes (17): CustomerOfferModal(), submit(), COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_LOW_FACTOR, offerIsExpired(), OfferValidation (+9 more)

### Community 63 - "NewWorkWizard"
Cohesion: 0.17
Nodes (9): dynamic, NewWorkPage(), humanize(), NewWorkWizard(), handleConfirm(), handleEditDetails(), handleLocation(), parseJson() (+1 more)

### Community 65 - "server.ts"
Cohesion: 0.29
Nodes (4): app, handle, port, initIO()

### Community 66 - "state-machine.ts"
Cohesion: 0.23
Nodes (11): submitOfferAndBroadcast(), ACTOR_ALLOWANCES, assertAllowedTransition(), canTransition(), DeadlineFields, EMERGENCY_ACCEPTANCE_MINUTES, JobActor, NORMAL_ACCEPTANCE_MINUTES (+3 more)

### Community 67 - "NewWorkWizard.tsx"
Cohesion: 0.18
Nodes (10): AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, JobInput, LocationState, RADIUS_OPTIONS (+2 more)

### Community 68 - "TDD Evidence Report: Service Marketplace Features"
Cohesion: 0.18
Nodes (10): Coverage and Known Gaps, Follow-up: Clarification and Travel Pricing, Merge Evidence, P1: Authentication System, P2: Voice AI Matching Optimization, P3: Technician Recommendation & Job Request, Source Plan, Task Report (+2 more)

### Community 69 - "flow.test.ts"
Cohesion: 0.21
Nodes (8): JOB_STATUS_STYLES, applyUpdate(), INPUT, mockFindOneAndUpdate(), NOW, pushByPath(), setByPath(), JobStatus

### Community 70 - "jobs/[id]/route.ts"
Cohesion: 0.14
Nodes (12): dynamic, GET(), PATCH(), patchSchema, CUSTOMER_SESSION, FlowError, JOB, dynamic (+4 more)

### Community 71 - "workerOffer"
Cohesion: 0.36
Nodes (8): customerSelectWorker(), formatPrice(), markExpired(), rollbackClaim(), workerAcceptJob(), workerOffer(), expireIfDeadlinePassed(), resolveSelectionDeadline()

### Community 72 - "track/page.tsx"
Cohesion: 0.40
Nodes (4): CustomerTrackPage(), dynamic, TrackingJob, TrackingJobsList()

### Community 73 - "customer/page.tsx"
Cohesion: 0.33
Nodes (5): CustomerHomePage(), dynamic, ActiveJob, ActiveJobStatusBar(), STATUS_CONFIG

### Community 75 - "chat/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, ChatJob, WorkerChatList()

### Community 78 - "media/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 81 - "reject-offer/route.test.ts"
Cohesion: 0.33
Nodes (3): POST(), CUSTOMER_SESSION, FlowError

### Community 87 - "seed.ts"
Cohesion: 0.29
Nodes (6): disconnectDB(), ACTOR_TYPES, JobEvent, JobEventDoc, jobEventSchema, main()

### Community 89 - "Worker.ts"
Cohesion: 0.40
Nodes (4): VERIFICATION_LEVELS, VerificationLevel, WorkerDoc, workerSchema

## Knowledge Gaps
- **369 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `fail`, `broadcast/route.test.ts`, `signup/route.ts`, `matching.ts`, `dashboard.ts`, `FlowError`, `jobs/route.test.ts`, `location/route.test.ts`, `jobs/photos/route.ts`, `haversineDistanceKm`, `Worker`, `photos/route.test.ts`, `accept/route.test.ts`, `cancel/route.ts`, `approve/route.ts`, `messages/route.ts`, `customer/jobs/page.tsx`, `auth.ts`, `counter-response/route.ts`, `ActiveJobTracking.tsx`, `NewWorkWizard`, `jobs/[id]/route.ts`, `track/page.tsx`, `customer/page.tsx`, `offers/route.test.ts`, `chat/page.tsx`, `media/route.ts`, `reject-offer/route.test.ts`, `status/route.test.ts`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `requireRole` to `fail`, `flow.ts`, `signup/route.ts`, `matching.ts`, `dashboard.ts`, `FlowError`, `jobs/photos/route.ts`, `haversineDistanceKm`, `chat.ts`, `Worker`, `approve/route.ts`, `messages/route.ts`, `auth.ts`, `counter-response/route.ts`, `requests.ts`, `jobs/[id]/route.ts`, `chat/page.tsx`, `media/route.ts`, `seed.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `haversineDistanceKm()` connect `haversineDistanceKm` to `flow.ts`, `TrackingMap.tsx`, `jobs/[id]/route.ts`, `matching.ts`, `dashboard.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fail` be split into smaller, more focused modules?**
  _Cohesion score 0.10034013605442177 - nodes in this community are weakly interconnected._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._
- **Should `Graphify Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._