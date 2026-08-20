# Graph Report - Ustad Ai  (2026-08-20)

## Corpus Check
- 141 files · ~60,727 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 774 nodes · 1760 edges · 63 communities (46 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ecd7bbd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireRole
- flow.ts
- Worker.ts
- NewWorkWizard.tsx
- Graphify Tool
- verify/route.ts
- analyze.ts
- devDependencies
- matching.ts
- compilerOptions
- dependencies
- fileToPhotoBase64
- VoiceCapture.tsx
- AcceptJobButton
- dashboard.ts
- cancel/route.ts
- jobs/route.test.ts
- login/page.tsx
- extends
- opencode.json
- WorkerDashboard.tsx
- graphify.js
- postcss.config.mjs
- app/layout.tsx
- next.config.mjs
- tailwind.config.ts
- God Nodes Analysis
- Obsidian Vault Export
- ai.ts
- auth.ts
- stream.ts
- messages/route.ts
- ActiveJobPanel.tsx
- stream/route.test.ts
- WorkerCategory
- User.ts
- seed.ts
- FlowError
- offers/route.ts
- index.ts
- media/route.ts
- Worker
- status/route.ts
- LocationUpdater
- JobEvent.ts
- scripts
- VoiceCapture.test.tsx
- safety.ts
- WorkerChat
- package.json
- location/route.ts
- Review.ts
- eslint-config-next
- @testing-library/user-event
- jsdom
- tailwindcss
- tsx
- @types/node
- @types/react
- vitest

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 69 edges
2. `fail()` - 53 edges
3. `ok()` - 52 edges
4. `connectDB()` - 52 edges
5. `authError()` - 45 edges
6. `FlowError` - 33 edges
7. `Worker` - 32 edges
8. `Graphify Tool` - 21 edges
9. `WorkerCategory` - 17 edges
10. `compilerOptions` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `NewWorkPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/new-work/page.tsx → src/lib/auth.ts
- `CustomerDashboardPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/page.tsx → src/lib/auth.ts
- `handleFile()` --calls--> `fileToPhotoBase64()`  [EXTRACTED]
  src/components/worker/JobPhotoUpload.tsx → src/lib/image.ts
- `WorkerSeed` --references--> `WorkerCategory`  [EXTRACTED]
  src/scripts/seed.ts → src/models/Worker.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (63 total, 17 thin omitted)

### Community 0 - "requireRole"
Cohesion: 0.16
Nodes (29): bodySchema, dynamic, POST(), dynamic, POST(), dynamic, GET(), PATCH() (+21 more)

### Community 1 - "flow.ts"
Cohesion: 0.05
Nodes (65): CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, JobDetail, analysisTextFor() (+57 more)

### Community 2 - "Worker.ts"
Cohesion: 0.40
Nodes (4): VERIFICATION_LEVELS, VerificationLevel, WorkerDoc, workerSchema

### Community 3 - "NewWorkWizard.tsx"
Cohesion: 0.05
Nodes (29): dynamic, NewWorkPage(), AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, humanize() (+21 more)

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "verify/route.ts"
Cohesion: 0.09
Nodes (33): dynamic, POST(), bodySchema, dynamic, POST(), dynamic, GET(), bodySchema (+25 more)

### Community 6 - "analyze.ts"
Cohesion: 0.17
Nodes (13): fallbackResult(), analyzeJobInput(), CANONICAL_SKILLS, CATEGORY_ESTIMATES, deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+5 more)

### Community 7 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, devDependencies, eslint, postcss, @testing-library/jest-dom, @testing-library/react, @types/react-dom, typescript (+7 more)

### Community 8 - "matching.ts"
Cohesion: 0.06
Nodes (36): CUSTOMER_SESSION, FlowError, JOB, dynamic, GET(), querySchema, CUSTOMER_SESSION, buildBoundingBox() (+28 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.18
Nodes (11): mongoose, dependencies, mongoose, next, react, react-dom, zod, next (+3 more)

### Community 11 - "fileToPhotoBase64"
Cohesion: 0.19
Nodes (12): PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, dataUrlToBase64(), downscale() (+4 more)

### Community 12 - "VoiceCapture.tsx"
Cohesion: 0.18
Nodes (9): CustomerDashboardPage(), dynamic, CATEGORY_LABELS, currency(), ResultPanel(), Status, URGENCY_LABELS, VoiceCapture() (+1 more)

### Community 14 - "dashboard.ts"
Cohesion: 0.17
Nodes (13): CounterOfferModal(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB, NOW (+5 more)

### Community 15 - "cancel/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 16 - "jobs/route.test.ts"
Cohesion: 0.33
Nodes (3): ANALYZED_JOB, CUSTOMER_SESSION, FlowError

### Community 18 - "extends"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 19 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 20 - "WorkerDashboard.tsx"
Cohesion: 0.22
Nodes (6): ChatMessage, fetchMock, WorkerDashboard(), AvailabilityState, WorkerAvailability(), useJobStream()

### Community 31 - "ai.ts"
Cohesion: 0.14
Nodes (20): dynamic, POST(), AiImageInput, AiUnderstandOptions, coerceNumber(), coerceToArray(), GEMINI_MODEL, geminiEndpoint() (+12 more)

### Community 32 - "auth.ts"
Cohesion: 0.10
Nodes (24): dynamic, GET(), dynamic, GET(), dynamic, POST(), CUSTOMER_SESSION, JPEG_PNG (+16 more)

### Community 33 - "stream.ts"
Cohesion: 0.29
Nodes (7): getAccessibleJob(), createJobStream(), JobStreamEvent, JobStreamMessage, JobStreamOptions, DECODER, Message

### Community 34 - "messages/route.ts"
Cohesion: 0.24
Nodes (11): dynamic, GET(), POST(), postSchema, CUSTOMER_SESSION, WORKER_SESSION, ChatMessageView, listJobMessages() (+3 more)

### Community 35 - "ActiveJobPanel.tsx"
Cohesion: 0.25
Nodes (6): ActiveJob, ActiveJobPanel(), NEXT_ACTIONS, STATUS_LABELS, JobPhotoUpload(), handleFile()

### Community 36 - "stream/route.test.ts"
Cohesion: 0.29
Nodes (4): CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION

### Community 37 - "WorkerCategory"
Cohesion: 0.23
Nodes (12): UnderstandResponse, AiUnderstandResult, AnalysisResult, KeywordRule, JobInputPayload, MatchContext, SearchFilters, WorkerOption (+4 more)

### Community 38 - "User.ts"
Cohesion: 0.33
Nodes (5): SessionUser, USER_ROLES, UserDoc, UserRole, userSchema

### Community 39 - "seed.ts"
Cohesion: 0.21
Nodes (12): disconnectDB(), CITIES, City, CUSTOMERS, EMERGENCY_CAPABILITIES, jitter(), main(), REVIEW_TAGS (+4 more)

### Community 40 - "FlowError"
Cohesion: 0.22
Nodes (6): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, FlowError

### Community 41 - "offers/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 42 - "index.ts"
Cohesion: 0.12
Nodes (17): JOB_STATUS_STYLES, INPUT_TYPES, JOB_STATUSES, jobSchema, PRICING_STATUSES, messageSchema, MessageSenderType, SENDER_TYPES (+9 more)

### Community 43 - "media/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 44 - "Worker"
Cohesion: 0.17
Nodes (10): dynamic, POST(), FlowError, WORKER_SESSION, dynamic, GET(), DASHBOARD, WORKER_SESSION (+2 more)

### Community 45 - "status/route.ts"
Cohesion: 0.22
Nodes (6): bodySchema, dynamic, POST(), statusSchema, FlowError, WORKER_SESSION

### Community 46 - "LocationUpdater"
Cohesion: 0.47
Nodes (5): Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic()

### Community 47 - "JobEvent.ts"
Cohesion: 0.50
Nodes (3): ACTOR_TYPES, JobEventDoc, jobEventSchema

### Community 48 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, seed, start, test

### Community 49 - "VoiceCapture.test.tsx"
Cohesion: 0.22
Nodes (4): FakeMediaRecorder, fetchMock, UNDERSTANDING, WORKERS

### Community 50 - "safety.ts"
Cohesion: 0.40
Nodes (4): DEFAULT_EMERGENCY_GUIDANCE, FLAG_GUIDANCE, getSafetyGuidance(), SafetyGuidance

### Community 51 - "WorkerChat"
Cohesion: 0.83
Nodes (4): WorkerChat(), send(), sendLocation(), sendPhoto()

### Community 52 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 53 - "location/route.ts"
Cohesion: 0.29
Nodes (5): bodySchema, dynamic, PATCH(), POSITION, WORKER_SESSION

### Community 54 - "Review.ts"
Cohesion: 0.50
Nodes (3): Review, ReviewDoc, reviewSchema

## Knowledge Gaps
- **254 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `auth.ts`, `flow.ts`, `messages/route.ts`, `NewWorkWizard.tsx`, `stream/route.test.ts`, `verify/route.ts`, `FlowError`, `matching.ts`, `offers/route.ts`, `media/route.ts`, `Worker`, `status/route.ts`, `VoiceCapture.tsx`, `cancel/route.ts`, `jobs/route.test.ts`, `location/route.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `auth.ts` to `requireRole`, `stream.ts`, `messages/route.ts`, `verify/route.ts`, `seed.ts`, `matching.ts`, `offers/route.ts`, `media/route.ts`, `Worker`, `status/route.ts`, `dashboard.ts`, `location/route.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05450165612767239 - nodes in this community are weakly interconnected._
- **Should `NewWorkWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05410628019323672 - nodes in this community are weakly interconnected._
- **Should `Graphify Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `verify/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0858843537414966 - nodes in this community are weakly interconnected._