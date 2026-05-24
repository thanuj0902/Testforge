# TestForge — AI-Powered Test Case Generator

Paste source code, get unit tests. Supports JavaScript (Jest), Python (pytest), Java (JUnit 5), and Go (testing). Optional AI enhancement via Ollama.

## Quick Start

```bash
npm run install:all
npm run build:client
npm start
```

Open `http://localhost:3001`.

## Deploy on Render

1. Push this repo to GitHub
2. On Render → **New Web Service** → connect repo
3. Set:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Env:** `NODE_VERSION = 20`
4. Deploy

## Project Structure

```
├── client/          # React + Vite frontend
│   └── src/
│       └── App.jsx  # Main UI component
├── server/          # Express API
│   ├── generators/  # Test generation per language
│   ├── ai/          # Ollama integration
│   └── index.js     # Server entry point
├── render.yaml      # Render deployment config
└── package.json     # Root scripts
```
