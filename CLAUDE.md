# claude.md

# 閱讀理解平台（LingoLeap AI Reading Tutor）
# CLAUDE.md — Claude Code 專案說明書

> 每次開新對話，Claude Code 會自動讀取本文件。
> 請保持這份文件是最新狀態。最後更新：2026-02

---

## 專案簡介

這是一個繁體中文閱讀理解學習平台，目標用戶是台灣三年級至國中生（已進入「read to learn」階段）。
平台扮演「溫暖但堅定」的蘇格拉底式 AI 助教，透過六步驟引導學生完成閱讀學習。

**目前版本：0.2.3**
**GitHub：** https://github.com/Shinjou/lingoleap-ai-reading-tutor

---

## 技術架構

```
frontend/          → React + TypeScript + Vite + Tailwind CSS (PostCSS)
backend/           → Python + FastAPI
database/          → PostgreSQL（主資料）+ Redis（Session/快取）
```

### 前端技術棧
- React 19 + TypeScript
- Vite（建置工具）
- Tailwind CSS v3（PostCSS 安裝，非 CDN）
- Web Speech API（STT 語音辨識，瀏覽器原生）
- SpeechSynthesis API（TTS 文字轉語音，瀏覽器原生）

### 後端技術棧
- Python + FastAPI
- pypinyin（注音/拼音處理）
- jieba（中文斷詞）
- PostgreSQL + SQLAlchemy
- Redis（JWT session 快取）

---

## 目錄結構

```
lingoleap-ai-reading-tutor/
├── CLAUDE.md                  ← 你現在讀的這份文件
├── Makefile                   ← 便利指令（make dev-frontend / dev-backend）
├── README.md
├── docs/
├── log/
│
├── frontend/
│   ├── index.html             ← Vite 入口，無 CDN / importmap
│   ├── package.json           ← 無 @google/genai
│   ├── vite.config.ts         ← 無 GEMINI_API_KEY define
│   ├── tsconfig.json
│   ├── tailwind.config.js     ← Tailwind PostCSS 設定
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx           ← 入口（原 index.tsx）
│       ├── App.tsx
│       ├── types.ts
│       ├── index.css          ← @tailwind base/components/utilities
│       ├── context/
│       │   └── ZhuyinContext.tsx   ← 注音 On/Off 全域狀態
│       ├── components/
│       │   ├── zhuyin/
│       │   │   ├── bopomoConstants.ts
│       │   │   ├── toneData.ts
│       │   │   └── polyphonicProcessor.ts
│       │   ├── stroke-order/
│       │   │   ├── strokeData.ts
│       │   │   ├── strokeRenderer.ts
│       │   │   └── WriteCharacter.tsx
│       │   └── reading-steps/
│       │       ├── LiveTutor.tsx
│       │       └── AssessmentReport.tsx
│       ├── pages/
│       │   ├── student/
│       │   │   └── StoryLibrary.tsx
│       │   └── teacher/        ← 保留，待開發
│       ├── services/
│       │   └── api.ts          ← 後端 API 呼叫層（stubs）
│       └── utils/
│           ├── audio.ts
│           ├── pinyin.ts       ← 同音字修正（前端評分用）
│           └── sc2tc.ts
│   └── public/
│       ├── data/
│       │   ├── poyin_db.json
│       │   └── svg/
│       └── fonts/
│
└── backend/
    ├── requirements.txt
    ├── .env.example
    ├── app/
    │   ├── __init__.py
    │   ├── main.py             ← FastAPI app + CORS
    │   ├── config.py           ← Pydantic Settings (env vars)
    │   ├── database.py         ← SQLAlchemy engine + get_db dependency
    │   ├── routes/
    │   │   ├── stories.py      ← GET /api/stories, GET /api/stories/{id}
    │   │   ├── learning.py     ← POST /api/learning-sessions (stub)
    │   │   └── users.py        ← auth stubs
    │   ├── services/
    │   │   ├── ai_service.py   ← 所有 AI API 呼叫集中在此（stub）
    │   │   ├── stt_service.py  ← 同音字修正 + match rate（Python 版）
    │   │   └── user_service.py ← 老師/學生/班級管理（stub）
    │   └── models/
    │       ├── base.py         ← SQLAlchemy DeclarativeBase
    │       ├── school.py       ← School, Teacher, Class, ClassStudent
    │       ├── student.py      ← Student
    │       ├── text.py         ← Text（課文內容）
    │       └── session.py      ← LearningSession, CharacterError
    └── tests/
        └── test_stt_service.py ← pytest 測試
```

---

## 核心業務規則（必讀）

### 角色與權限
- **老師**：單一帳號 + email 確認。第一位老師註冊時自動建立學校資料。
- **學生**：由老師事先加入班級，才能登入。登入後自動關聯班級。
- **校長權限**：待未來版本規劃，目前不實作。

### STT 同音字修正規則
STT 結果在前端即時修正（零延遲），同時後端 `stt_service.py` 有相同邏輯作為 server-side validation：
1. 先做同音字修正（聲調不同或字不同但音相近，自動改為課文原字）
2. 計算修正後與原文的字符相似度：
   - ≥ 80%：Tier 1，顯示「非常好！」，進入下一段
   - ≥ 60%：Tier 2，給予鼓勵，進入下一段
   - < 60%：Tier 3，請學生再試一次同一段

### AI 呼叫規則（重要）
- **所有 AI API 呼叫只能在 `backend/app/services/ai_service.py` 裡**
- 前端絕對不能直接呼叫 OpenAI 或任何 AI API
- `@google/genai` 已從前端移除（安全修正）
- AI 目前用於：課文理解問答（蘇格拉底式提問）、出場卷出題與批改
- STT/TTS 使用瀏覽器原生 API，不走後端，不算 AI API 呼叫

### 安全規則
- `frontend/vite.config.ts` 不得在 `define` 中暴露任何 API key
- 所有 API key 只存在於後端 `.env`（不 commit）
- 前端環境變數只能用 `VITE_` 前綴，且不包含 secret

### 注音符號規則
- 注音元件已封裝於 `frontend/src/components/zhuyin/`
- 全域狀態控制 On/Off，在 `frontend/src/context/ZhuyinContext.tsx`
- 這個元件已穩定，除非有 bug，否則不要修改內部實作

---

## 六步驟學習流程

學生選課文後，依序進行：

| 步驟 | 名稱 | 主要技術 | 狀態 |
|------|------|----------|------|
| 1 | 簡介 | TTS 朗讀（SpeechSynthesis） | 待開發 |
| 2 | 逐段朗讀 | STT + 同音字修正 + 相似度評分 | Demo 完成 |
| 3 | 課文理解 | AI 蘇格拉底式問答 | 待開發 |
| 4 | 生字練習 | 筆順動畫 + 造句 | 從學國語 port 中 |
| 5 | 全文朗讀 | STT（放寬標準） | 待開發 |
| 6 | 出場卷 | AI 出題 + 批改 | 待開發 |

---

## 已完成功能（勿覆蓋）

- 注音符號 On/Off 切換（`frontend/src/components/zhuyin/`）
- 步驟一：簡介（`Intro.tsx`，TTS 朗讀簡介，作者 + 背景說明）
- 步驟二：逐段朗讀（TTS + STT + 鼓勵回饋機制）
- 步驟四：生字練習（`VocabPractice.tsx`，漏字/錯字偵測 + WriteCharacter 筆順）
- 評估報告（`AssessmentReport.tsx`）
- 中文書寫練習（筆順動畫 + 描紅，`WriteCharacter.tsx`）
- FastAPI 後端骨架（routes/services/models）
- backend stt_service.py（Python 版同音字修正 + 評分）
- pytest 測試套件
- 生字選字邏輯文件（`docs/vocab-selection-logic.md`）

---

## 開發規範

### 寫程式前必做
1. 先讀相關現有檔案，理解現有結構
2. 說明你的設計方案，等確認後再寫
3. 重大修改前確認 git 已 commit

### 命名規範
- 前端元件：PascalCase（`ReadingStep.tsx`）
- 後端函數：snake_case（`compare_stt_result()`）
- API 路由：kebab-case（`/api/learning-sessions`）
- 資料庫欄位：snake_case

### 語言規範
- 前端 UI 文字：繁體中文
- 程式碼註解：中文或英文皆可，保持一致
- API 回傳 JSON：英文 key，中文 value

### 測試規範
- 核心邏輯（STT 比對、相似度計算）必須有 pytest 測試
- 測試檔案放在 `backend/tests/`
- 前端元件用 Vitest

---

## 常見任務的正確做法

### 新增 API endpoint
1. 在 `backend/app/routes/` 建立或修改路由檔案
2. 業務邏輯寫在 `backend/app/services/` 對應的 service
3. 在 `frontend/src/services/api.ts` 新增對應的呼叫函數
4. 不要在 route 檔案裡寫業務邏輯

### 修改 STT 比對邏輯
- 改 `backend/app/services/stt_service.py`（server-side）
- 同步更新 `frontend/src/utils/pinyin.ts`（client-side，低延遲版）
- 必須同步更新 `backend/tests/test_stt_service.py`
- 修改後說明測試結果

### TTS 語音
- 用 Google 台灣 語音

### 新增學習步驟 UI
- 在 `frontend/src/components/reading-steps/` 建立新元件
- 步驟狀態管理放在 `frontend/src/pages/student/`
- 使用 Tailwind 處理 RWD，確認平板（768px）和 PC（1024px+）都正常

### AI Prompt 調整
- Prompt 集中管理在 `backend/app/services/ai_service.py`
- 修改 prompt 前先說明意圖，測試後記錄效果

---

## 資料庫主要資料表

```
schools
  └── teachers (school_id)
        └── classes (teacher_id)
              └── class_students (class_id, student_id)
students
texts (teacher_id, 課文內容、作者生平、著作權確認)
learning_sessions (student_id, text_id, 進行步驟、完成時間)
character_errors (session_id, 錯誤生字記錄)
```

---

## 環境設定

```bash
# 前端
cd frontend && npm install && npm run dev
# 開啟 http://localhost:3000

# 後端
cd backend && pip install -r requirements.txt
cp .env.example .env   # 填入 OPENAI_API_KEY, DATABASE_URL, REDIS_URL
uvicorn app.main:app --reload
# 開啟 http://localhost:8000

# 便利指令（Makefile）
make install         # 安裝前後端依賴
make dev-frontend    # 啟動前端
make dev-backend     # 啟動後端
make test            # 跑後端 pytest
```

---

## 待決定事項（不要自作主張實作）

- 校長特別權限功能
- 學生進展細節的顯示方式
- 課文理解（步驟3）的 AI 問答設計細節
- 出場卷（步驟6）的題型格式

---

## 給 Claude 的提醒

1. 這個平台的用戶是兒童，所有回饋語氣要「溫暖但堅定」
2. STT 不完美是預期行為，修正邏輯要對學生友善，減少挫折感
3. 注音和筆順是技術難點，已有現成實作，優先複用
4. 每次只做一件事，做完測試，再繼續下一件
5. 有疑問先問，不要猜測需求自行實作
6. **前端嚴禁暴露任何 API key**，也不能直接呼叫 AI API
