# Brag Plan: Ustad AI

## What is this app?
An AI-powered home repair marketplace for Pakistan — speak your problem in Roman Urdu, Urdu, or English, and the AI classifies the job, estimates the price in PKR, finds the nearest qualified worker, and tracks them to your door in real time.

## The angle
The most powerful home repair app in Pakistan starts with three words in your language. No forms. No typing. Just speak, and an AI understands your broken pipe in Roman Urdu, finds a plumber within 5km, and shows you driving to your door on a live map. This is the app your dad wishes existed.

## Hook (first 2-3 seconds)
The dark glassmorphic mic button fills the screen, pulsing with green rings. A single line of Urdu text fades in: "Mera pipe leak kar raha hai" (My pipe is leaking). The mic glows amber — recording has started. This earns the next 20 seconds because it looks like something from a sci-fi film, but it's a real product solving a real problem.

## Key moments (the middle)
- The AI processing animation — bouncing green dots cycle through "Ustad is understanding your problem…", "Finding nearest workers…", "Analyzing your requirements…" — the brain at work.
- Worker match cards slide in one by one: avatar, name, category, star rating, distance in km, price estimate in PKR. The "Best Match" card glows with a gold trophy badge. This is the payoff — real people, real scores, real proximity.
- The live tracking map: a Leaflet map with an animated worker marker (🧑‍🔧 emoji in an orange circle) moving along a road polyline toward a green customer pin. Distance badge updates in real time. This is the "holy shit" moment — you can watch your plumber drive to your house.

## Outro / punchline
"Ustad AI" in bold green type. Below it: "Speak. Match. Fix." — the three-word promise. A subtle map pin icon lands beside the name. Clean. Confident. Done.

## User flow worth showing
1. **Speak** — Customer holds the mic, says "Mera pipe leak kar raha hai" in Roman Urdu
2. **AI understands** — Processing animation with typewriter text: category (Plumber), skills (pipe), urgency, price range in PKR
3. **Workers found** — Match cards slide in: best match highlighted, distance + rating + price
4. **Track them** — Live map with worker marker moving along the route to the customer

## Tone
- Preset: polished
- Creative direction: premium product film for a real tool that solves real problems
- Interpretation: confident, clean, restrained. The product's actual UI is the star — no flashy effects needed. Slow reveals for the mic and map, faster pacing for the worker cards.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: #0B0F0C (deep dark green-black)
- Accent: #26A650 (vibrant green)
- Text: #F1F4F1 (warm white)
- Secondary accent: #D4A24C (gold for badges/premium)
- Warning/input: #E0A461 (warm amber)
- Display font: Calibri / Segoe UI (system font stack)
- Body font: Calibri / Segoe UI
- Strongest visual element: The pulsing green mic button with animated rings on the dark glassmorphic background — instantly recognizable, looks premium

## Share copy (draft)
Speak your problem in Urdu. AI finds the right worker. Track them to your door. Built for Pakistan. 🇵🇰

## Audio direction
- Role: warm professional bed — confident but not loud
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 (steady, clean, polished tone)
- Music treatment: fade in at 0s at 0.35 volume, hold steady, fade out over last 1.5s
- Music cue guidance: detect at composition via hyperframes beats or analyze_music_cues.py
- Audio-reactive treatment: subtle; use music RMS to make the mic button glow breathe slightly and the map arrival zone pulse gently
- SFX posture: sparse but present — 4-5 well-timed cues
- Audio-coupled moments:
  - Mic button press: soft click (interface/click_001)
  - AI processing start: subtle whoosh (interface/drop_001)
  - Worker cards appearing: soft card sounds (casino/card-place-1)
  - Map reveal: gentle impact (impactSoft_medium_000)
  - Logo landing: deep bell (impactBell_heavy_000)
- Restraint rule: SFX must never compete with the music bed or the product's own UI sounds

## Storyboard

### Scene 1 — Hook: The Mic — 4s
The dark screen. A large green mic button materializes in the center, pulsing with ambient glow rings. Below it, the Urdu text "Mera pipe leak kar raha hai" types out character by character. The mic turns amber — recording active. "Hold to speak" label visible below.
Sequential/interaction: yes — text types out character by character with keyboard ticks
Audio intent: establish presence — warm, confident, inviting
Audio-coupled idea: keypress ticks on each character of the Urdu text
Music: fade in, warm bed
Transition mood: soft crossfade → Scene 2

### Scene 2 — AI Processing — 3s
The mic shrinks and moves up. Three green bouncing dots appear. Typewriter text cycles: "Ustad is understanding your problem…" → "Finding nearest workers…" → "Analyzing your requirements…". The glassmorphic card background shows the AI's classification: Category: Plumber, Skills: pipe, Urgency: low, Price: 800–1500 PKR.
Sequential/interaction: yes — three dots bounce in sequence, text cycles
Audio intent: the brain at work — subtle, technical, alive
Audio-coupled idea: subtle glitch or digital accent on each text change
Music: continues, steady
Transition mood: clean cut → Scene 3

### Scene 3 — Worker Matches — 5s
Three worker cards slide in from the right, one by one, with 0.15s stagger. Each card shows: avatar initials in a circle, name, category (Plumber), star rating (4.8), distance (2.3 km), price estimate (PKR 1,200). The first card gets a "Best Match" gold trophy badge. The cards have the glassmorphic style from the actual UI.
Sequential/interaction: yes — three cards slide in one by one with card sounds
Audio intent: satisfaction — the answer arrives
Audio-coupled idea: card-place sound on each card arrival, soft bell on the "Best Match" badge
Music: builds slightly
Transition mood: slide left → Scene 4

### Scene 4 — Live Tracking Map — 5s
A Leaflet map fills the screen. An orange worker marker (🧑‍🔧 in a circle) moves along a road polyline toward a green customer pin. A distance badge in the top-left shows "2.3 km" counting down. The arrival zone circle pulses gently at the destination. The map has the warm CARTO Voyager tiles.
Sequential/interaction: yes — worker marker animates along the route, distance counts down
Audio intent: the "holy shit" moment — this is real, this is happening now
Audio-coupled idea: soft ambient whoosh as the map appears, subtle tick on distance updates
Music: reaches its peak energy
Transition mood: dramatic wipe → Scene 5

### Scene 5 — Outro: Ustad AI — 3s
The map fades. "Ustad AI" slams in at full scale in bold green (#26A650). Below it: "Speak. Match. Fix." fades up in warm white. A small map pin icon settles beside the name. Clean dark background. Hold for 2 seconds.
Sequential/interaction: yes — name lands first, tagline fades up after 0.3s
Audio intent: confidence — the product name is the final word
Audio-coupled idea: deep bell on the name landing, soft click on the tagline
Music: begins fade-out at 1.5s into the scene
Transition mood: fade to black

**Music mood for this video:** polished — clean, professional, confident
**Audio summary:** warm professional bed fades in, builds through the worker reveal, peaks on the map tracking moment, and fades out cleanly under the logo. SFX punctuate key interactions without cluttering.
