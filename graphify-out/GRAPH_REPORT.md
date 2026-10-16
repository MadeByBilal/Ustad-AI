# Graph Report - Ustad Ai  (2026-10-16)

## Corpus Check
- 259 files · ~199,189 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1807 nodes · 2965 edges · 125 communities (110 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f4086215`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- flow.ts
- socket-client.ts
- dependencies
- socket-handlers.ts
- Graphify Tool
- models/index.ts
- connectDB
- devDependencies
- ai/index.ts
- compilerOptions
- dependencies
- mongodb.ts
- matching.ts
- IncomingJobCard.tsx
- MatchResults.tsx
- contracts/job.ts
- compilerOptions
- job/ai.ts
- TrackingMap.tsx
- opencode.json
- VoiceCapture.tsx
- graphify.js
- postcss.config.mjs
- workers/index.ts
- Brag Plan: Ustad AI
- offers.ts
- God Nodes Analysis
- Obsidian Vault Export
- LoadingState.tsx
- useWorker
- server/contracts/api.ts
- client/contracts/api.ts
- client/contracts/contracts/api.ts
- getApiErrorMessage
- fileToPhotoBase64
- contracts/api.ts
- server/contracts/contracts/api.ts
- WorkerCategory
- analyze.ts
- client/contracts/job.ts
- client/contracts/contracts/job.ts
- server/contracts/contracts/job.ts
- requests.ts
- CustomerRequestsPanel.tsx
- job.d.ts
- Real-Time GPS Tracking Integration Plan
- analyze_track
- scripts
- client/contracts/contracts/worker.ts
- server/contracts/contracts/worker.ts
- server/contracts/job.ts
- src/lib/geo.ts
- WorkerResults.tsx
- server/contracts/ai.ts
- server/contracts/worker.ts
- Step 2: Write the brag plan
- /brag
- client/contracts/worker.ts
- useLang
- WorkerHome.tsx
- VoiceCapture.test.tsx
- client/lib/validation.ts
- api.js
- Step 4: Validate, render, and deliver
- NewWorkWizard
- NewWorkWizard.tsx
- TDD Evidence Report: Instant Tracking Routes
- TDD Evidence Report: Service Marketplace Features
- [id].ts
- Audio reference
- client/contracts/contracts/ai.ts
- WorkerChat.tsx
- InspectionPageClient
- context.tsx
- api-client.ts
- server/contracts/contracts/ai.ts
- worker.d.ts
- Hyperframes Composition Brief: Ustad AI
- client/contracts/ai.ts
- WorkerProfile.tsx
- pricing.ts
- Step 3: Hand off to Hyperframes
- CustomerHomeContent.tsx
- WorkerDashboard.tsx
- contracts/worker.ts
- worker/chat/[jobId]/page.tsx
- TDD Evidence Report: Voice Capture Hardening
- track/page.tsx
- Tone reference
- TechnicianRequestModal.tsx
- DirectRequestCard.tsx
- SFX Analysis Summary
- Step 1: Inspect the project
- api.d.ts
- Music Cues: happy-beats-business-moves-vol-10-by-ende-dot-app
- Music Cues: happy-beats-business-moves-vol-11-by-ende-dot-app
- Music Cues: happy-beats-business-moves-vol-12-by-ende-dot-app
- Music Cues: happy-beats-business-moves-vol-1-by-ende-dot-app
- Music Cues: happy-beats-business-moves-vol-9-by-ende-dot-app
- SFX library — approved files
- safety.ts
- NewWorkWizard.test.tsx
- client/lib/photos.ts
- job.js
- ai.js
- TrackingPreview.tsx
- middleware.ts
- worker.js
- README.md
- next.config.mjs
- client/prebuild.sh
- lib/session.ts
- tailwind.config.ts
- server/prebuild.sh
- brag
- src/index.ts
- contracts/ai.ts

## God Nodes (most connected - your core abstractions)
1. `getApiErrorMessage()` - 63 edges
2. `connectDB()` - 36 edges
3. `useLang()` - 32 edges
4. `Graphify Tool` - 21 edges
5. `useWorker()` - 19 edges
6. `registerSocketHandlers()` - 19 edges
7. `recordEvent()` - 18 edges
8. `compilerOptions` - 18 edges
9. `Worker` - 17 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `MatchResultsData` --inherits--> `AiUnderstandResult`  [EXTRACTED]
  client/src/client/components/MatchResults.tsx → contracts/ai.ts
- `MatchResultsData` --references--> `WorkerOption`  [EXTRACTED]
  client/src/client/components/MatchResults.tsx → contracts/worker.ts
- `UnderstandResponse` --inherits--> `AiUnderstandResult`  [EXTRACTED]
  client/src/client/components/VoiceCapture.tsx → contracts/ai.ts
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `load()` --calls--> `fetchSession()`  [EXTRACTED]
  client/src/app/dashboard/layout.tsx → client/src/client/lib/session.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (125 total, 15 thin omitted)

### Community 0 - "flow.ts"
Cohesion: 0.10
Nodes (48): canCustomerCancel(), CUSTOMER_CANCELLABLE_STATUSES, resolveWorkerCancellation(), WorkerCancellationDecision, WorkerCancellationInput, analysisTextFor(), AttachPhotoInput, confirmJobDetails() (+40 more)

### Community 1 - "socket-client.ts"
Cohesion: 0.06
Nodes (38): MOCK_DESTINATION, MOCK_ROUTE, MOCK_WORKER, MOCK_WORKER_LOCATION, MockStatus, TrackingDemoPage(), TrackingData, TrackingPage() (+30 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (44): cookie-parser, cors, express, mongoose, multer, dependencies, cookie-parser, cors (+36 more)

### Community 3 - "socket-handlers.ts"
Cohesion: 0.08
Nodes (40): estimateETAMinutes(), computeAndStoreRoute(), isCoordinatePair(), OsrmResponse, PrecomputedRoute, RouteComputedPayload, RoutePoint, authenticateSocket() (+32 more)

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "models/index.ts"
Cohesion: 0.06
Nodes (46): SessionUser, JOB_STATUS_STYLES, JobDetail, JobResponder, JobResponderOffer, JobResponderWorker, BroadcastResult, WorkerOfferResult (+38 more)

### Community 6 - "connectDB"
Cohesion: 0.13
Nodes (31): ApiError, authError(), fail(), ok(), clearSessionCookie(), sessionCookieOptions(), fingerprint(), AllowedRole (+23 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (41): devDependencies, eslint, eslint-config-next, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react (+33 more)

### Community 8 - "ai/index.ts"
Cohesion: 0.33
Nodes (4): NOTE: For multipart form-data uploads (audio/image), configure multer, NOTE: In production, configure multer middleware on this route:, router, upload

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, downlevelIteration, esModuleInterop, incremental, isolatedModules, jsx, lib (+20 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, clsx, @fortawesome/free-brands-svg-icons, @fortawesome/free-regular-svg-icons (+37 more)

### Community 11 - "mongodb.ts"
Cohesion: 0.11
Nodes (23): hashPassword(), PASSWORD_MIN_LENGTH, PasswordStrength, validatePasswordStrength(), verifyPassword(), disconnectDB(), MONGODB_URI, MongooseCache (+15 more)

### Community 12 - "matching.ts"
Cohesion: 0.12
Nodes (22): canonicalizeSkill(), clamp(), CompletenessSignals, EMERGENCY_CAPABILITY_BONUS, FRESH_LOCATION_DAYS, getWorkerOptions(), getWorkerResults(), LOCATION_FRESHNESS_EMERGENCY_MS (+14 more)

### Community 13 - "IncomingJobCard.tsx"
Cohesion: 0.21
Nodes (11): CounterOfferModal(), submit(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB (+3 more)

### Community 14 - "MatchResults.tsx"
Cohesion: 0.12
Nodes (15): mockData, ResultPageClient(), StoredResult, Avatar(), cardItem, CATEGORY_LABELS, initials(), listContainer (+7 more)

### Community 15 - "contracts/job.ts"
Cohesion: 0.12
Nodes (16): RoutePoint, INPUT_TYPES, InputType, JOB_STATUSES, JobCompletion, JobData, JobInput, JobLocation (+8 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dist, src/**/*, compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop (+17 more)

### Community 17 - "job/ai.ts"
Cohesion: 0.11
Nodes (27): AiImageInput, AiUnderstandOptions, ASSEMBLYAI_LANGUAGE_CODE, cleanDescription(), coerceDisplayArray(), coerceNumber(), coerceToArray(), DEFAULT_CLARIFICATION_OPTIONS (+19 more)

### Community 18 - "TrackingMap.tsx"
Cohesion: 0.16
Nodes (20): distanceFromPolyline(), hasValidCoordinate(), isRouteCoordinate(), perpendicularDistanceToSegment(), TrackingMap(), loadRoute(), renderRoadRoute(), TrackingMapProps (+12 more)

### Community 19 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 20 - "VoiceCapture.tsx"
Cohesion: 0.11
Nodes (19): MicVisualizer(), MicVisualizerProps, TextType(), TextTypeProps, audioFileExtension(), CATEGORY_LABELS, Coordinates, currency() (+11 more)

### Community 23 - "workers/index.ts"
Cohesion: 0.11
Nodes (18): haversineDistanceKm(), getJobDetail(), FlowError, MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema, ActiveJobView, DirectRequestView (+10 more)

### Community 24 - "Brag Plan: Ustad AI"
Cohesion: 0.10
Nodes (19): Audio direction, Brag Plan: Ustad AI, Duration: 20 seconds, Format: landscape — 1920x1080, Hook (first 2-3 seconds), Key moments (the middle), Outro / punchline, Scene 1 — Hook: The Mic — 4s (+11 more)

### Community 25 - "offers.ts"
Cohesion: 0.44
Nodes (7): COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_LOW_FACTOR, offerIsExpired(), OfferValidation, roundTo50()

### Community 29 - "LoadingState.tsx"
Cohesion: 0.10
Nodes (17): EASE_OUT, EmptyState(), EmptyStateIcon, EmptyStateProps, EASE_OUT, LoadingState(), LoadingStateProps, LoadingStateType (+9 more)

### Community 30 - "useWorker"
Cohesion: 0.12
Nodes (14): WorkerActivePage(), WorkerChatPage(), ActiveJobData, WorkerInspectionPage(), WorkerJobsPage(), WorkerProfilePage(), ActiveJobData, WorkerWorkPage() (+6 more)

### Community 31 - "server/contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, OfferValidation, PaginatedResponse, PrecomputedRoute, RouteComputedPayload, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM (+3 more)

### Community 32 - "client/contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 33 - "client/contracts/contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 34 - "getApiErrorMessage"
Cohesion: 0.11
Nodes (19): TrackingPageClient(), handleApprove(), handleCancel(), handleDispute(), handleInspectionOfferResponse(), WorkerWorkPageClient(), handleAdvance(), handleCancel() (+11 more)

### Community 35 - "fileToPhotoBase64"
Cohesion: 0.17
Nodes (14): PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, handleFile(), base64ByteLength() (+6 more)

### Community 36 - "contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 37 - "server/contracts/contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 38 - "WorkerCategory"
Cohesion: 0.25
Nodes (9): AiUnderstandResult, AnalysisResult, KeywordRule, ComplexityLevel, WorkerOption, WorkerOptionsFilters, WorkerResult, WorkerCategory (+1 more)

### Community 39 - "analyze.ts"
Cohesion: 0.13
Nodes (15): analyzeJobInput(), CANONICAL_SKILLS, CATEGORY_ESTIMATES, complexityFor(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword(), HIGH_COMPLEXITY_KEYWORDS (+7 more)

### Community 40 - "client/contracts/job.ts"
Cohesion: 0.12
Nodes (16): RoutePoint, INPUT_TYPES, InputType, JOB_STATUSES, JobCompletion, JobData, JobInput, JobLocation (+8 more)

### Community 41 - "client/contracts/contracts/job.ts"
Cohesion: 0.12
Nodes (16): RoutePoint, INPUT_TYPES, InputType, JOB_STATUSES, JobCompletion, JobData, JobInput, JobLocation (+8 more)

### Community 42 - "server/contracts/contracts/job.ts"
Cohesion: 0.12
Nodes (16): RoutePoint, INPUT_TYPES, InputType, JOB_STATUSES, JobCompletion, JobData, JobInput, JobLocation (+8 more)

### Community 43 - "requests.ts"
Cohesion: 0.14
Nodes (16): CounterResponseInput, CounterResponseResult, createDirectRequest(), DirectRequestInput, DirectRequestResult, RequestError, respondToCounter(), respondToDirectRequest() (+8 more)

### Community 44 - "CustomerRequestsPanel.tsx"
Cohesion: 0.28
Nodes (8): CATEGORY_LABELS, currency(), CustomerRequestsPanel(), handleCounterResponse(), ListResponse, postJson(), RequestItem, STATUS_LABELS

### Community 45 - "job.d.ts"
Cohesion: 0.13
Nodes (15): RoutePoint, ComplexityLevel, InputType, JobCompletion, JobData, JobInput, JobLocation, JobMatching (+7 more)

### Community 46 - "Real-Time GPS Tracking Integration Plan"
Cohesion: 0.06
Nodes (33): 1.1 Install Dependencies, 1.2 Create Socket.io Server (`src/lib/socket.ts`), 1.3 Create Socket.io API Route (`src/app/api/socketio/route.ts`), 1.4 Socket.io Events, 1.5 Room Isolation, 2.1 New Component: `src/components/worker/LiveTracker.tsx`, 2.2 Integration with `ActiveJobPanel.tsx`, 3.1 Install React Leaflet (+25 more)

### Community 47 - "analyze_track"
Cohesion: 0.30
Nodes (14): analyze_track(), _as_float(), _compact_times(), _dedupe_cues(), _feature_at(), _finite_round(), _format_cue(), _local_contrast() (+6 more)

### Community 48 - "scripts"
Cohesion: 0.20
Nodes (9): name, private, scripts, client:build, client:dev, client:start, server:build, server:dev (+1 more)

### Community 49 - "client/contracts/contracts/worker.ts"
Cohesion: 0.13
Nodes (14): ActiveJobView, CompletedJobView, DirectRequestView, IncomingJobView, VERIFICATION_LEVELS, VerificationLevel, WORKER_CATEGORIES, WorkerDashboardData (+6 more)

### Community 50 - "server/contracts/contracts/worker.ts"
Cohesion: 0.13
Nodes (14): ActiveJobView, CompletedJobView, DirectRequestView, IncomingJobView, VERIFICATION_LEVELS, VerificationLevel, WORKER_CATEGORIES, WorkerDashboardData (+6 more)

### Community 51 - "server/contracts/job.ts"
Cohesion: 0.13
Nodes (14): InputType, JobCompletion, JobData, JobInput, JobLocation, JobMatching, JobPricing, JobStatus (+6 more)

### Community 52 - "src/lib/geo.ts"
Cohesion: 0.47
Nodes (5): buildBoundingBox(), EARTH_RADIUS_KM, isWithinRadius(), kmToDegreesRadius(), toRad()

### Community 53 - "WorkerResults.tsx"
Cohesion: 0.16
Nodes (8): formatRs(), JobDetailResponse, Responder, ResponderOffer, ResponderWorker, fetchMock, WorkerResults(), WorkerResultsProps

### Community 54 - "server/contracts/ai.ts"
Cohesion: 0.23
Nodes (12): AiUnderstandResult, AnalysisResult, AiUnderstandResult, AnalysisResult, PriceEstimate, PriceEstimate, CANONICAL_SKILLS, CATEGORY_ESTIMATES (+4 more)

### Community 55 - "server/contracts/worker.ts"
Cohesion: 0.14
Nodes (11): ActiveJobView, DirectRequestView, IncomingJobView, VERIFICATION_LEVELS, WORKER_CATEGORIES, VerificationLevel, WorkerDashboardData, WorkerLocation (+3 more)

### Community 56 - "Step 2: Write the brag plan"
Cohesion: 0.15
Nodes (13): Audio planning, Bias the storyboard toward the user flow, Choosing what to show, Create the output directory, Duration guidance, Handoff posture, Look for interaction and sequential reveal moments, Music cue guidance (+5 more)

### Community 57 - "/brag"
Cohesion: 0.15
Nodes (13): /brag, Creative laws, Invocation dispatch (must happen first), Narration guidance, Output directory, Parsing the invocation, Skill directory, Step 1: Inspect the project (+5 more)

### Community 58 - "client/contracts/worker.ts"
Cohesion: 0.15
Nodes (11): ActiveJobView, DirectRequestView, IncomingJobView, VERIFICATION_LEVELS, VerificationLevel, WORKER_CATEGORIES, WorkerDashboardData, WorkerLocation (+3 more)

### Community 59 - "useLang"
Cohesion: 0.14
Nodes (13): AuthForm(), submit(), destinationFor(), Mode, Role, HomePage(), CustomerJobsList(), JobItem (+5 more)

### Community 60 - "WorkerHome.tsx"
Cohesion: 0.15
Nodes (12): DashboardLayout(), load(), setup(), TRACKING_STATUSES, WorkerDashboardPage(), BottomNav(), NavItem, LiquidGlassToastContainer() (+4 more)

### Community 61 - "VoiceCapture.test.tsx"
Cohesion: 0.15
Nodes (6): FakeAnalyser, FakeAudioContext, FakeMediaRecorder, fetchMock, UNDERSTANDING, WORKERS

### Community 62 - "client/lib/validation.ts"
Cohesion: 0.19
Nodes (9): CustomerOfferModal(), submit(), COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, roundTo50() (+1 more)

### Community 63 - "api.js"
Cohesion: 0.17
Nodes (6): COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, roundTo50()

### Community 64 - "Step 4: Validate, render, and deliver"
Cohesion: 0.18
Nodes (11): Bake the poster as frame 0, Example: Taxi for Taxis, Final output structure, Pick the poster frame, Preview, Render, Share copy by tone, Step 4: Validate, render, and deliver (+3 more)

### Community 65 - "NewWorkWizard"
Cohesion: 0.18
Nodes (7): humanize(), NewWorkWizard(), handleConfirm(), handleEditDetails(), handleLocation(), parseJson(), requestLocation()

### Community 66 - "NewWorkWizard.tsx"
Cohesion: 0.18
Nodes (10): AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, JobInput, LocationState, RADIUS_OPTIONS (+2 more)

### Community 67 - "TDD Evidence Report: Instant Tracking Routes"
Cohesion: 0.29
Nodes (6): Coverage and Known Gaps, Merge Evidence, Task Report, TDD Evidence Report: Instant Tracking Routes, Test Specification, User Journeys

### Community 68 - "TDD Evidence Report: Service Marketplace Features"
Cohesion: 0.18
Nodes (10): Coverage and Known Gaps, Follow-up: Clarification and Travel Pricing, Merge Evidence, P1: Authentication System, P2: Voice AI Matching Optimization, P3: Technician Recommendation & Job Request, Source Plan, Task Report (+2 more)

### Community 69 - "[id].ts"
Cohesion: 0.08
Nodes (31): ChatMessageView, getAccessibleJob(), listJobMessages(), sendJobMessage(), SendMessageInput, WORKER_SCORE_COMPLETION_REWARD, createJobStream(), JobStreamEvent (+23 more)

### Community 70 - "Audio reference"
Cohesion: 0.18
Nodes (11): Adding SFX elements, Asset paths, Audio-reactive visuals, Audio reference, Available tracks, Beat and cue sources, In a composition, Moment → sound heuristics (+3 more)

### Community 71 - "client/contracts/contracts/ai.ts"
Cohesion: 0.24
Nodes (9): AiUnderstandResult, AnalysisResult, CANONICAL_SKILLS, CATEGORY_ESTIMATES, INSPECTION_FEES, PriceEstimate, ComplexityLevel, UrgencyLevel (+1 more)

### Community 72 - "WorkerChat.tsx"
Cohesion: 0.25
Nodes (7): CustomerChatPageClient(), ChatMessage, QUICK_MESSAGES, WorkerChat(), send(), sendLocation(), sendPhoto()

### Community 73 - "InspectionPageClient"
Cohesion: 0.38
Nodes (5): InspectionPageClient(), advanceToStatus(), handleCancel(), handleJustInspection(), handleNeedsWork()

### Community 74 - "context.tsx"
Cohesion: 0.23
Nodes (9): metadata, getInitialLang(), Lang, LangContext, LangContextValue, LanguageProvider(), setLangCookie(), TranslationKey (+1 more)

### Community 75 - "api-client.ts"
Cohesion: 0.17
Nodes (12): NEXT_ACTIONS, STATUS_LABELS, NEXT_ACTIONS, STATUS_LABELS, ActiveJob, ActiveJobPanel(), advance(), NEXT_ACTIONS (+4 more)

### Community 76 - "server/contracts/contracts/ai.ts"
Cohesion: 0.24
Nodes (9): AiUnderstandResult, AnalysisResult, CANONICAL_SKILLS, CATEGORY_ESTIMATES, INSPECTION_FEES, PriceEstimate, ComplexityLevel, UrgencyLevel (+1 more)

### Community 77 - "worker.d.ts"
Cohesion: 0.18
Nodes (10): ActiveJobView, DirectRequestView, IncomingJobView, VerificationLevel, WorkerCategory, WorkerDashboardData, WorkerLocation, WorkerOption (+2 more)

### Community 78 - "Hyperframes Composition Brief: Ustad AI"
Cohesion: 0.20
Nodes (9): Audio, Creative Direction, Hyperframes Composition Brief: Ustad AI, Hyperframes Instructions, Objective, Output, Source Material, Storyboard (+1 more)

### Community 79 - "client/contracts/ai.ts"
Cohesion: 0.27
Nodes (9): AiUnderstandResult, AnalysisResult, CANONICAL_SKILLS, CATEGORY_ESTIMATES, INSPECTION_FEES, PriceEstimate, ComplexityLevel, UrgencyLevel (+1 more)

### Community 80 - "WorkerProfile.tsx"
Cohesion: 0.20
Nodes (6): CloudinaryUpload(), CloudinaryUploadProps, LogoutButton(), WorkerProfile(), saveProfile(), WORKER_CATEGORIES

### Community 81 - "pricing.ts"
Cohesion: 0.24
Nodes (9): BASE_WORK_FEE_PKR, BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput (+1 more)

### Community 82 - "Step 3: Hand off to Hyperframes"
Cohesion: 0.22
Nodes (9): Audio asset preparation, Audio-reactive extraction (when music is present), Beat sync (when a cue source is available), Call Hyperframes, Create the composition brief, How to implement, Self-review checklist, Step 3: Hand off to Hyperframes (+1 more)

### Community 83 - "CustomerHomeContent.tsx"
Cohesion: 0.28
Nodes (5): ActiveJob, ActiveJobStatusBar(), STATUS_CONFIG, TRACKING_STATUSES, CustomerHomeContent()

### Community 84 - "WorkerDashboard.tsx"
Cohesion: 0.18
Nodes (9): Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic(), fetchMock, WorkerDashboard(), AvailabilityState (+1 more)

### Community 85 - "contracts/worker.ts"
Cohesion: 0.13
Nodes (14): WorkerData, WorkerStatsPage(), StatsProps, TimeFilter, WorkerStatsPageClient(), ActiveJobView, CompletedJobView, VERIFICATION_LEVELS (+6 more)

### Community 87 - "worker/chat/[jobId]/page.tsx"
Cohesion: 0.33
Nodes (3): JobData, WorkerChatPageClient(), handleAdvance()

### Community 88 - "TDD Evidence Report: Voice Capture Hardening"
Cohesion: 0.29
Nodes (6): Coverage and Known Gaps, Merge Evidence, Task Report, TDD Evidence Report: Voice Capture Hardening, Test Specification, User Journeys

### Community 90 - "Tone reference"
Cohesion: 0.25
Nodes (8): `app-store`, `chaotic`, `cinematic`, `deadpan`, `default`, `polished`, Tone reference, `yc-parody`

### Community 91 - "TechnicianRequestModal.tsx"
Cohesion: 0.36
Nodes (6): CATEGORY_LABELS, TechnicianRequestModal(), submit(), TechnicianRequestModalProps, UnderstandResponse, WorkerOption

### Community 92 - "DirectRequestCard.tsx"
Cohesion: 0.39
Nodes (7): CATEGORY_LABELS, currency(), DirectRequestCard(), act(), submitCounter(), postJson(), DirectRequestView

### Community 93 - "SFX Analysis Summary"
Cohesion: 0.29
Nodes (6): Family Summary, Lower-Risk Picks By Use Case, Safest General Picks, Selection Rules, SFX Analysis Summary, Signal Guide

### Community 94 - "Step 1: Inspect the project"
Cohesion: 0.25
Nodes (7): Color extraction, Font extraction, Rule: nothing secret leaves this step, Step 1: Inspect the project, The 9-question rubric, What to look for, What to skip

### Community 95 - "api.d.ts"
Cohesion: 0.33
Nodes (6): ApiResponse, OfferValidation, PaginatedResponse, PrecomputedRoute, RouteComputedPayload, RoutePoint

### Community 96 - "Music Cues: happy-beats-business-moves-vol-10-by-ende-dot-app"
Cohesion: 0.33
Nodes (5): Music Cues: happy-beats-business-moves-vol-10-by-ende-dot-app, Reveal Candidates, Strong Cues In Window, Use Policy, Useful Beat Grid

### Community 97 - "Music Cues: happy-beats-business-moves-vol-11-by-ende-dot-app"
Cohesion: 0.33
Nodes (5): Music Cues: happy-beats-business-moves-vol-11-by-ende-dot-app, Reveal Candidates, Strong Cues In Window, Use Policy, Useful Beat Grid

### Community 98 - "Music Cues: happy-beats-business-moves-vol-12-by-ende-dot-app"
Cohesion: 0.33
Nodes (5): Music Cues: happy-beats-business-moves-vol-12-by-ende-dot-app, Reveal Candidates, Strong Cues In Window, Use Policy, Useful Beat Grid

### Community 99 - "Music Cues: happy-beats-business-moves-vol-1-by-ende-dot-app"
Cohesion: 0.33
Nodes (5): Music Cues: happy-beats-business-moves-vol-1-by-ende-dot-app, Reveal Candidates, Strong Cues In Window, Use Policy, Useful Beat Grid

### Community 100 - "Music Cues: happy-beats-business-moves-vol-9-by-ende-dot-app"
Cohesion: 0.33
Nodes (5): Music Cues: happy-beats-business-moves-vol-9-by-ende-dot-app, Reveal Candidates, Strong Cues In Window, Use Policy, Useful Beat Grid

### Community 102 - "SFX library — approved files"
Cohesion: 0.33
Nodes (6): `casino/` — Card and chip sounds, `impact/` — Impact sounds, `interface/` — UI sounds, `keyboard/` — Individual keypress sounds, SFX library — approved files, `ui/` — Clicks and switches

### Community 103 - "safety.ts"
Cohesion: 0.40
Nodes (3): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, SafetyGuidance

### Community 106 - "client/lib/photos.ts"
Cohesion: 0.50
Nodes (4): base64ToBytes(), MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema

### Community 107 - "job.js"
Cohesion: 0.40
Nodes (4): INPUT_TYPES, JOB_STATUSES, PRICING_STATUSES, URGENCY_LEVELS

### Community 108 - "ai.js"
Cohesion: 0.50
Nodes (3): CANONICAL_SKILLS, CATEGORY_ESTIMATES, INSPECTION_FEES

### Community 117 - "lib/session.ts"
Cohesion: 0.19
Nodes (15): CustomerProfilePage(), NOTE: hooks must stay above the early returns below — calling them after, UserProfile, DashboardPage(), fetchJson(), fetchSession(), fetchWorker(), SessionResult (+7 more)

### Community 125 - "src/index.ts"
Cohesion: 0.10
Nodes (14): app, io, PORT, server, initIO(), isAllowedOrigin(), router, router (+6 more)

### Community 127 - "contracts/ai.ts"
Cohesion: 0.27
Nodes (8): AiUnderstandResult, AnalysisResult, CATEGORY_ESTIMATES, INSPECTION_FEES, PriceEstimate, ComplexityLevel, UrgencyLevel, WorkerCategory

## Knowledge Gaps
- **804 isolated node(s):** `brag`, `$schema`, `.opencode/plugins/graphify.js`, `PriceEstimate`, `CATEGORY_ESTIMATES` (+799 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getApiErrorMessage()` connect `getApiErrorMessage` to `socket-client.ts`, `NewWorkWizard.tsx`, `NewWorkWizard`, `fileToPhotoBase64`, `WorkerChat.tsx`, `InspectionPageClient`, `api-client.ts`, `CustomerRequestsPanel.tsx`, `IncomingJobCard.tsx`, `WorkerHome.tsx`, `WorkerProfile.tsx`, `WorkerDashboard.tsx`, `lib/session.ts`, `worker/chat/[jobId]/page.tsx`, `TechnicianRequestModal.tsx`, `DirectRequestCard.tsx`, `LoadingState.tsx`, `client/lib/validation.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `TrackingMap` connect `socket-client.ts` to `TrackingMap.tsx`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `connectDB` to `flow.ts`, `socket-handlers.ts`, `models/index.ts`, `[id].ts`, `requests.ts`, `matching.ts`, `mongodb.ts`, `workers/index.ts`, `src/index.ts`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `brag`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _804 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09577677224736049 - nodes in this community are weakly interconnected._
- **Should `socket-client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05520614954577219 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._