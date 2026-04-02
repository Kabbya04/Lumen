# Lumen

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq-LLM-FF6B35?style=flat-square)](https://groq.com/)

A web-based study platform that uses an LLM to summarize documents, extract key points, generate questions with answers, and provide an AI study assistant, daily quiz, Focus timer, note-taking whiteboard, and optional text-to-speech for accessibility.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Supported Formats](#supported-formats)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [License](#license)

---

## Overview

**Lumen** lets you upload documents and get AI-powered study aids in seconds. The app uses the [Groq](https://groq.com/) API (LLaMA 3.3 70B) to produce summaries, key point definitions, and Q&A from your content. You can chat with a document-aware assistant, use optional text-to-speech (ElevenLabs) for summaries and key points, and reinforce learning with a daily quiz and self-assessment tools.

---

## Features

| Feature | Description |
|--------|-------------|
| **Study** | Upload a document; get a summary, key points, and generated questions. Chat with the doc, use “Explain to a 10-year-old,” rate your recall, and save a one-line takeaway. Analysis is generated once per document/session and reused when navigating between sections. |
| **Library** | Self-assessment center: rate key points, practice “teach me back,” and see a confidence heatmap. Enter Focus mode from here. |
| **Focus** | Distraction-free view of summary and key points. |
| **Note Taker** | Full-width infinite whiteboard for freeform note-taking and diagrams. Board content is saved locally and restored when you return. |
| **Focus Timer** | Focus / short break / long break timer (every fourth focus → long break). State is stored in `localStorage` and stays in sync across sections; the header shows a compact timer with quick play/pause. |
| **Daily quiz** | Dedicated Quiz page with multiple questions from docs you studied yesterday (or last doc as fallback). A dot on the nav indicates a pending quiz; once started, leaving the page shows a confirmation (quiz terminates and must be restarted). |
| **Document summarization** | Concise, coherent summaries that capture main sections and key details. |
| **Key point extraction** | Headlines and definitions for important concepts, with document-specific context. |
| **Question generation** | Short and broad questions with answers derived from the document. |
| **Document-aware chat** | Ask questions about your document; answers are grounded in the uploaded content. |
| **Text-to-speech (TTS)** | Optional [ElevenLabs](https://elevenlabs.io/) TTS for summaries and key points (configurable voice). |
| **Document preview** | View PDFs and rendered content in a modal. |
| **Doc mastery & streak** | Mark a doc as mastered and track a daily streak (stored locally). |
| **Dark / light theme** | Theme toggle with persistent preference. |

---

## Supported Formats

- **PDF** — Text extraction via `pdfjs-dist`
- **DOCX** — Text extraction via Mammoth
- **TXT** — Plain text
- **Markdown** — Rendered in preview and used as-is for analysis

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Groq](https://console.groq.com/) API key

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/lumen.git
cd lumen
```

### 2. Install dependencies

From the repository root:

```bash
cd lumen
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` in the `lumen` directory and set at least the Groq key:

```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Get an API key from the [Groq Console](https://console.groq.com/). For optional text-to-speech, add `VITE_ELEVENLABS_API_KEY` (and optionally `VITE_ELEVENLABS_VOICE_ID`); see [Environment Variables](#environment-variables).

### 4. Run the development server

```bash
npm run dev
```

Open the URL shown in the terminal (e.g. `http://localhost:5173`) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GROQ_API_KEY` | Yes | Groq API key for LLM summarization, key points, questions, and chat. |
| `VITE_ELEVENLABS_API_KEY` | No | ElevenLabs API key for text-to-speech. If omitted, TTS is disabled. |
| `VITE_ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID (default: Rachel). See [voice library](https://elevenlabs.io/voice-library). |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check and build for production. |
| `npm run preview` | Serve the production build locally. |
| `npm run lint` | Run ESLint on `.ts` and `.tsx` files. |

---

## Project Structure

```
Lumen/
├── lumen/                  # Frontend application
│   ├── public/             # Static assets (e.g. PDF worker)
│   ├── src/
│   │   ├── components/     # UI components (upload, chat, analysis, TTS, quiz, etc.)
│   │   ├── contexts/       # Theme, Session, Focus timer
│   │   ├── lib/            # Groq client, ElevenLabs TTS, local storage helpers
│   │   ├── pages/          # Home (Study), Library, Focus, NoteTaker, Focus Timer, QuizPage
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---