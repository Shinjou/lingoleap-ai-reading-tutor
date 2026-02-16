# AI Reading Tutor — Engineer Onboarding Guide

> Get up to speed with the codebase in one read.

---

## 1. WHAT — What is this project?

AI Reading Tutor is a **browser-based Mandarin Chinese reading tutor** for elementary school students in Taiwan. A child selects a story, reads it aloud sentence by sentence, and gets instant feedback on pronunciation accuracy — all running locally in the browser with zero server round-trips for the core reading loop.

### Key capabilities

| Feature | Description |
|---|---|
| **Speech-to-Text (STT)** | Uses the browser's Web Speech API (`cmn-Hant-TW`) to transcribe the student's voice in real time. |
| **Homophone correction** | STT often returns wrong characters that sound the same (e.g., 和 → 禾). A Levenshtein-based aligner maps STT output back to the target text using a pinyin homophone dictionary. |
| **Zhuyin (注音符號) annotations** | Toggleable bopomofo phonetic annotations above every Chinese character, rendered via the BpmfIansui font and a polyphonic processor ported from a Flutter codebase. |
| **Line-by-line evaluation** | Each sentence is scored by character match rate, classified into tiers, and the student either advances or retries. |
| **Assessment report** | After finishing a story, charts show per-line accuracy and reading speed (CPM). |

### What it is NOT (yet)

- No AI-generated feedback (the `@google/genai` package is installed but reserved for future Socratic instruction).
- No backend — everything runs client-side.
- No user accounts or persistent data.

---

## 2. WHY — Why does it exist and why these design choices?

### Problem

Young readers in Taiwan (grades 1–4) need to practise reading aloud with immediate pronunciation feedback. Traditional classroom settings don't provide one-on-one attention for every student.

### Design decisions

| Decision | Rationale |
|---|---|
| **Client-side STT (Web Speech API)** | Zero latency, zero cost, no API keys needed. Works in Chrome and Edge. |
| **Homophone correction instead of phoneme-level grading** | Web Speech API returns text, not phonemes. Since Mandarin has many homophones, aligning STT text to the target via pinyin equivalence recovers most "false errors." |
| **Local evaluation (no LLM call per sentence)** | A child reads 20+ sentences per session. Round-tripping to an LLM for each would add latency and cost. Character match rate is computed locally in < 1 ms. |
| **BpmfIansui / Iansui font pair** | BpmfIansui embeds bopomofo annotations directly into each glyph (no Ruby markup needed). Iansui is the same typeface without annotations, so toggling zhuyin ON/OFF doesn't change the visual style of the characters. |
| **Polyphonic processor ported from Flutter** | The original Flutter app had battle-tested logic for tone sandhi (一, 不) and polyphonic characters (e.g., 長 can be cháng or zhǎng). Rather than rewrite from scratch, we ported the Dart code to TypeScript. |
| **ESM import maps (no bundled node_modules)** | Dependencies load from `esm.sh` CDN via `<script type="importmap">`. This keeps the repo lightweight and eliminates `npm install` for dependencies at dev time (Vite handles the rest). |

---

## 3. HOW — How the code works

### 3.1 Tech stack

```
React 19          — UI framework
TypeScript 5      — type safety
Vite 6            — dev server & bundler
Tailwind CSS      — utility-first styling (loaded via CDN)
Recharts 3        — charts in the assessment report
Web Speech API    — browser-native speech recognition
BpmfIansui font   — zhuyin glyph rendering
```

### 3.2 Project structure

```
ai-reading-tutor/
│
├── index.html                  # Entry point: font-face, Tailwind CDN, ESM import map
├── index.tsx                   # React mount point
├── App.tsx                     # Top-level router (HOME → LIBRARY → TUTOR → REPORT)
├── types.ts                    # Shared TypeScript interfaces
├── vite.config.ts              # Vite config (port 3000, env vars)
├── tsconfig.json               # TypeScript config
│
├── components/
│   ├── StoryLibrary.tsx        # Story selection grid
│   ├── LiveTutor.tsx           # ★ Core component — reading session UI + STT + evaluation
│   └── AssessmentReport.tsx    # Post-session charts and summary
│
├── utils/
│   ├── pinyin.ts               # Homophone dictionary + Levenshtein correction
│   ├── polyphonicProcessor.ts  # Zhuyin processing: tone sandhi, polyphonic resolution
│   ├── bopomoConstants.ts      # Bopomofo constants (initials, finals, tones, types)
│   ├── toneData.ts             # Character → default tone map (3,675 entries)
│   ├── sc2tc.ts                # Simplified → Traditional Chinese converter
│   └── audio.ts                # Audio encoding helpers (reserved for future use)
│
├── public/
│   ├── data/poyin_db.json      # Polyphonic character pattern database (13K+ lines)
│   └── fonts/
│       ├── BpmfIansui-Regular.ttf   # Zhuyin-annotated font (Git LFS)
│       └── Iansui-Regular.ttf       # Base font, same style without zhuyin (Git LFS)
│
└── docs/                       # Design documents and plans
```

### 3.3 The file you should read first

**`components/LiveTutor.tsx`** — This is the heart of the app (~840 lines). It contains:

1. **Speech recognition lifecycle** — start/stop/reconnect logic for `webkitSpeechRecognition`
2. **Evaluation pipeline** — the `evaluateAndRespond` callback that scores each sentence
3. **Zhuyin rendering** — the `processZhuyin` helper and `zhuyinLines` memo
4. **UI layout** — three-panel VS Code-inspired design (sidebar, editor, chat)

### 3.4 Data flow: what happens when a student reads a sentence

```
┌─────────────────────────────────────────────────────┐
│  Student speaks into microphone                      │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  Web Speech API (cmn-Hant-TW, continuous mode)       │
│  → streams interim results to the chat panel         │
└──────────────┬──────────────────────────────────────┘
               ▼  (user clicks "完成這句" to submit)
┌─────────────────────────────────────────────────────┐
│  cleanChineseText()                                  │
│  → strip spaces, keep only CJK + punctuation         │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  normalizeForComparison(targetText)                  │
│  → strip punctuation from target (STT never          │
│    produces 「」！ etc., so they'd cause misalignment)│
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  correctHomophones(cleaned, normalizedTarget)        │
│  → Levenshtein DP alignment                          │
│  → if cost(substitute) == 0 and isHomophone(a, b),   │
│    replace STT char with target char                 │
│  → e.g., 和 → 禾 (both "hé"), 文明 → 聞名 (wén/míng)│
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  computeMatchRate(corrected, targetText)             │
│  → character frequency overlap, returns 0.0 – 1.0   │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  Tier classification                                 │
│  ≥ 80% → Tier 1 (great, advance)                    │
│  60–79% → Tier 2 (okay, advance)                    │
│  < 60% → Tier 3 (retry same line)                   │
└──────────────┬──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  Random feedback message from tier pool              │
│  + CPM calculation (characters / seconds × 60)       │
│  + Store ReadingAttempt for assessment report         │
└─────────────────────────────────────────────────────┘
```

### 3.5 How zhuyin (注音) rendering works

The zhuyin system has two layers:

**Layer 1: Font rendering**
- The **BpmfIansui** font contains glyphs where each Chinese character has bopomofo printed above it.
- Unicode Private Use Area (PUA) variant selectors (`U+E01E1`–`U+E01E5`) tell the font which tone variant to display (tone 1–5).
- When zhuyin is OFF, the app uses **Iansui** — the same typeface without the bopomofo annotations.

**Layer 2: Polyphonic processing** (`polyphonicProcessor.ts`)
- Many characters have multiple pronunciations (e.g., 長 = cháng "long" or zhǎng "grow").
- The `PolyphonicProcessor` reads `poyin_db.json` (pattern database) and determines the correct pronunciation based on surrounding context.
- It also applies **tone sandhi** rules:
  - 一 (yī) changes tone before certain characters (e.g., 一個 → yí gè)
  - 不 (bù) changes to bú before 4th-tone characters (e.g., 不是 → búshì)
- Output: for each character, a Unicode variant selector is appended → the font renders the correct zhuyin.

**Toggle behaviour:**
```
zhuyinEnabled = true
  → root container gets inline style: fontFamily = 'BpmfIansui', ...
  → text runs through PolyphonicProcessor (adds variant selectors)
  → font renders characters + zhuyin annotations

zhuyinEnabled = false
  → root container gets inline style: fontFamily = 'Iansui', ...
  → text displayed as-is (no variant selectors)
  → font renders characters only (same visual style, no annotations)
```

### 3.6 How homophone correction works (`utils/pinyin.ts`)

```
1. Build a Levenshtein DP matrix between STT output and target text
   - Substitution cost = 0 if characters are homophones (same toneless pinyin)
   - Substitution cost = 1 otherwise
   - Insert/delete cost = 1

2. Backtrace the optimal alignment path

3. For each aligned pair where STT char ≠ target char but they ARE homophones:
   → replace STT char with target char

Example:
  Target: 禾 苗 都 長 高 了 一 大 截
  STT:    和 苗 都 長 高 的 一 大 節
  After:  禾 苗 都 長 高 的 一 大 截
          ↑ hé=hé (fixed)              ↑ jié=jié (fixed)
                           ↑ de≠le (not homophones, kept as-is)
```

The pinyin dictionary covers ~2,500 common characters. Each character maps to one or more toneless pinyin readings. Two characters are homophones if they share at least one pinyin reading.

### 3.7 App navigation flow

```
App.tsx manages four views:

  HOME ──→ LIBRARY ──→ TUTOR ──→ REPORT
   │         │           │         │
   │  "進入   │  click    │  finish │  "回圖書館"
   │  圖書館" │  story    │  story  │
   ▼         ▼           ▼         ▼
  Welcome   Story grid   Reading   Charts +
  screen    (3 stories)  session   summary
```

---

## 4. Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Chrome or Edge** (Web Speech API is not supported in Firefox/Safari)
- **Microphone** access

### Run locally

```bash
cd ai-reading-tutor
npm install
npm run dev
# → opens at http://localhost:3000
```

### Environment variables

Create `.env.local` (already exists in repo):

```
GEMINI_API_KEY=your_key_here    # Not used in reading loop yet; reserved for future AI features
```

No API keys are needed for the core reading + zhuyin features.

### Build for production

```bash
npm run build        # output in dist/
npm run preview      # preview the production build
```

### Git LFS

Font files (`.ttf`) are tracked by Git LFS. After cloning:

```bash
git lfs install
git lfs pull
```

---

## 5. Key Concepts Glossary

| Term | Meaning |
|---|---|
| **Zhuyin / 注音符號 / Bopomofo** | The phonetic system used in Taiwan to annotate Chinese character pronunciation (ㄅㄆㄇㄈ). Equivalent to pinyin in mainland China. |
| **Polyphonic character (多音字)** | A character with multiple pronunciations depending on context. E.g., 長 = cháng (long) or zhǎng (grow). |
| **Tone sandhi (變調)** | Rules where a character's tone changes based on what follows it. The two main rules are for 一 and 不. |
| **Homophone (同音字)** | Characters that sound the same but have different meanings. E.g., 和 and 禾 are both "hé." |
| **CPM** | Characters Per Minute — reading speed metric. |
| **STT** | Speech-to-Text — converting spoken audio to written text. |
| **PUA (Private Use Area)** | Unicode range (`U+E000`–`U+F8FF`) used for custom characters. BpmfIansui uses `U+E01E1`–`U+E01E5` as variant selectors for tone 1–5. |
| **BpmfIansui** | A custom font based on Iansui (芫荽) that renders bopomofo annotations above each Chinese character glyph. |
| **Iansui (芫荽)** | The base Chinese font. Same character style as BpmfIansui but without bopomofo annotations. |
| **Levenshtein distance** | An algorithm that finds the minimum number of edits (insert, delete, substitute) to transform one string into another. Used here for STT-to-target alignment. |

---

## 6. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Chrome/Edge)                  │
│                                                               │
│  ┌─────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │  Story   │──▶│  LiveTutor   │──▶│  Assessment        │    │
│  │  Library │   │              │   │  Report             │    │
│  └─────────┘   │  ┌────────┐  │   │  (Recharts)         │    │
│                │  │ Web     │  │   └────────────────────┘    │
│                │  │ Speech  │  │                              │
│                │  │ API     │  │                              │
│                │  └───┬────┘  │                              │
│                │      ▼       │                              │
│                │  ┌────────┐  │   ┌────────────────────┐    │
│                │  │ Pinyin │  │   │  Polyphonic         │    │
│                │  │ Homo-  │  │   │  Processor          │    │
│                │  │ phone  │  │   │  + poyin_db.json    │    │
│                │  │ Correct│  │   │  + toneData.ts      │    │
│                │  └────────┘  │   └────────────────────┘    │
│                │              │              │                │
│                │  ┌────────┐  │   ┌──────────▼─────────┐    │
│                │  │ Match  │  │   │  BpmfIansui Font    │    │
│                │  │ Rate + │  │   │  (zhuyin rendering) │    │
│                │  │ Tier   │  │   └────────────────────┘    │
│                │  └────────┘  │                              │
│                └──────────────┘                              │
│                                                               │
│  No backend. No API calls in the reading loop.                │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Common Tasks

### Add a new story

Stories are currently defined as mock data in `components/StoryLibrary.tsx`. Each story is a `Story` object:

```typescript
{
  id: 'unique-id',
  title: '故事標題',
  filename: '故事名稱.txt',
  content: [
    '第一句。',
    '第二句。',
    '第三句。',
  ],
  grade: 3,
  totalLines: 3,
}
```

### Add a character to the homophone dictionary

Edit `utils/pinyin.ts` → the `PINYIN_MAP` object. Add the character and its toneless pinyin reading(s):

```typescript
'新字': ['pinyin1', 'pinyin2'],
```

### Add a character's default tone

Edit `utils/toneData.ts` → the `CHAR_TONE_MAP` object:

```typescript
'字': 4,  // 4th tone
```

### Modify evaluation thresholds

In `components/LiveTutor.tsx`, search for `evaluateAndRespond`. The tier thresholds are:

```typescript
if (matchRate >= 0.8)      // Tier 1 — advance
else if (matchRate >= 0.6) // Tier 2 — advance
else                       // Tier 3 — retry
```

### Debug STT output

All evaluation results are logged to the browser console:

```
[Evaluation]
Line: 0 / 5
Target: 古時候有一個農夫...
STT: 古時候有一個農夫...
After homophone: 古時候有一個農夫...
Match rate: 100.0% → Tier 1
```

Open Chrome DevTools → Console to see these in real time.

---

## 8. Known Limitations

1. **Web Speech API is Chrome/Edge only** — Firefox and Safari do not support `webkitSpeechRecognition`.
2. **STT quality varies** — Background noise, accents, and fast speech degrade accuracy. The homophone correction helps but cannot fix phonetically different misrecognitions.
3. **No persistent storage** — Session results are lost on page refresh.
4. **Tailwind via CDN** — Not suitable for production. Should be installed as a PostCSS plugin for production builds.
5. **Large font files** — BpmfIansui (6.3 MB) and Iansui (8.2 MB) are loaded upfront. Consider subsetting for production.
6. **Mock story data** — Stories are hardcoded. A future version should load them from a database or CMS.
