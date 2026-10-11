# Hyperframes Composition Brief: Ustad AI

## Objective
Create a short launch-style brag video for Ustad AI — an AI-powered home repair marketplace for Pakistan.

## Output
- Composition directory: `brag-output-2026-09-23-064226/composition/`
- Rendered video: `brag-output-2026-09-23-064226/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/home/bilal_dev/Documents/projects/oss/Ustad Ai`
- Primary files read: `client/src/app/page.tsx`, `client/src/app/globals.css`, `client/src/client/components/VoiceCapture.tsx`, `client/src/client/components/MatchResults.tsx`, `client/src/client/components/tracking/TrackingMap.tsx`, `README.md`
- Product name: Ustad AI
- Tagline / strongest claim: "Speak your problem in Roman Urdu, Urdu, or English — Ustad understands it, finds the right worker, and tracks the job to completion."
- Key UI or visual moment to recreate: The pulsing green mic button with animated rings on the dark glassmorphic background
- Copy that must appear verbatim:
  - "Mera pipe leak kar raha hai" (the demo Roman Urdu input)
  - "Ustad is understanding your problem…"
  - "Best Match" (gold badge on top worker)
  - "Speak. Match. Fix." (tagline)

## Creative Direction
- Tone preset: polished
- Creative direction: premium product film for a real tool solving real problems in Pakistan
- Interpretation: confident, clean, restrained. The product's actual UI is the star. Slow reveals for mic and map, faster pacing for worker cards.
- Angle: The most powerful home repair app in Pakistan starts with three words in your language
- Hook: Dark screen, green mic button materializes, Urdu text types out
- Outro / punchline: "Ustad AI" in bold green, "Speak. Match. Fix." below
- Avoid: generic SaaS language, abstract filler, unrelated visual redesign

## Visual Identity
- Background: #0B0F0C (deep dark green-black)
- Text: #F1F4F1 (warm white)
- Accent: #26A650 (vibrant green)
- Secondary accent: #D4A24C (gold for badges)
- Amber: #E0A461 (warm amber for recording state)
- Display font: Calibri, Segoe UI, system sans-serif
- Body font: Calibri, Segoe UI, system sans-serif
- Visual references: glassmorphic cards with backdrop-filter blur, green pulsing mic, dark ambient glows

## Storyboard
1. Hook: The Mic — 4s — Green mic button, Urdu text types out, mic turns amber
2. AI Processing — 3s — Bouncing dots, typewriter text cycles through AI analysis
3. Worker Matches — 5s — Three cards slide in one by one with ratings/distance/price
4. Live Tracking Map — 5s — Leaflet map with worker marker moving along route
5. Outro: Ustad AI — 3s — Logo slams in, tagline fades up

## Audio
- Audio role: warm professional bed
- Audio arc: fade in → steady build → peak on map → fade out under logo
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3
- Music treatment: fade in at 0s at 0.35 volume, hold, fade out over last 1.5s
- Music cue guidance: detect at composition time via hyperframes beats
- Audio-reactive treatment: subtle; mic button glow breathes with RMS
- Audio-coupled moments:
  - Mic button: soft click (interface/click_001)
  - AI processing: drop sound (interface/drop_001)
  - Worker cards: card sounds (casino/card-place-1)
  - Map reveal: soft impact (impactSoft_medium_000)
  - Logo landing: deep bell (impactBell_heavy_000)
- SFX selection guidance: sparse, well-timed, never competing with music
- Exact SFX choice: Hyperframes chooses filenames and timestamps based on animation

## Hyperframes Instructions
- Show the actual product UI: mic button, worker cards, tracking map
- Keep all text readable in the final render
- Keep the video within 15-25 seconds (target: 20s)
- Include music/SFX layer
- Use GSAP for all animations
- No Math.random() — use deterministic animation
- Every element animates IN via gsap.from(...)
- No exit animations except on final scene
- Register all timelines in window.__timelines
- Use padding-based layout, not absolute positioning for content
- Run hyperframes check before render
