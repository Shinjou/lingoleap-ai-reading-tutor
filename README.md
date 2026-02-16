## Run Locally

The project uses:
TypeScript -- all source files are .tsx / .ts (React components, utilities, configs)
HTML -- index.html (Vite entry point)
CSS -- via Tailwind CSS utility classes (inline in JSX)
No plain JavaScript files. It's a TypeScript-only codebase built with React 19, Vite, and Recharts.


**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
=======
Can this project run in Chrome, Edge and Safari?

Chrome and Edge: Yes, fully supported. Both are Chromium-based and have robust Web Speech API support, which is the critical dependency for STT.
Safari: Partially — with significant caveats.
The project's main browser-compatibility bottleneck is the Web Speech API (SpeechRecognition). Here's the breakdown:
Feature	Chrome	Edge	Safari (14.1+)
SpeechRecognition	Full	Full	Supported but limited
continuous = true	Works well	Works well	Unreliable — may stop after a few seconds
interimResults	Works well	Works well	May behave differently
cmn-Hant-TW locale	Works	Works	May fall back to generic Chinese
getUserMedia (mic)	Full	Full	Full
React / Vite / Recharts	Full	Full	Full
ResizeObserver	Full	Full	Full
The code already handles the API detection gracefully:
LiveTutor.tsx
Lines 119-120
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const SpeechRecognition =  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
But the session model (which relies on continuous = true and auto-reconnect) is specifically tuned for Chrome's behavior. Safari's SpeechRecognition implementation is known to:
Not honor continuous = true reliably
Require user gesture to restart recognition
Have different timeout behavior
Bottom line: Chrome and Edge will work great. Safari will load the app fine, but the STT reading session is likely to have issues. If Safari support is important, the most robust path would be to add a server-side STT fallback (e.g., Google Cloud Speech-to-Text or Whisper API) for non-Chromium browsers. Would you like me to look into that?