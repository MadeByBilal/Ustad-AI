# TDD Evidence Report: Instant Tracking Routes

**Date:** 2026-08-29
**Source plan:** Derived from the instant-routing implementation plan in this session.

## User Journeys

- As a customer, I want the road route to appear as soon as tracking opens, so I do not wait for a polling cycle.
- As a worker, I want the route to be available immediately on the tracking view, so the map is useful while I travel.
- As a tracking client, I want a newly computed route pushed over Socket.IO, so the map updates without polling.
- As a user, I want no misleading dashed straight-line route while road routing is loading or refreshing.

## Task Report

| Task | Summary | Validation |
|---|---|---|
| Route return value | `computeAndStoreRoute` now returns the stored polyline and metrics, or `null` on provider failure. | `npm test -- src/lib/job/route-precompute.test.ts` — 2/2 PASS |
| Socket delivery | Existing routes are sent on `join-job`; newly precomputed routes are broadcast after `EN_ROUTE`. | `npm test -- src/lib/socket-handlers.test.ts src/lib/job/flow-route-push.test.ts` — 2/2 PASS |
| Immediate hydration | Customer dashboard/list and dedicated tracking views receive route/location data before the next poll. | Relevant code linted; lifecycle and route tests pass. |
| Fallback removal | Removed the dashed straight-line polyline and the 500ms map mount delay. Existing road geometry remains visible during refresh. | Source inspection and targeted lint pass. |

## Test Specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|---|---|---|---|---|
| 1 | A valid OSRM response is stored in the Job document and returned as `[lat, lng]` route points with rounded metrics. | `src/lib/job/route-precompute.test.ts` | unit | PASS | 2/2 tests |
| 2 | Routing-provider failures resolve to `null` without throwing. | `src/lib/job/route-precompute.test.ts` | unit | PASS | 2/2 tests |
| 3 | A client joining a job with a stored route receives `route-computed` immediately. | `src/lib/socket-handlers.test.ts` | integration-style unit | PASS | 1/1 test |
| 4 | An `EN_ROUTE` transition broadcasts the completed route to the job room. | `src/lib/job/flow-route-push.test.ts` | integration-style unit | PASS | 1/1 test |
| 5 | Existing job lifecycle behavior remains green with the route precompute path mocked when no location exists. | `src/lib/job/flow.test.ts`, `src/lib/job/e2e-workflow.test.ts` | integration | PASS | 60/60 targeted tests |
| 6 | Full regression suite has no failures caused by instant-routing changes. | `npm test` | full suite | PARTIAL | 957 passed, 3 pre-existing UI assertion failures |

## Coverage and Known Gaps

- `npm test -- --coverage` could not run because `@vitest/coverage-v8` is not installed.
- Full-suite failures are existing icon/skeleton assertions in `LoadingState.test.tsx`, `WorkerResults.test.tsx`, and `IncomingJobCard.test.tsx`; they are unrelated to route or socket code.
- Full `npm run lint` and `npm run build` remain blocked by existing errors outside this change. All changed implementation and test files pass targeted ESLint.
- Socket authorization inherits the existing Socket.IO trust model and should be hardened separately before exposing tracking rooms publicly.

## Merge Evidence

No git commits were created because commit operations were not explicitly requested.
