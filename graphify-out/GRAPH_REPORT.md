# Graph Report - Ustad Ai  (2026-09-26)

## Corpus Check
- 257 files · ~198,276 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1785 nodes · 2886 edges · 124 communities (109 shown, 15 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6138f34d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- flow.ts
- socket-client.ts
- dependencies
- socket-handlers.ts
- Graphify Tool
- models/index.ts
- signup.ts
- devDependencies
- src/index.ts
- compilerOptions
- dependencies
- seed.ts
- matching.ts
- contracts/worker.ts
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
- api-client.ts
- God Nodes Analysis
- Obsidian Vault Export
- LoadingState.tsx
- TranslatedHeading.tsx
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
- connectDB
- CustomerRequestsPanel.tsx
- job.d.ts
- Real-Time GPS Tracking Integration Plan
- analyze_track
- scripts
- client/contracts/contracts/worker.ts
- server/contracts/contracts/worker.ts
- server/contracts/job.ts
- WorkerProfile.tsx
- WorkerResults.tsx
- server/contracts/ai.ts
- server/contracts/worker.ts
- Step 2: Write the brag plan
- /brag
- client/contracts/worker.ts
- context.tsx
- WorkerHome.tsx
- VoiceCapture.test.tsx
- client/lib/validation.ts
- api.js
- Step 4: Validate, render, and deliver
- NewWorkWizard
- NewWorkWizard.tsx
- TDD Evidence Report: Instant Tracking Routes
- TDD Evidence Report: Service Marketplace Features
- chat.ts
- Audio reference
- client/contracts/contracts/ai.ts
- WorkerChat.tsx
- InspectionPageClient
- ProfileAvatar.tsx
- WorkerDashboard.tsx
- server/contracts/contracts/ai.ts
- worker.d.ts
- Hyperframes Composition Brief: Ustad AI
- client/contracts/ai.ts
- login/page.tsx
- pricing.ts
- Step 3: Hand off to Hyperframes
- CustomerHomeContent.tsx
- dashboard/layout.tsx
- WorkerStatsPageClient.tsx
- useLang
- TDD Evidence Report: Voice Capture Hardening
- detail.ts
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
- ai/index.ts
- chat/page.tsx
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
- tailwind.config.ts
- server/prebuild.sh
- brag

## God Nodes (most connected - your core abstractions)
1. `getApiErrorMessage()` - 63 edges
2. `connectDB()` - 36 edges
3. `useLang()` - 32 edges
4. `Graphify Tool` - 21 edges
5. `registerSocketHandlers()` - 19 edges
6. `recordEvent()` - 18 edges
7. `compilerOptions` - 18 edges
8. `Worker` - 17 edges
9. `compilerOptions` - 16 edges
10. `WorkerCategory` - 16 edges

## Surprising Connections (you probably didn't know these)
- `MatchResultsData` --references--> `WorkerOption`  [EXTRACTED]
  client/src/client/components/MatchResults.tsx → contracts/worker.ts
- `UnderstandResponse` --inherits--> `AiUnderstandResult`  [EXTRACTED]
  client/src/client/components/VoiceCapture.tsx → contracts/ai.ts
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `handleAdvance()` --calls--> `getApiErrorMessage()`  [EXTRACTED]
  client/src/app/dashboard/worker/chat/[jobId]/WorkerChatPageClient.tsx → client/src/client/lib/api-client.ts
- `handleCancel()` --calls--> `getApiErrorMessage()`  [EXTRACTED]
  client/src/app/dashboard/worker/inspection/InspectionPageClient.tsx → client/src/client/lib/api-client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (124 total, 15 thin omitted)

### Community 0 - "flow.ts"
Cohesion: 0.05
Nodes (74): JOB_STATUS_STYLES, canCustomerCancel(), CUSTOMER_CANCELLABLE_STATUSES, resolveWorkerCancellation(), WorkerCancellationDecision, WorkerCancellationInput, analysisTextFor(), AttachPhotoInput (+66 more)

### Community 1 - "socket-client.ts"
Cohesion: 0.05
Nodes (41): MOCK_DESTINATION, MOCK_ROUTE, MOCK_WORKER, MOCK_WORKER_LOCATION, MockStatus, TrackingDemoPage(), TrackingData, TrackingPage() (+33 more)

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
Cohesion: 0.08
Nodes (31): INPUT_TYPES, Job, JOB_STATUSES, jobSchema, PRICING_STATUSES, URGENCY_LEVELS, ACTOR_TYPES, JobEvent (+23 more)

### Community 6 - "signup.ts"
Cohesion: 0.13
Nodes (25): ApiError, authError(), fail(), ok(), fingerprint(), getSessionUser(), bytesToHex(), createSessionToken() (+17 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (41): devDependencies, eslint, eslint-config-next, jsdom, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react (+33 more)

### Community 8 - "src/index.ts"
Cohesion: 0.09
Nodes (21): app, io, PORT, server, AllowedRole, fail(), requireRole(), SessionUser (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, downlevelIteration, esModuleInterop, incremental, isolatedModules, jsx, lib (+20 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, clsx, @fortawesome/free-brands-svg-icons, @fortawesome/free-regular-svg-icons (+37 more)

### Community 11 - "seed.ts"
Cohesion: 0.11
Nodes (26): hashPassword(), PASSWORD_MIN_LENGTH, PasswordStrength, validatePasswordStrength(), verifyPassword(), disconnectDB(), User, USER_ROLES (+18 more)

### Community 12 - "matching.ts"
Cohesion: 0.11
Nodes (27): buildBoundingBox(), EARTH_RADIUS_KM, haversineDistanceKm(), isWithinRadius(), kmToDegreesRadius(), toRad(), canonicalizeSkill(), clamp() (+19 more)

### Community 13 - "contracts/worker.ts"
Cohesion: 0.11
Nodes (20): CounterOfferModal(), submit(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB (+12 more)

### Community 14 - "MatchResults.tsx"
Cohesion: 0.11
Nodes (17): mockData, ResultPageClient(), StoredResult, Avatar(), cardItem, CATEGORY_LABELS, initials(), listContainer (+9 more)

### Community 15 - "contracts/job.ts"
Cohesion: 0.10
Nodes (23): AnalysisResult, CATEGORY_ESTIMATES, INSPECTION_FEES, PriceEstimate, RoutePoint, ComplexityLevel, INPUT_TYPES, InputType (+15 more)

### Community 16 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dist, src/**/*, compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop (+17 more)

### Community 17 - "job/ai.ts"
Cohesion: 0.12
Nodes (25): AiImageInput, AiUnderstandOptions, ASSEMBLYAI_LANGUAGE_CODE, cleanDescription(), coerceDisplayArray(), coerceNumber(), coerceToArray(), DEFAULT_CLARIFICATION_OPTIONS (+17 more)

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
Nodes (17): FlowError, MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema, ActiveJobView, DirectRequestView, getWorkerDashboard(), IncomingJobView (+9 more)

### Community 24 - "Brag Plan: Ustad AI"
Cohesion: 0.10
Nodes (19): Audio direction, Brag Plan: Ustad AI, Duration: 20 seconds, Format: landscape — 1920x1080, Hook (first 2-3 seconds), Key moments (the middle), Outro / punchline, Scene 1 — Hook: The Mic — 4s (+11 more)

### Community 25 - "api-client.ts"
Cohesion: 0.15
Nodes (11): JobData, NEXT_ACTIONS, WorkerChatPageClient(), handleAdvance(), STATUS_LABELS, NEXT_ACTIONS, STATUS_LABELS, ActiveJob (+3 more)

### Community 29 - "LoadingState.tsx"
Cohesion: 0.14
Nodes (11): EASE_OUT, EmptyState(), EmptyStateIcon, EmptyStateProps, EASE_OUT, LoadingState(), LoadingStateProps, LoadingStateType (+3 more)

### Community 30 - "TranslatedHeading.tsx"
Cohesion: 0.14
Nodes (7): WorkerProfilePage(), ActiveJobData, WorkerWorkPage(), CustomerJobsList(), TrackingJob, TrackingJobsList(), TranslatedHeading()

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
Cohesion: 0.14
Nodes (13): TrackingPageClient(), connect(), handleApprove(), handleCancel(), handleDispute(), handleInspectionOfferResponse(), WorkerWorkPageClient(), handleAdvance() (+5 more)

### Community 35 - "fileToPhotoBase64"
Cohesion: 0.18
Nodes (13): PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, base64ByteLength(), dataUrlToBase64() (+5 more)

### Community 36 - "contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 37 - "server/contracts/contracts/api.ts"
Cohesion: 0.12
Nodes (11): ApiResponse, COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, EARTH_RADIUS_KM, midpointOffer(), OFFER_LOW_FACTOR, OfferValidation, PaginatedResponse (+3 more)

### Community 38 - "WorkerCategory"
Cohesion: 0.14
Nodes (16): AiUnderstandResult, AnalysisResult, KeywordRule, JobInputPayload, ComplexityLevel, DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, SafetyGuidance (+8 more)

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

### Community 43 - "connectDB"
Cohesion: 0.18
Nodes (14): CounterResponseInput, CounterResponseResult, createDirectRequest(), DirectRequestInput, DirectRequestResult, RequestError, respondToCounter(), respondToDirectRequest() (+6 more)

### Community 44 - "CustomerRequestsPanel.tsx"
Cohesion: 0.14
Nodes (13): ApprovalJob, CustomerApprovalPanel(), handleApprove(), JobItem, CATEGORY_LABELS, currency(), CustomerRequestsPanel(), handleCounterResponse() (+5 more)

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

### Community 52 - "WorkerProfile.tsx"
Cohesion: 0.18
Nodes (8): CustomerProfilePage(), UserProfile, CloudinaryUpload(), LogoutButton(), WorkerProfile(), saveProfile(), CompletedJobView, WORKER_CATEGORIES

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

### Community 59 - "context.tsx"
Cohesion: 0.23
Nodes (9): metadata, getInitialLang(), Lang, LangContext, LangContextValue, LanguageProvider(), setLangCookie(), TranslationKey (+1 more)

### Community 60 - "WorkerHome.tsx"
Cohesion: 0.22
Nodes (9): showToast(), Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic(), WorkerHome(), AvailabilityState (+1 more)

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
Cohesion: 0.17
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

### Community 69 - "chat.ts"
Cohesion: 0.24
Nodes (10): ChatMessageView, getAccessibleJob(), listJobMessages(), sendJobMessage(), SendMessageInput, createJobStream(), JobStreamEvent, JobStreamMessage (+2 more)

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
Cohesion: 0.22
Nodes (7): InspectionPageClient(), advanceToStatus(), handleCancel(), handleJustInspection(), handleNeedsWork(), ActiveJobData, WorkerInspectionPage()

### Community 74 - "ProfileAvatar.tsx"
Cohesion: 0.24
Nodes (8): CloudinaryUploadProps, initials(), ProfileAvatar(), ProfileAvatarProps, sizeClasses, ReviewScreen(), handleSubmit(), ReviewScreenProps

### Community 75 - "WorkerDashboard.tsx"
Cohesion: 0.29
Nodes (6): ActiveJobPanel(), advance(), WorkerActiveJob(), fetchMock, WorkerDashboard(), useJobStream()

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

### Community 80 - "login/page.tsx"
Cohesion: 0.22
Nodes (6): AuthForm(), submit(), destinationFor(), Mode, Role, CANONICAL_SKILLS

### Community 81 - "pricing.ts"
Cohesion: 0.24
Nodes (9): BASE_WORK_FEE_PKR, BIKE_FUEL_EFFICIENCY_KM_PER_LITER, calculatePredictedPrice(), COMPLEXITY_MULTIPLIERS, estimateTravelCost(), PETROL_PRICE_PER_LITER_PKR, PredictedPriceEstimate, PredictedPriceInput (+1 more)

### Community 82 - "Step 3: Hand off to Hyperframes"
Cohesion: 0.22
Nodes (9): Audio asset preparation, Audio-reactive extraction (when music is present), Beat sync (when a cue source is available), Call Hyperframes, Create the composition brief, How to implement, Self-review checklist, Step 3: Hand off to Hyperframes (+1 more)

### Community 83 - "CustomerHomeContent.tsx"
Cohesion: 0.28
Nodes (5): ActiveJob, ActiveJobStatusBar(), STATUS_CONFIG, TRACKING_STATUSES, CustomerHomeContent()

### Community 84 - "dashboard/layout.tsx"
Cohesion: 0.28
Nodes (6): TRACKING_STATUSES, BottomNav(), NavItem, LiquidGlassToastContainer(), listeners, Toast

### Community 85 - "WorkerStatsPageClient.tsx"
Cohesion: 0.25
Nodes (6): WorkerData, WorkerStatsPage(), StatsProps, TimeFilter, WorkerStatsPageClient(), WorkerReviewView

### Community 87 - "useLang"
Cohesion: 0.42
Nodes (5): HomePage(), DesktopNav(), NavItem, LanguageToggle(), useLang()

### Community 88 - "TDD Evidence Report: Voice Capture Hardening"
Cohesion: 0.29
Nodes (6): Coverage and Known Gaps, Merge Evidence, Task Report, TDD Evidence Report: Voice Capture Hardening, Test Specification, User Journeys

### Community 89 - "detail.ts"
Cohesion: 0.25
Nodes (8): getJobDetail(), JobDetail, JobResponder, JobResponderOffer, JobResponderWorker, BroadcastResult, WorkerOfferResult, JobDoc

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
Cohesion: 0.29
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

### Community 103 - "ai/index.ts"
Cohesion: 0.33
Nodes (4): NOTE: For multipart form-data uploads (audio/image), configure multer, NOTE: In production, configure multer middleware on this route:, router, upload

### Community 106 - "client/lib/photos.ts"
Cohesion: 0.50
Nodes (4): base64ToBytes(), MAX_PHOTO_BYTES, PhotoUploadInput, photoUploadSchema

### Community 107 - "job.js"
Cohesion: 0.40
Nodes (4): INPUT_TYPES, JOB_STATUSES, PRICING_STATUSES, URGENCY_LEVELS

### Community 108 - "ai.js"
Cohesion: 0.50
Nodes (3): CANONICAL_SKILLS, CATEGORY_ESTIMATES, INSPECTION_FEES

## Knowledge Gaps
- **799 isolated node(s):** `brag`, `$schema`, `.opencode/plugins/graphify.js`, `PriceEstimate`, `CATEGORY_ESTIMATES` (+794 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getApiErrorMessage()` connect `getApiErrorMessage` to `socket-client.ts`, `NewWorkWizard.tsx`, `NewWorkWizard`, `WorkerChat.tsx`, `InspectionPageClient`, `ProfileAvatar.tsx`, `WorkerDashboard.tsx`, `CustomerRequestsPanel.tsx`, `contracts/worker.ts`, `WorkerHome.tsx`, `WorkerProfile.tsx`, `api-client.ts`, `TechnicianRequestModal.tsx`, `DirectRequestCard.tsx`, `client/lib/validation.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `TrackingMap` connect `socket-client.ts` to `TrackingMap.tsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `useLang()` connect `useLang` to `WorkerDashboard.tsx`, `CustomerRequestsPanel.tsx`, `contracts/worker.ts`, `login/page.tsx`, `CustomerHomeContent.tsx`, `WorkerProfile.tsx`, `dashboard/layout.tsx`, `WorkerStatsPageClient.tsx`, `context.tsx`, `WorkerHome.tsx`, `TranslatedHeading.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `brag`, `$schema`, `.opencode/plugins/graphify.js` to the rest of the system?**
  _799 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05393000573723465 - nodes in this community are weakly interconnected._
- **Should `socket-client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05026300409117475 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._