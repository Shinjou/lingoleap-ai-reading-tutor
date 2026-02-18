# Zhuyinfuhao (注音符號) Conversion Plan

## Overview
Convert Flutter zhuyinfuhao processing code from `learning-to-read-chinese/lib/` to TypeScript
for `ai-reading-tutor` to support zhuyin annotations including polyphonic characters.

## Source Files (Flutter/Dart)
| File | Purpose | Lines |
|------|---------|-------|
| `lib/views/polyphonic_processor.dart` | Core polyphonic processing engine | 822 |
| `lib/constants/bopomos.dart` | Bopomofo constants (tones, initials, finals) | 11 |
| `lib/data/models/bopomo_spelling_model.dart` | BopomoSpelling model class | 36 |
| `assets/data_files/poyin_db.json` | Polyphonic character database | 13,422 |
| `assets/data_files/all.sqlite` | SQLite DB with Words table (tone data) | 3,712 chars |
| `lib/assets/fonts/BpmfIansui-Regular.ttf` | Zhuyin font (6.5 MB) | - |

## Target Files (TypeScript/React)
| # | File | Purpose | Status |
|---|------|---------|--------|
| 1 | `docs/zhuyin-conversion-plan.md` | This planning document | DONE |
| 2 | `public/data/poyin_db.json` | Polyphonic database (copy, 187KB) | DONE |
| 3 | `public/fonts/BpmfIansui-Regular.ttf` | Zhuyin font file (copy, 6.5MB) | DONE |
| 4 | `utils/bopomoConstants.ts` | Bopomofo constants & types | DONE |
| 5 | `utils/toneData.ts` | Character → tone lookup map (3,675 chars from SQLite) | DONE |
| 6 | `utils/polyphonicProcessor.ts` | Core polyphonic processing engine (~400 lines) | DONE |
| 7 | `index.html` | Add @font-face for BpmfIansui | DONE |
| 8 | `components/LiveTutor.tsx` | Add ZhuyinText rendering + toggle | DONE |

## Architecture

### Rendering Pipeline
```
Input Text
  → PolyphonicProcessor.process(text)
    → Per-character: resolve tone sandhi (一, 不) + polyphonic patterns
    → Output: ProcessedChar[] = [{ char, styleSet }]
  → buildZhuyinString(ProcessedChar[])
    → Unicode string with variant selectors (PUA: U+E01E1–U+E01E5)
  → Render with BpmfIansui font
    → Font auto-renders zhuyin above characters
```

### Key Algorithms to Port
1. **Tone sandhi for 一 and 不** (`getNewToneForYiBu`)
   - 一: default 1st tone → 4th before tones 1/2/3, 2nd before tone 4
   - 不: default 4th tone → 2nd before tone 4
   - Special cases: 一個, 一會, 不禁, 不得不, etc.

2. **Polyphonic pattern matching** (`match`)
   - Two-pass: "prefix+*" then "*+suffix"
   - Wildcard patterns from poyin_db.json
   - Special handling: 地 (de5 vs di4), 著 (著作權)

3. **Double character handling** (`specialDoubleCharacters`)
   - 50+ entries: 重重, 行行, 晃晃, etc.
   - Context-aware: 白晃晃 vs 晃晃悠悠

4. **Skip optimization** (`skipPrev`, `skipNext`)
   - Avoids redundant lookups for characters already resolved in context

### Key Differences from Flutter
| Aspect | Flutter | TypeScript |
|--------|---------|------------|
| Tone lookup | SQLite async queries | In-memory Map (sync) |
| Return type | `List<TextSpan>` + unicode string | `ProcessedChar[]` |
| Tuples | `Tuple2/Tuple3` library | TS tuples `[a, b, c]` |
| Font features | `FontFeature.enable('ss01')` | PUA Unicode + font-family |
| Data loading | `rootBundle.loadString()` | `fetch('/data/poyin_db.json')` |
| Rendering | Flutter RichText + TextSpan | React + BpmfIansui font |

## Implementation Steps

### Step 1: Copy assets ✅ DONE
- [x] Copy `poyin_db.json` → `public/data/poyin_db.json`
- [x] Copy `BpmfIansui-Regular.ttf` → `public/fonts/BpmfIansui-Regular.ttf`

### Step 2: Create bopomoConstants.ts ✅ DONE
- [x] Port tones, initials, prenuclear, finals arrays
- [x] Port toneToInt map
- [x] Define BopomoSpelling interface
- [x] Define ProcessedChar interface
- [x] Define PolyphonicEntry and PolyphonicData interfaces

### Step 3: Create toneData.ts ✅ DONE
- [x] Extract 3,675 character→tone pairs from all.sqlite (37 bopomofo symbols filtered out)
- [x] Generate TypeScript const map
- [x] Implement getToneForChar() function

### Step 4: Create polyphonicProcessor.ts ✅ DONE
- [x] Port PolyphonicProcessor class (singleton)
- [x] Port loadPolyphonicData() (fetch JSON)
- [x] Port getNewToneForYiBu() (tone sandhi)
- [x] Port process() main loop
- [x] Port match() pattern matching
- [x] Port helper functions (isPolyphonicChar, matchPattern, isChineseCharacter)
- [x] Port specialDoubleCharacters map (55 entries)
- [x] Port duoCommonPhrases list (11 entries)
- [x] Port phrasesEndsWithDi set (145 entries)
- [x] Port specialYiCases/specialBuCases maps
- [x] Implement buildZhuyinString() utility function

### Step 5: Integrate font ✅ DONE
- [x] Add @font-face in index.html
- [x] Add .zhuyin-text CSS class

### Step 6: Update LiveTutor.tsx ✅ DONE
- [x] Add zhuyinEnabled/zhuyinReady state
- [x] Initialize PolyphonicProcessor on mount (useEffect)
- [x] Memoize processed zhuyin lines (useMemo)
- [x] Replace plain `{line}` with conditional zhuyin rendering
- [x] Adjust line-height dynamically (1.6 → 2.6 when zhuyin enabled)
- [x] Apply .zhuyin-text class for BpmfIansui font
- [x] Add 注音 ON/OFF toggle button in editor tab bar

### Step 7: Testing → IN PROGRESS
- [ ] Verify font loads and renders zhuyin
- [ ] Test 一 tone sandhi (一天, 一定, 統一, 一個)
- [ ] Test 不 tone sandhi (不要, 不對, 不禁, 不得不)
- [ ] Test polyphonic chars (地, 著, 行, 重, etc.)
- [ ] Test double characters (重重, 行行, 好好)
- [ ] Test mixed text (punctuation, numbers, non-Chinese)
- [ ] Test toggle on/off

## Change Log
| Date | Step | Description |
|------|------|-------------|
| 2026-02-16 | 0 | Plan created |
| 2026-02-16 | 1 | Copied poyin_db.json (187KB) and BpmfIansui-Regular.ttf (6.5MB) to public/ |
| 2026-02-16 | 2 | Created utils/bopomoConstants.ts with types and constants |
| 2026-02-16 | 3 | Extracted 3,675 char→tone pairs from SQLite → utils/toneData.ts |
| 2026-02-16 | 4 | Created utils/polyphonicProcessor.ts (~400 lines) — core engine |
| 2026-02-16 | 5 | Added @font-face for BpmfIansui in index.html |
| 2026-02-16 | 6 | Updated LiveTutor.tsx: zhuyin rendering + toggle + line-height |
| 2026-02-16 | 7 | TypeScript compiles clean. Vite build succeeds. Runtime testing pending. |
