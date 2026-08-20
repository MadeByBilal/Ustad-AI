# Graph Report - Ustad Ai  (2026-08-20)

## Corpus Check
- 141 files · ~61,041 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 774 nodes · 1765 edges · 64 communities (45 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ecd7bbd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fail
- flow.ts
- index.ts
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
- connectDB
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
- requireRole
- chat.ts
- messages/route.ts
- ActiveJobPanel.tsx
- stream/route.test.ts
- WorkerCategory
- dashboard/route.ts
- seed.ts
- auth.ts
- offers/route.ts
- customer/page.tsx
- media/route.ts
- FlowError
- status/route.ts
- LocationUpdater
- Offer.ts
- scripts
- VoiceCapture.test.tsx
- safety.ts
- WorkerChat
- package.json
- location/route.ts
- Upload.ts
- eslint-config-next
- Session.ts
- jsdom
- tailwindcss
- tsx
- @types/node
- @types/react
- typescript
- vitest

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 69 edges
2. `connectDB()` - 54 edges
3. `fail()` - 53 edges
4. `ok()` - 52 edges
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
- `handleFile()` --calls--> `fileToPhotoBase64()`  [EXTRACTED]
  src/components/worker/JobPhotoUpload.tsx → src/lib/image.ts
- `WorkerSeed` --references--> `WorkerCategory`  [EXTRACTED]
  src/scripts/seed.ts → src/models/Worker.ts
- `MCP Server` --conceptually_related_to--> `query Subcommand`  [INFERRED]
  .opencode/skills/graphify/references/exports.md → .opencode/skills/graphify/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]

## Communities (64 total, 19 thin omitted)

### Community 0 - "fail"
Cohesion: 0.16
Nodes (23): bodySchema, dynamic, POST(), dynamic, POST(), dynamic, GET(), PATCH() (+15 more)

### Community 1 - "flow.ts"
Cohesion: 0.06
Nodes (64): CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, CUSTOMER_SESSION, FlowError, JobDetail, analysisTextFor() (+56 more)

### Community 2 - "index.ts"
Cohesion: 0.15
Nodes (15): ACTOR_TYPES, JobEventDoc, jobEventSchema, MessageDoc, messageSchema, MessageSenderType, SENDER_TYPES, SYSTEM_SENDER_ID (+7 more)

### Community 3 - "NewWorkWizard.tsx"
Cohesion: 0.06
Nodes (28): dynamic, NewWorkPage(), AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, humanize() (+20 more)

### Community 4 - "Graphify Tool"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "verify/route.ts"
Cohesion: 0.07
Nodes (38): dynamic, POST(), bodySchema, dynamic, POST(), dynamic, GET(), bodySchema (+30 more)

### Community 6 - "analyze.ts"
Cohesion: 0.17
Nodes (13): fallbackResult(), analyzeJobInput(), CANONICAL_SKILLS, CATEGORY_ESTIMATES, deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+5 more)

### Community 7 - "devDependencies"
Cohesion: 0.13
Nodes (15): eslint, devDependencies, eslint, postcss, @testing-library/jest-dom, @testing-library/react, @testing-library/user-event, @types/react-dom (+7 more)

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
Nodes (10): CATEGORY_LABELS, currency(), ResultPanel(), Status, UnderstandResponse, URGENCY_LABELS, VoiceCapture(), parseApiResponse() (+2 more)

### Community 14 - "dashboard.ts"
Cohesion: 0.17
Nodes (13): CounterOfferModal(), IncomingJobCard(), act(), askClarification(), postJson(), fetchMock, JOB, NOW (+5 more)

### Community 15 - "connectDB"
Cohesion: 0.16
Nodes (15): dynamic, GET(), dynamic, GET(), createSchema, dynamic, GET(), POST() (+7 more)

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

### Community 32 - "requireRole"
Cohesion: 0.15
Nodes (15): dynamic, POST(), CUSTOMER_SESSION, JPEG_PNG, dynamic, GET(), PNG, WORKER_SESSION (+7 more)

### Community 33 - "chat.ts"
Cohesion: 0.24
Nodes (9): ChatMessageView, getAccessibleJob(), SendMessageInput, createJobStream(), JobStreamEvent, JobStreamMessage, JobStreamOptions, DECODER (+1 more)

### Community 34 - "messages/route.ts"
Cohesion: 0.33
Nodes (8): dynamic, GET(), POST(), postSchema, CUSTOMER_SESSION, WORKER_SESSION, listJobMessages(), sendJobMessage()

### Community 35 - "ActiveJobPanel.tsx"
Cohesion: 0.25
Nodes (6): ActiveJob, ActiveJobPanel(), NEXT_ACTIONS, STATUS_LABELS, JobPhotoUpload(), handleFile()

### Community 36 - "stream/route.test.ts"
Cohesion: 0.29
Nodes (4): CUSTOMER_SESSION, encoder, FlowError, WORKER_SESSION

### Community 37 - "WorkerCategory"
Cohesion: 0.31
Nodes (9): AnalysisResult, KeywordRule, JobInputPayload, MatchContext, SearchFilters, WorkerOptionsFilters, WorkerResult, UrgencyLevel (+1 more)

### Community 38 - "dashboard/route.ts"
Cohesion: 0.43
Nodes (5): dynamic, GET(), DASHBOARD, WORKER_SESSION, getWorkerDashboard()

### Community 39 - "seed.ts"
Cohesion: 0.21
Nodes (12): disconnectDB(), CITIES, City, CUSTOMERS, EMERGENCY_CAPABILITIES, jitter(), main(), REVIEW_TAGS (+4 more)

### Community 40 - "auth.ts"
Cohesion: 0.22
Nodes (6): bodySchema, dynamic, POST(), CUSTOMER_SESSION, FlowError, AllowedRole

### Community 41 - "offers/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 42 - "customer/page.tsx"
Cohesion: 0.20
Nodes (8): dynamic, QUICK_ACTIONS, JOB_STATUS_STYLES, INPUT_TYPES, Job, JOB_STATUSES, jobSchema, PRICING_STATUSES

### Community 43 - "media/route.ts"
Cohesion: 0.25
Nodes (5): bodySchema, dynamic, POST(), FlowError, WORKER_SESSION

### Community 44 - "FlowError"
Cohesion: 0.14
Nodes (11): dynamic, POST(), FlowError, WORKER_SESSION, bodySchema, dynamic, POST(), FlowError (+3 more)

### Community 45 - "status/route.ts"
Cohesion: 0.22
Nodes (6): bodySchema, dynamic, POST(), statusSchema, FlowError, WORKER_SESSION

### Community 46 - "LocationUpdater"
Cohesion: 0.47
Nodes (5): Coordinates, LocationUpdater(), send(), submitManual(), useAutomatic()

### Community 47 - "Offer.ts"
Cohesion: 0.40
Nodes (4): OFFER_STATUSES, OFFER_TYPES, OfferDoc, offerSchema

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

## Knowledge Gaps
- **253 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `requireRole` to `fail`, `flow.ts`, `messages/route.ts`, `NewWorkWizard.tsx`, `stream/route.test.ts`, `verify/route.ts`, `dashboard/route.ts`, `auth.ts`, `matching.ts`, `offers/route.ts`, `media/route.ts`, `FlowError`, `status/route.ts`, `customer/page.tsx`, `connectDB`, `jobs/route.test.ts`, `location/route.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `connectDB` to `requireRole`, `fail`, `messages/route.ts`, `chat.ts`, `verify/route.ts`, `dashboard/route.ts`, `seed.ts`, `matching.ts`, `offers/route.ts`, `customer/page.tsx`, `media/route.ts`, `auth.ts`, `status/route.ts`, `dashboard.ts`, `location/route.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `flow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055246913580246915 - nodes in this community are weakly interconnected._
- **Should `NewWorkWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056025369978858354 - nodes in this community are weakly interconnected._
- **Should `Graphify Tool` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `verify/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0734006734006734 - nodes in this community are weakly interconnected._