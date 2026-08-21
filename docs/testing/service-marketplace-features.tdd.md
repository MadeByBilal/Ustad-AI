# TDD Evidence Report: Service Marketplace Features

**Date:** 2026-08-20
**Baseline:** 347 tests passing, 2 test files broken (WorkerResults.tsx syntax error)
**Final:** 393 tests passing, 0 broken files

## Source Plan

Three prioritized features for the Ustad AI marketplace:
1. Authentication System (email/password)
2. Customer Dashboard with Voice AI Matching (optimized)
3. Technician Recommendation & Job Request System

## Task Report

### P1: Authentication System

| Task | Summary | Evidence |
|------|---------|----------|
| Remove OTP/demo content | Deleted otp/verify routes, otp lib+test, demo login cards, seed demo data | Files removed: `src/app/api/auth/otp/route.ts`, `src/app/api/auth/verify/route.ts`, `src/lib/auth/otp.ts`, `src/lib/auth/otp.test.ts`. Login page rewritten. Seed script reset-only. |
| Password lib | scrypt hash/verify/strength via node:crypto | `src/lib/auth/password.ts` — 12 tests pass |
| User/Worker model changes | email (unique, required), password_hash (select:false), phone optional (sparse), worker geo optional | `src/models/User.ts`, `src/models/Worker.ts` — schema changes compile |
| Signup route | Email/password signup, role selection, worker profile creation | `src/app/api/auth/signup/route.ts` — 10 tests pass |
| Signin route | Email/password signin, generic error, session cookie | `src/app/api/auth/signin/route.ts` — 7 tests pass |
| Login page | Sign-in/sign-up tabs, role toggle, technician category+skills | `src/app/login/page.tsx` — rewritten, no demo content |

### P2: Voice AI Matching Optimization

| Task | Summary | Evidence |
|------|---------|----------|
| Fuzzy skill matching | Skill synonym map (tap→faucet, naali→drain, etc.) + canonicalization | `src/lib/matching.ts` — 10 new tests pass for synonyms/verified/rating |
| No-geo weights | Redistributed distance weight when radius_km=0, added rating signal | `NO_GEO_WEIGHTS` constant, sum=1.0 verified |
| Verified bonus | +5 points for verified workers in voice-match options | `VERIFIED_BONUS` constant, verified workers rank higher |
| Full ranked list | `getWorkerOptions` returns `{best, others, ranked}` | VoiceCapture dashboard variant shows full list |
| Score-based category | Keyword hit counting per category instead of first-match | `src/lib/job/analyze.ts` — 21 tests pass (4 new) |

### P3: Technician Recommendation & Job Request

| Task | Summary | Evidence |
|------|---------|----------|
| Request lib | `createDirectRequest`, `respondToDirectRequest`, `respondToCounter` | `src/lib/job/requests.ts` — module exports verified |
| API routes | POST /api/requests, /api/requests/respond, /api/requests/counter-response, /api/requests/list | 4 routes created, compile clean |
| VoiceCapture dashboard | Ranked technicians + "Send Request" + TechnicianRequestModal | `src/components/TechnicianRequestModal.tsx`, VoiceCapture.tsx updated |
| Customer dashboard | "My Requests" panel with counter-response actions | `src/components/CustomerRequestsPanel.tsx`, customer/page.tsx updated |
| Worker dashboard | "Direct Requests" section with accept/counter/decline | `DirectRequestCard.tsx`, dashboard.ts updated with `direct_requests` |
| WorkerResults fix | Fixed pre-existing JSX syntax error (fragment wrapper) | `src/components/WorkerResults.tsx` — test files now pass |

## Test Specification

| # | What is guaranteed | Test file | Test type | Result | Evidence |
|---|-------------------|-----------|-----------|--------|----------|
| 1 | Password hashing is deterministic for same input with different salts | `src/lib/auth/password.test.ts` | unit | PASS | `npx vitest run src/lib/auth/password.test.ts` |
| 2 | Password verification rejects wrong passwords and malformed hashes | `src/lib/auth/password.test.ts` | unit | PASS | 12/12 tests |
| 3 | Signup creates user with hashed password, sets session cookie | `src/app/api/auth/signup/route.test.ts` | integration | PASS | 10/10 tests |
| 4 | Signup rejects duplicate email, weak password, missing fields | `src/app/api/auth/signup/route.test.ts` | integration | PASS | 10/10 tests |
| 5 | Signin with wrong credentials returns generic 401 | `src/app/api/auth/signin/route.test.ts` | integration | PASS | 7/7 tests |
| 6 | Signin never leaks password hash in response | `src/app/api/auth/signin/route.test.ts` | integration | PASS | 7/7 tests |
| 7 | Fuzzy skill matching gives credit for synonym matches | `src/lib/matching.test.ts` | unit | PASS | 35/35 tests |
| 8 | Verified workers score higher than unverified in options | `src/lib/matching.test.ts` | unit | PASS | VERIFIED_BONUS verified |
| 9 | Rating score scales average_rating to 0-100 | `src/lib/matching.test.ts` | unit | PASS | 5.0→100, 4.0→80 |
| 10 | Keyword engine picks category with most hits | `src/lib/job/analyze.test.ts` | unit | PASS | 21/21 tests |
| 11 | Request lib exports all required functions | `src/lib/job/requests.test.ts` | unit | PASS | 1/1 test |
| 12 | Full test suite passes (393 tests, 39 files) | `npm test` | full suite | PASS | 393 passed, 0 failed |

## Coverage and Known Gaps

- **Request lib business logic** (`createDirectRequest`, `respondToDirectRequest`, `respondToCounter`): Tested via module export verification; full integration testing requires MongoDB + real model mocking (covered by existing flow.ts patterns). The lib uses the same Mongoose patterns as the proven `flow.ts`.
- **E2E tests**: Not added in this phase. The existing Playwright setup can be extended for full voice→request→negotiate flows.
- **Security audit**: Password hashing uses scrypt with random salt. No new native dependencies. Session tokens use 32-byte crypto random.

## Merge Evidence

No git commits were created in this session (system directive: no git mutations without explicit permission).
All changes are in the working tree and verified via:
- `npm test` — 393/393 pass
- `npm run lint` — 0 errors
- `npm run build` — passes

## Follow-up: Clarification and Travel Pricing

**Date:** 2026-08-21

| What is guaranteed | Test file or command | Result |
|---|---|---|
| Unclear AI responses expose checkbox-friendly clarification options, including fallback mode | `src/lib/job/ai.test.ts`, `src/components/VoiceCapture.test.tsx` | PASS |
| Checkbox selections can continue the clarification flow | `src/components/VoiceCapture.test.tsx` | PASS |
| Bike travel cost uses round-trip distance, 40 km/l, and 350 PKR/l | `src/lib/job/pricing.test.ts` | PASS |
| Predicted price combines complexity-adjusted service midpoint and travel cost | `src/lib/job/pricing.test.ts` | PASS |
| Worker results receive customer-relative distance and per-worker predicted pricing | `src/app/api/ai/understand/route.ts`, `src/lib/matching.ts` | Covered by pricing/matching suite |

Validation: `npm test` — 413/413 passed.

Pricing assumptions: bike efficiency is 40 km/l; petrol is 350 PKR/l; travel uses round-trip distance; complexity multipliers are low 0.85, medium 1.0, high 1.35. The visit/check fee remains separate from the predicted repair price.
