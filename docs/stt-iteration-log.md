# STT (Speech-to-Text) Iteration Log

This document records every iteration of the STT implementation in LiveTutor,
including the problem, the design change, the test results, and key takeaways.
Use this as a reference to avoid repeating past mistakes.

---

## Iteration 0 — Baseline (before 2025-02-15)

### Configuration
- `recognition.lang = 'zh-TW'`
- `recognition.continuous = true`
- `recognition.interimResults = true`
- **Session model**: user clicks "開始朗讀" once → recognition stays open → user clicks "完成這句" to submit each sentence
- On submit: `abort()` + immediate `start()` to reset results for next sentence
- Post-processing: `toTraditional()` (SC→TC character mapping) + `correctHomophones()`

### Test Results (log: `02141320.txt`)
- **STT returns Simplified Chinese** despite `zh-TW` setting
  - Raw: `他每天都去田里看和苗长高了没有` (Simplified)
  - After SC→TC: `他每天都去田裡看和苗長高了沒有` (Traditional) ✓
- SC→TC conversion works correctly for all tested characters
- Homophone correction works (和→禾)
- **No sentence-beginning loss** — session model keeps recognition running across sentences
- Match rates: 65%–95% across sentences (reasonable)

### Problems Identified
1. **STT output is Simplified Chinese** — `zh-TW` locale doesn't force Traditional output from Chrome's speech API

---

## Iteration 1 — Fix STT Language Tag (2025-02-15 morning)

### Change
- `recognition.lang` changed from `'zh-TW'` to `'cmn-Hant-TW'`
  - `cmn-Hant-TW` is the explicit BCP 47 tag: Mandarin, Traditional Han script, Taiwan
  - More specific than `zh-TW` which is just a region tag

### Test Results (log: `02150730.txt`)
- **STT now returns Traditional Chinese directly** ✓
  - Raw: `古時候有一個農夫他每天都去田裡看田和苗長高了沒有` (Traditional!)
  - After SC→TC: identical (no conversion needed)
- Match rate improved: Line 0 = 100%, Line 1 = 87.5%
- SC→TC conversion still applied but is now a no-op (safety net)

### Key Finding
> **`cmn-Hant-TW` is the correct BCP 47 tag for Traditional Chinese STT.**
> `zh-TW` does NOT guarantee Traditional character output from Chrome's Web Speech API.

---

## Iteration 2 — Per-Sentence Recording (2025-02-15 afternoon, first attempt)

### Change
- `recognition.continuous` changed from `true` to **`false`**
- Removed SC→TC conversion entirely (no longer needed with `cmn-Hant-TW`)
- Removed session model — each sentence: click "開始朗讀" → auto-stop on silence → evaluate
- `onend` triggers evaluation automatically (no "完成這句" button)

### Motivation
- User wanted each sentence to "start recording and stop when done" instead of continuous session

### Test Results (log: `02151600.txt`)
- **CRITICAL FAILURE: STT cuts off mid-sentence on any pause**
  - Target: `古時候有一個農夫，他每天都去田裡看禾苗長高了沒有。`
  - STT captured only: `古時候有一個農夫` (first clause before comma pause)
  - Match rate: 34.8% → Tier 3 (retry)
  - Duration: 5.4s, CPM: 256 (abnormally high — short capture)

### Key Finding
> **`continuous = false` is UNUSABLE for Chinese reading aloud.**
> Children naturally pause at punctuation (commas, periods). With `continuous = false`,
> Chrome's Web Speech API interprets ANY pause as "end of utterance" and stops
> recording immediately. A single sentence with a comma gets cut in half.

---

## Iteration 3 — User-Controlled Stop, Per-Sentence (2025-02-15 afternoon, second attempt)

### Change
- `recognition.continuous` changed back to `true` (never cut off on pauses)
- Added `isPreparing` state: show "準備中..." while STT initializes, "停止朗讀" only after `onstart`
- Added `accumulatedTranscriptRef` for transcript preservation across auto-reconnects
- Per-sentence model retained: "開始朗讀" per sentence → "停止朗讀" to submit
- Auto-reconnect in `onend` when browser/API times out
- No evaluation in `onend` for reconnect — only when user stops

### Motivation
- Fix the cut-off problem from Iteration 2 while keeping user-controlled stop
- iPhone-style: `continuous = true` + user decides when to stop

### Test Results (log: `02151620.txt`)
- No more mid-sentence cut-off ✓
- **NEW PROBLEM: First part of each sentence is lost**
  - Line 0: Target starts with `古時候有一個農夫` → STT starts at `他每天都去田裡看...` (beginning lost)
  - Line 1: Target starts with `他覺得禾苗長得太慢了` → STT only captured `心裡非常早起` (most of sentence lost)
  - Match rates: 65.2% and 25.0% (should be much higher)

### Root Cause Analysis
Each sentence requires a full `startRecording()` cycle:
1. `getUserMedia()` (mic permission check — fast after first grant, but not zero)
2. `new SpeechRecognition()` (new instance creation)
3. `recognition.start()` (async initialization)
4. Wait for `onstart` event (STT truly ready)

**This 1–2 second gap happens between every sentence.** The child sees the next
sentence and starts reading immediately, but the STT isn't listening yet.
The beginning of their speech is lost.

### Key Finding
> **Per-sentence recording (start/stop per sentence) loses the beginning of each sentence.**
> The STT initialization gap (~1–2s) is significant. Children don't wait — they
> start reading as soon as they see the sentence. This is fundamentally incompatible
> with per-sentence start/stop.

---

## Iteration 4 — Session Model Restored (2025-02-15 afternoon, third attempt)

### Change
- Restored **session model**: "開始朗讀" starts once → recognition stays open
- New `submitSentence()`: evaluates current transcript → `abort()` + instant `start()` to reset for next sentence
  - Reuses the SAME recognition object (no `new SpeechRecognition()`, no `getUserMedia()`)
  - The abort+restart gap is near-zero (~ms, not seconds)
- Main button: "完成這句" (emerald) when session active — user clicks when done reading a sentence
- "停止朗讀" at bottom to fully end the session
- `onend` only reconnects (no evaluation) — evaluation happens in `submitSentence` only
- All other improvements preserved: `cmn-Hant-TW`, `continuous = true`, `isPreparing`, auto-reconnect

### Motivation
- Combine the best of all iterations:
  - Session model (Iteration 0) eliminates inter-sentence gap
  - `cmn-Hant-TW` (Iteration 1) gives Traditional Chinese directly
  - `continuous = true` (Iteration 3) prevents mid-sentence cut-off
  - `isPreparing` + `onstart` (Iteration 3) ensures STT is truly ready before showing UI

### Test Results (log: `02151640.txt`)
- **Subsequent sentences work perfectly** — session model eliminates inter-sentence gap
  - Line 1: `他覺得和苗長得太慢了心裡非常著急` → 100% match ✓
  - Line 2: `有一天他想到一個辦法把核苗也可以可往上爬高` → 90.5% match ✓
- **First sentence STILL loses beginning** — startup delay problem
  - Line 0: STT = `農夫他每天都去田裡看和描長高了沒有` → missing `古時候有一個` (first ~4s of speech)
  - Match rate: 73.9% (should be ~100% if fully captured)
- Also observed: `audio-capture` error + `no-speech` errors during idle periods (handled by auto-reconnect)

### Problem Identified
The first sentence has a unique startup cost that subsequent sentences don't:
1. `getUserMedia()` — async mic permission check (~50–200ms even when cached)
2. `new SpeechRecognition()` — instance creation (~1ms)
3. `recognition.start()` — async init (~200–1000ms)
4. `onstart` event — STT truly ready

Total first-sentence gap: **~500ms–2s**. Child starts reading during this gap.
Subsequent sentences use `abort()` + `start()` on the **same** instance (no step 1–2), so gap is ~ms.

---

## Iteration 5 — Reduce First-Sentence Startup (2025-02-15 afternoon)

### Changes
1. **Pre-warm mic permission on mount** — `getUserMedia` in a `useEffect` on mount, so the permission is cached before the user clicks anything. Eliminates step 1 from `startSession()`.
2. **Removed `getUserMedia` from `startSession()`** — no longer async; goes straight to `new SpeechRecognition()` + `start()`. Function changed from `async` to synchronous.
3. **Sentence timer set in `onstart`** — `sentenceStartTimeRef` is now set when STT is truly ready (not when `startSession` is called). This gives accurate duration that doesn't include prep time.
4. **"準備好了，請開始朗讀！" tutor message** — appears in the chat area when `onstart` fires (first start only, not on reconnects). Clear visual signal for the child to begin reading.

### Motivation
- Session model proved that inter-sentence gap is solved. Only the first-sentence startup remains.
- Pre-warming + removing getUserMedia reduces startup from ~1–2s to ~200–500ms.
- The "ready" message gives the child a clear cue to wait before reading.

### Test Results (log: `02151647.txt`)
- **First sentence fully captured** ✓ — `古時候有一個農夫他每天都去田裡看和苗長高了沒有` (100% match)
- **All 6 sentences captured from beginning** ✓ — no beginning loss on any sentence
- **Student completed the entire story** — 5× Tier 1, 1× Tier 2
- Match rates: 100%, 81.3%, 95.2%, 81.8%, 78.6%, 95.7%
- CPM range: 91–160 (reasonable for child reading aloud)
- Homophone correction working: 和苗→禾苗, 和廟→禾苗, 哭死→枯死
- **Separate issue**: AssessmentReport chart shows Recharts width/height warning (not STT-related)

---

## Summary of Key Findings

### BCP 47 Language Tag
| Tag | Output | Recommendation |
|-----|--------|----------------|
| `zh-TW` | Simplified Chinese (often) | Do NOT use |
| `cmn-Hant-TW` | Traditional Chinese | **Use this** |

### `continuous` Setting
| Setting | Behavior | Problem |
|---------|----------|---------|
| `false` | Stops on any pause | Cuts sentence at comma — **unusable** |
| `true` | Keeps listening | Required for natural reading with pauses |

### Recording Model
| Model | Inter-Sentence Gap | Beginning Loss |
|-------|-------------------|----------------|
| Per-sentence (new instance each time) | ~1–2 seconds | **Yes — critical** |
| Session (abort + restart same instance) | ~milliseconds | No |
| Session (continuous, no restart) | Zero | No |

### Chrome Web Speech API Behaviors
1. **Auto-timeout**: Chrome may fire `onend` after ~60s of silence even with `continuous = true`. Must auto-reconnect.
2. **`no-speech` error**: Fires after ~5s of silence. With `continuous = true`, followed by `onend`. Auto-reconnect handles this.
3. **`aborted` error**: Fires when `abort()` is called programmatically. Expected and harmless.
4. **`recognition.stop()` vs `abort()`**: `stop()` finalizes pending results then fires `onend`. `abort()` discards pending results and fires `onend` immediately.
5. **`onstart` vs actual audio capture**: `onstart` is the reliable signal that STT is ready. Use it to transition from "preparing" to "recording" UI state.

### Startup Optimization
| Technique | Saves | Notes |
|-----------|-------|-------|
| Pre-warm mic permission on mount | ~50–200ms | `getUserMedia` in `useEffect([], [])` |
| Remove `getUserMedia` from `startSession` | ~50–200ms | Let `recognition.start()` handle it; `onerror('not-allowed')` catches denial |
| Set sentence timer in `onstart` | N/A (accuracy) | Duration no longer includes prep time |
| Show "ready" tutor message on `onstart` | N/A (UX) | Clear signal: "準備好了，請開始朗讀！" |

### Design Principles (Learned the Hard Way)
1. **Never stop recognition between sentences.** The startup gap loses speech.
2. **Never use `continuous = false` for reading aloud.** Natural pauses get misinterpreted as end-of-utterance.
3. **Always use `cmn-Hant-TW`** for Traditional Chinese — `zh-TW` is unreliable.
4. **Always auto-reconnect in `onend`** when session should be active. Chrome's API can end unexpectedly.
5. **Accumulate transcript across reconnects** using a ref (`accumulatedTranscriptRef`).
6. **Let the user control submission** — "完成這句" button, not automatic silence detection.
7. **Show a preparing state** (`isPreparing`) until `onstart` confirms STT is truly ready.
8. **Pre-warm mic permission on mount** — eliminates `getUserMedia` delay from first session start.
9. **Set sentence timer in `onstart`, not in `startSession()`** — accurate duration measurement.
10. **Show a "ready" message when STT is truly active** — children need a clear signal before they start reading.
