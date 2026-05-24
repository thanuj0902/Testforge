const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'codellama';

async function checkOllama() {
  try {
    const res = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 3000 });
    return { available: true, models: res.data.models || [] };
  } catch {
    return { available: false, models: [] };
  }
}

async function generateWithAI(code, language, framework) {
  const systemPrompt = `You are an expert software engineer. Generate comprehensive test cases for the given ${language} code using ${framework} testing framework. Include:
- Unit tests for all functions/methods
- Edge cases (null, empty, invalid inputs)
- Error handling tests
- Boundary conditions

Return ONLY the test code, no explanations.`;

  const userPrompt = `Generate ${framework} tests for this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

  try {
    const res = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: DEFAULT_MODEL,
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: { temperature: 0.3, max_tokens: 4096 }
    }, { timeout: 120000 });

    if (res.data && res.data.response) {
      return { success: true, testCode: res.data.response.trim() };
    }
    return { success: false, error: 'Empty response from AI' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { checkOllama, generateWithAI };
