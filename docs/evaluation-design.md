# Read-Aloud Evaluation Design

## Context

AI Reading Tutor is a reading tutor for low-confidence elementary students learning
to read Chinese aloud. The primary goal is to build reading fluency and grit,
not to test pronunciation accuracy.

---

## Key Decisions

### Decision 1: Local evaluator only — no AI in the reading loop

**Options considered:**

| Option | Description |
|--------|-------------|
| A. AI-primary | Gemini Live API hears audio, decides advance/retry, speaks feedback |
| B. Hybrid | Local evaluator decides, AI generates varied feedback text |
| C. Local-only | Local evaluator decides, canned response pools provide feedback |

**Pros and cons:**

| | Pros | Cons |
|---|---|---|
| **A. AI-primary** | Hears actual audio (prosody, fluency); natural varied feedback | Encouragement bias (praises random speech); non-deterministic; hard to debug; high latency; API cost; contradicts local evaluator causing confusion |
| **B. Hybrid** | Deterministic decisions; natural feedback | Still has API latency and cost; AI may generate feedback that contradicts the decision; adds complexity for marginal benefit |
| **C. Local-only** | Deterministic; instant feedback; zero API cost; fully debuggable; no contradictions between judge and feedback | Canned responses lack variety (mitigated by large response pools); cannot detect pronunciation quality beyond text matching |

**Choice: C (Local-only)**

Why: After extensive testing, the AI-in-the-loop architecture produced
persistent contradictions — the AI tutor would say "進行下一句" while the
local evaluator blocked advancement, or vice versa. Every attempt to reconcile
these two judges added complexity and new edge cases. The AI's encouragement
bias caused it to praise random speech, while its generative unpredictability
made it impossible to guarantee consistent student experience.

For a low-confidence student, **consistency is more important than variety**.
A child who reads correctly and reliably hears encouragement builds trust in
the system. A child who reads correctly but sometimes hears "try again"
(because two judges disagreed) loses trust and motivation.

AI will be used later for **Socratic instruction** — explaining story content,
discussing vocabulary, and answering student questions. That is where AI adds
genuine value that local logic cannot replicate.

---

### Decision 2: Three-tier evaluation with generous thresholds

After homophone correction and text normalization, compute the character match
rate between spoken text and target text.

| Tier | Match rate | Action | Feedback tone |
|------|-----------|--------|---------------|
| 1 (Great) | ≥ 80% | Advance | "唸得很棒！" |
| 2 (Good) | 60% – 79% | Advance | "唸得不錯！" |
| 3 (Retry) | < 60% | Stay | "再試一次！" |

**Why both Tier 1 and Tier 2 advance:**

For a low-confidence student, the cost of a false "try again" far exceeds
the cost of a false "advance":

- **False rejection** → student reads correctly, system says try again →
  student loses trust, feels frustrated, may give up
- **False advancement** → student reads imperfectly, system advances →
  student maintains momentum, misses one correction opportunity

STT for Chinese is inherently noisy. Homophones, dropped characters, and
format mismatches (e.g. "4000" vs "四千") systematically reduce match rates.
A 60% threshold accommodates this noise while still catching genuinely wrong
readings.

**Why 60% for the retry boundary (not 50% or 70%):**

- At 50%, even a student reading a completely different sentence could
  occasionally pass by coincidence if the sentences share common characters.
- At 70%, correct readings are blocked too often due to STT noise. Logs
  showed students reading target sentences correctly yet scoring 65-75%
  because STT dropped or substituted characters.
- 60% is the practical sweet spot validated against real session logs.

---

### Decision 3: Measure characters-per-minute silently

Reading fluency research in Chinese education uses characters-per-minute (CPM)
as a key progress indicator. We track this metric for every sentence:

```
CPM = (target sentence character count) / (recording duration in seconds) × 60
```

**Important design choices:**

- **Silent measurement**: CPM is tracked in the background and shown only in
  the session summary report. It is never displayed to the student during
  reading. Speed pressure is counterproductive for low-confidence readers.
- **Per-sentence and aggregate**: Each sentence gets its own CPM. The session
  report shows the overall average.
- **Uses target character count**, not spoken character count. This measures
  how fast the student reads the intended text, regardless of STT output
  length.
- **Recording duration** = time between pressing "開始錄音" and "結束錄音".
  This is a rough proxy for speaking time. A future enhancement could use
  voice activity detection (VAD) for more accurate measurement.

---

### Decision 4: Web Speech API replaces Gemini for STT

The Gemini Live API provided both STT (via `inputTranscription`) and AI
evaluation in one connection. Since we no longer need AI evaluation in the
reading loop, we switch to the browser's built-in Web Speech API:

| | Gemini Live API | Web Speech API |
|---|---|---|
| Cost | Per-token billing | Free |
| Latency | Network round-trip | Local (on-device in Chrome) |
| Chinese support | Good | Good (`zh-TW` locale) |
| Streaming results | Yes (`inputTranscription`) | Yes (`interimResults`) |
| Dependency | `@google/genai` package + API key | Built into Chrome |
| Availability | Requires API key and internet | Chrome/Edge only, localhost or HTTPS |

**Trade-off**: Web Speech API only works in Chromium browsers. This is
acceptable for an MVP. The `@google/genai` package remains in the project
for future Socratic instruction features.

---

### Decision 5: Canned response pools for warmth

To avoid the "vending machine" feeling of repeating the same three phrases,
each tier has a pool of 8-10 varied responses. A random response is selected
each time, with streak-aware variants (e.g., "連續三句都讀對了！") to
provide a sense of progression.

---

## Architecture

```
Student clicks "開始錄音"
    ↓
Web Speech API starts (zh-TW, continuous, interimResults)
    ↓
Interim transcripts → shown live in chat bubble
    ↓
Student clicks "結束錄音"
    ↓
Final transcript captured
    ↓
┌──────────────────────────────────────────────┐
│ LOCAL EVALUATION PIPELINE                    │
│                                              │
│ 1. Homophone correction (pinyin alignment)   │
│ 2. Text normalization (strip punctuation)    │
│ 3. Character match rate computation          │
│ 4. Tier classification (≥80 / 60-79 / <60)  │
│ 5. Display text: advance → target text       │
│                   retry  → corrected text     │
│ 6. Random feedback from tier pool            │
│ 7. CPM calculation (silent)                  │
└──────────────────────────────────────────────┘
    ↓
Show user message → show feedback → advance or stay
```

---

## Future: AI for Socratic Instruction

After the student completes a reading session, or at any time they choose,
they can enter a **discussion mode** where the AI explains the story content:

- "這個故事在說什麼？"
- "農夫為什麼那麼笨？"
- "揠苗助長是什麼意思？"

This is where the Gemini API adds genuine, irreplaceable value — not in
judging pronunciation, but in teaching comprehension.
