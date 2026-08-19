# Graph Report - Ustad Ai  (2026-08-19)

## Corpus Check
- Corpus is ~44,518 words - fits in a single context window. You may not need a graph.

## Summary
- 611 nodes · 1274 edges · 31 communities (22 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Route Handlers
- API Integration Tests
- Photo Jobs & Models
- Job Creation Flow
- Graphify Tool Docs
- Auth & Sessions
- Job Analysis
- Lint & Dev Dependencies
- Geo Utilities
- TypeScript Config
- Core Dependencies
- Photo Picker UI
- Voice Capture
- Worker Availability UI
- Offer Logic
- Dashboard
- Jobs API Tests
- Login Flow
- ESLint Config
- Opencode Config
- Landing Page
- Graphify Plugin
- PostCSS Config
- Root Layout
- Next Config
- Tailwind Config
- Graphify God Nodes
- Obsidian Export

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 45 edges
2. `connectDB()` - 38 edges
3. `ok()` - 37 edges
4. `fail()` - 34 edges
5. `authError()` - 28 edges
6. `FlowError` - 21 edges
7. `Graphify Tool` - 21 edges
8. `Worker` - 20 edges
9. `compilerOptions` - 15 edges
10. `WorkerCategory` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Usage Rules` --conceptually_related_to--> `Ustad AI Marketplace`  [INFERRED]
  AGENTS.md → README.md
- `NewWorkPage()` --calls--> `requireRole()`  [EXTRACTED]
  src/app/dashboard/customer/new-work/page.tsx → src/lib/auth.ts
- `Graphify Usage Rules` --references--> `Graphify Tool`  [EXTRACTED]
  AGENTS.md → .opencode/skills/graphify/SKILL.md
- `Graphify Usage Rules` --references--> `GRAPH_REPORT.md`  [EXTRACTED]
  AGENTS.md → .opencode/skills/graphify/SKILL.md
- `Graphify Usage Rules` --references--> `query Subcommand`  [EXTRACTED]
  AGENTS.md → .opencode/skills/graphify/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Extraction Pipeline** — opencode_skills_graphify_skill_filedetection, opencode_skills_graphify_skill_ast_extraction, opencode_skills_graphify_skill_semantic_extraction, opencode_skills_graphify_skill_clustering, opencode_skills_graphify_skill_community_labeling, opencode_skills_graphify_skill_graph_report [EXTRACTED 1.00]
- **Graph Query Flows** — opencode_skills_graphify_skill_query_subcommand, opencode_skills_graphify_skill_path_subcommand, opencode_skills_graphify_skill_explain_subcommand [EXTRACTED 1.00]
- **Graph Export Targets** — opencode_skills_graphify_skill_html_viz, opencode_skills_graphify_skill_obsidian_vault, opencode_skills_graphify_references_exports_wiki_export, opencode_skills_graphify_references_exports_neo4j_export, opencode_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]

## Communities (31 total, 9 thin omitted)

### Community 0 - "API Route Handlers"
Cohesion: 0.06
Nodes (67): dynamic, GET(), dynamic, POST(), bodySchema, dynamic, POST(), CUSTOMER_SESSION (+59 more)

### Community 1 - "API Integration Tests"
Cohesion: 0.05
Nodes (57): FlowError, WORKER_SESSION, CUSTOMER_SESSION, FlowError, FlowError, WORKER_SESSION, FlowError, WORKER_SESSION (+49 more)

### Community 2 - "Photo Jobs & Models"
Cohesion: 0.06
Nodes (37): CUSTOMER_SESSION, JPEG_PNG, SessionUser, INPUT_TYPES, JOB_STATUSES, jobSchema, JobStatus, PRICING_STATUSES (+29 more)

### Community 3 - "Job Creation Flow"
Cohesion: 0.05
Nodes (29): dynamic, NewWorkPage(), AnalyzedJob, BroadcastInfo, CATEGORY_OPTIONS, Coords, DEMO_COORDS, humanize() (+21 more)

### Community 4 - "Graphify Tool Docs"
Cohesion: 0.07
Nodes (43): Graphify Usage Rules, URL Ingestion, MCP Server, Neo4j Export, Wiki Export, Confidence Rubric, Hyperedges, Node ID Convention (+35 more)

### Community 5 - "Auth & Sessions"
Cohesion: 0.11
Nodes (28): dynamic, POST(), bodySchema, dynamic, POST(), dynamic, GET(), bodySchema (+20 more)

### Community 6 - "Job Analysis"
Cohesion: 0.07
Nodes (34): AnalysisResult, analyzeJobInput(), CANONICAL_SKILLS, CATEGORY_ESTIMATES, deriveAnalysisForCategory(), EMERGENCY_KEYWORDS, FLAG_BY_KEYWORD, hasKeyword() (+26 more)

### Community 7 - "Lint & Dev Dependencies"
Cohesion: 0.06
Nodes (31): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, postcss (+23 more)

### Community 8 - "Geo Utilities"
Cohesion: 0.13
Nodes (24): buildBoundingBox(), EARTH_RADIUS_KM, haversineDistanceKm(), kmToDegreesRadius(), toRad(), clamp(), CompletenessSignals, EMERGENCY_CAPABILITY_BONUS (+16 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 10 - "Core Dependencies"
Cohesion: 0.09
Nodes (21): mongoose, dependencies, mongoose, next, react, react-dom, zod, next (+13 more)

### Community 11 - "Photo Picker UI"
Cohesion: 0.19
Nodes (12): PhotoPicker(), handleFiles(), remove(), update(), PhotoUpload, fetchMock, dataUrlToBase64(), downscale() (+4 more)

### Community 12 - "Voice Capture"
Cohesion: 0.16
Nodes (11): collectTranscript(), errorMessage(), getRecognitionConstructor(), SpeechRecognitionConstructor, SpeechRecognitionLike, SpeechRecognitionResultEvent, SpeechTranscriptResult, FakeSpeechRecognition (+3 more)

### Community 13 - "Worker Availability UI"
Cohesion: 0.24
Nodes (5): dynamic, AcceptJobButton(), AvailabilityState, WorkerAvailability(), JOB_STATUS_STYLES

### Community 14 - "Offer Logic"
Cohesion: 0.29
Nodes (8): COUNTER_HIGH_FACTOR, COUNTER_LOW_FACTOR, midpointOffer(), OFFER_HIGH_FACTOR, OFFER_LOW_FACTOR, offerIsExpired(), OfferValidation, roundTo50()

### Community 15 - "Dashboard"
Cohesion: 0.36
Nodes (4): DashboardLayout(), DashboardIndexPage(), LogoutButton(), getSessionUser()

### Community 16 - "Jobs API Tests"
Cohesion: 0.33
Nodes (3): ANALYZED_JOB, CUSTOMER_SESSION, FlowError

### Community 18 - "ESLint Config"
Cohesion: 0.50
Nodes (3): extends, next/core-web-vitals, next/typescript

### Community 19 - "Opencode Config"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

## Knowledge Gaps
- **201 isolated node(s):** `next/core-web-vitals`, `next/typescript`, `$schema`, `.opencode/plugins/graphify.js`, `nextConfig` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireRole()` connect `API Route Handlers` to `API Integration Tests`, `Photo Jobs & Models`, `Job Creation Flow`, `Worker Availability UI`, `Dashboard`, `Jobs API Tests`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `connectDB()` connect `API Route Handlers` to `API Integration Tests`, `Auth & Sessions`, `Job Analysis`, `Geo Utilities`, `Worker Availability UI`, `Dashboard`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `next/typescript`, `$schema` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.05627705627705628 - nodes in this community are weakly interconnected._
- **Should `API Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.05277777777777778 - nodes in this community are weakly interconnected._
- **Should `Photo Jobs & Models` be split into smaller, more focused modules?**
  _Cohesion score 0.06207482993197279 - nodes in this community are weakly interconnected._
- **Should `Job Creation Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.05410628019323672 - nodes in this community are weakly interconnected._