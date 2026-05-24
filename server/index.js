const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateJavaScriptTests } = require('./generators/javascript');
const { generateTypeScriptTests } = require('./generators/typescript');
const { generatePythonTests } = require('./generators/python');
const { generateJavaTests } = require('./generators/java');
const { generateGoTests } = require('./generators/go');
const { checkOllama, generateWithAI: generateWithOllama } = require('./ai/ollama');
const { checkOpenAI, generateWithAI: generateWithOpenAI } = require('./ai/openai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

const generators = {
  javascript: { fn: generateJavaScriptTests, frameworks: ['Jest'] },
  typescript: { fn: generateTypeScriptTests, frameworks: ['Jest'] },
  python: { fn: generatePythonTests, frameworks: ['pytest'] },
  java: { fn: generateJavaTests, frameworks: ['JUnit 5'] },
  go: { fn: generateGoTests, frameworks: ['testing'] },
};

const validLanguages = Object.keys(generators);

function validateInput(code, language) {
  if (!code || typeof code !== 'string') return 'Code is required';
  if (code.length > 50000) return 'Code exceeds 50000 character limit';
  if (!language || typeof language !== 'string') return 'Language is required';
  if (!validLanguages.includes(language)) return `Unsupported language: ${language}`;
  return null;
}

app.get('/api/languages', (req, res) => {
  res.json({
    languages: Object.entries(generators).map(([id, config]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      frameworks: config.frameworks,
    })),
  });
});

app.get('/api/ai/status', async (req, res) => {
  try {
    const [ollama, openai] = await Promise.allSettled([checkOllama(), checkOpenAI()]);
    const providers = [];
    if (ollama.value?.available) providers.push({ id: 'ollama', name: 'Ollama', models: ollama.value.models });
    if (openai.value?.available) providers.push({ id: 'openai', name: 'OpenAI', models: openai.value.models });
    res.json({ available: providers.length > 0, providers });
  } catch {
    res.json({ available: false, providers: [] });
  }
});

app.post('/api/generate', async (req, res) => {
  const { code, language, framework, useAI, aiProvider } = req.body;

  const validationError = validateInput(code, language);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const generator = generators[language];

  if (useAI) {
    const providers = [];
    if (!aiProvider || aiProvider === 'ollama') providers.push(generateWithOllama);
    if (!aiProvider || aiProvider === 'openai') providers.push(generateWithOpenAI);
    if (aiProvider && aiProvider !== 'ollama' && aiProvider !== 'openai') providers.push(generateWithOllama, generateWithOpenAI);

    for (const aiFn of providers) {
      try {
        const result = await aiFn(code, language, framework || generator.frameworks[0]);
        if (result.success) {
          return res.json({ testCode: result.testCode, mode: 'ai' });
        }
      } catch {
        // try next provider
      }
    }
  }

  try {
    const testCode = generator.fn(code);
    res.json({ testCode, mode: useAI ? 'fallback' : 'engine' });
  } catch (err) {
    res.status(500).json({ error: 'Test generation failed', detail: err.message });
  }
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n  Test Case Generator running at http://localhost:${PORT}\n`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
