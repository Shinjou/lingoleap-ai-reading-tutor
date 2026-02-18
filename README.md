# AI Reading Tutor — Taiwan Edition

A browser-based Mandarin Chinese reading tutor for elementary school students in Taiwan.
Students read stories aloud, receive instant pronunciation feedback via Speech-to-Text,
and can toggle Zhuyin (注音符號) annotations for phonetic support.

## New here? Start with the onboarding guide

**[docs/onboarding.md](docs/onboarding.md)** — A comprehensive guide covering:
- **What** the project does and its key capabilities
- **Why** each design decision was made
- **How** the code works (data flow, architecture, zhuyin rendering, homophone correction)
- Getting started, project structure, glossary, and common tasks

## Quick Start

**Prerequisites:** Node.js (v18+), Chrome or Edge (Web Speech API required)

```bash
npm install
npm run dev
# → opens at http://localhost:3000
```

## Browser Support

| Feature | Chrome | Edge | Safari |
|---|---|---|---|
| SpeechRecognition | Full | Full | Limited — `continuous` mode unreliable |
| `cmn-Hant-TW` locale | Works | Works | May fall back to generic Chinese |
| Microphone access | Full | Full | Full |
| React / Vite / Recharts | Full | Full | Full |

The core STT reading session is tuned for Chrome/Edge. Safari will load the app but the
speech recognition session may have issues with `continuous = true` and auto-reconnect.

## Tech Stack

- **React 19** + **TypeScript 5** + **Vite 6**
- **Web Speech API** — browser-native STT, no API keys needed
- **Recharts** — assessment report charts
- **Tailwind CSS** — utility-first styling (CDN)
- **BpmfIansui / Iansui fonts** — zhuyin annotation rendering

## Version History

| Version | Date | Highlights |
|---|---|---|
| **0.1.0** | 2026-02-16 | STT evaluation with homophone correction; Zhuyin (注音) support with polyphonic processing; BpmfIansui/Iansui font pair; three-panel VS Code-style UI |

## License

Private — not open source.
