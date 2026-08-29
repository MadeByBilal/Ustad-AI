# TDD Evidence Report: Voice Capture Hardening

**Date:** 2026-08-29
**Source plan:** Derived from the VoiceCapture hardening request in this session.

## User Journeys

- As a customer on Safari or iOS, I want my recording uploaded in a supported format, so transcription does not fail because of a WebM-only upload.
- As a customer, I want the microphone button to visibly respond to my voice, so I know the app is actually hearing me.
- As a customer, I want silent or unusable recordings rejected locally, so I do not wait for an unnecessary transcription request.
- As a customer using touch or a keyboard, I want the same tap-to-toggle interaction, so recording is not accidentally truncated.
- As a customer, I want hung analysis requests to time out with a retry action, so I am never stuck indefinitely.
- As a customer, I want to know when location access failed, so I can retry or consciously continue without distance information.

## Task Report

| Task | Summary | Validation |
|---|---|---|
| Safari MIME negotiation | Detects MP4/WebM support before constructing `MediaRecorder`, preserves the actual MIME, and derives the upload filename from it. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Mic feedback and silence gate | Samples time-domain RMS levels, smooths the button feedback, and rejects tiny or silent captures before `fetch`. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Mobile interaction | Uses one native click toggle for pointer and keyboard input and ignores pointer drift. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Lifecycle safety | Guards pending and active starts, handles recorder errors, releases streams and audio contexts, and prevents stale async updates. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Request timeout | Aborts the analysis request after 18 seconds and routes it through the existing retryable error state. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Location fallback | Pauses after geolocation failure and offers retry or an explicit continue-without-location path; dashboard copy no longer claims nearby results without coordinates. | `npm run test -- src/components/VoiceCapture.test.tsx` - 17/17 PASS |
| Production logging | Removes transcript, AI-object, mic-level, and audio-chunk debug logging from the client and transcription route. | Source inspection: no `console.log`/`console.warn` in `src/` |

## Test Specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Safari-compatible MP4 is selected when it is the first supported MIME and the upload is named `voice.mp4`. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 2 | Tiny recordings are rejected without calling `/api/ai/understand`. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 3 | Analyser-level silence is rejected without calling the backend. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 4 | Pointer, touch-style click, Enter, and Space use the same start/stop behavior. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 5 | Repeated starts while `getUserMedia()` is pending create only one microphone request and recorder. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 6 | Recorder errors and component unmount release the microphone and show a retryable error when appropriate. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 7 | A hung analysis request is aborted and shows the existing retry action. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 8 | Geolocation failure is visible and the backend is not called until the user explicitly continues without location. | `src/components/VoiceCapture.test.tsx` | component | PASS | 17/17 focused tests |
| 9 | Full regression behavior has no failures caused by this change. | `npm run test` | full suite | PARTIAL | 968 passed, 3 unrelated UI assertion failures, 1 skipped |

## Coverage and Known Gaps

- `npm run test -- --coverage` could not run because `@vitest/coverage-v8` is not installed.
- The full suite failures are in `LoadingState.test.tsx`, `WorkerResults.test.tsx`, and `IncomingJobCard.test.tsx`; none touch the VoiceCapture path.
- The changed feature files pass targeted ESLint. Full lint/build remain blocked by existing unused symbols and unrelated type/lint errors elsewhere in the repository.
- No Playwright/WebKit harness is configured, so real Safari/iOS validation remains a manual acceptance step.
- The location fallback deliberately uses an explicit no-location choice instead of a non-functional city/area text field. The current matcher has no geocoder and does not distance-rank its catalogue preview.

## Merge Evidence

No git commits were created because commit operations were not explicitly requested.
