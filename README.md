# TestForge — AI-Powered Test Case Generator

![Version](https://img.shields.io/badge/version-1.0.0-8B5CF6?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-10B981?style=flat-square)

**Paste source code → Get production-ready unit tests instantly.**

TestForge is an intelligent test case generator that supports **5 languages** with both a rule-based engine and optional **AI enhancement** (Ollama or OpenAI). Built for the hackathon — a functional MVP with real-world utility.

---

## ✨ Features

- **5 Languages** — JavaScript, TypeScript, Python, Java, Go
- **Dual Engine** — Rule-based generator (always available) + AI enhancement via Ollama or OpenAI
- **Smart Type Guessing** — Infers parameter types from names, generates meaningful test values
- **Edge Case Coverage** — Null/empty/invalid input tests, error handling, boundary conditions
- **Syntax Highlighting** — Beautiful code display powered by highlight.js
- **File Upload** — Drag & drop or browse to import source files
- **Test Statistics** — See test suite count, test case count, and lines at a glance
- **One-click Export** — Download test files or copy to clipboard
- **Dark Theme** — Easy on the eyes, modern UI
- **AI Fallback** — If one AI provider fails, falls back to engine or tries another provider

---

## 🚀 Quick Start

```bash
npm run install:all
npm run build:client
npm start
```

Open **http://localhost:3001**.

### With AI Enhancement

**Ollama (local):**
```bash
# Start Ollama with Codellama
ollama pull codellama
ollama serve
# Restart server — it auto-detects Ollama
```

**OpenAI (cloud):**
```bash
set OPENAI_API_KEY=sk-...   # Windows
npm start
```

---

## 🏗️ Architecture

```
├── client/                  # React + Vite frontend
│   └── src/
│       └── App.jsx          # Main UI with syntax highlighting, file upload, stats
├── server/                  # Express API
│   ├── generators/          # Rule-based test generators
│   │   ├── javascript.js    # Jest
│   │   ├── typescript.js    # Jest (type-aware)
│   │   ├── python.js        # pytest
│   │   ├── java.js          # JUnit 5
│   │   └── go.js            # testing
│   ├── ai/
│   │   ├── ollama.js        # Ollama integration (local LLM)
│   │   └── openai.js        # OpenAI integration (cloud)
│   └── index.js             # Server entry point
├── render.yaml              # Render deploy config
└── package.json             # Root scripts
```

### How It Works

```
User pastes code
       ↓
Select language + AI toggle
       ↓
POST /api/generate
       ↓
┌─────────────────┐
│  AI enabled?     │
│  ├─ Ollama       │
│  ├─ OpenAI       │
│  └─ Auto (try    │
│      both)       │
└────────┬────────┘
         ↓ (if AI fails or disabled)
┌─────────────────┐
│  Rule-based     │
│  engine         │
│  (always works) │
└────────┬────────┘
         ↓
  Syntax-highlighted tests
  with stats + export options
```

---

## 🧪 Supported Languages & Frameworks

| Language   | Framework | Engine | AI         |
|-----------|-----------|--------|------------|
| JavaScript | Jest      | ✅     | ✅         |
| TypeScript | Jest      | ✅     | ✅         |
| Python    | pytest    | ✅     | ✅         |
| Java      | JUnit 5   | ✅     | ✅         |
| Go        | testing   | ✅     | ✅         |

---

## 🧰 Tech Stack

| Layer    | Technology                        |
|---------|-----------------------------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, highlight.js |
| Backend  | Express 5, Node.js 20            |
| AI       | Ollama (local) + OpenAI API      |
| Deploy   | Render (PaaS)                     |

---

## 📦 Deployment

Deploy on **Render** in 3 clicks:

1. Push this repo to GitHub
2. On Render → **New Web Service** → connect repo
3. Set:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `NODE_VERSION = 20`

Or set `OPENAI_API_KEY` in Render's environment variables for AI features without Ollama.

---

## 🏆 Hackathon Submission

This project was built for a **2-day hackathon (May 23-24, 2026)**.

### Key differentiators:
- **Real-world usability** — solves an actual developer pain point
- **Good UI/UX** — Dark theme, syntax highlighting, drag & drop, responsive layout
- **AI integration** — Dual AI providers (Ollama + OpenAI) with automatic failover
- **Technical depth** — 5 language-specific generators with type inference, edge cases
- **Production ready** — Deployed on Render, SPA routing, error handling

**Live demo:** [https://testforge-89jp.onrender.com](https://testforge-89jp.onrender.com)
