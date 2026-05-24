const OpenAI = require('openai');

const API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const client = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null;

async function checkOpenAI() {
  if (!client) return { available: false, models: [] };
  try {
    const models = await client.models.list();
    return { available: true, models: models.data.map(m => m.id) };
  } catch {
    return { available: false, models: [] };
  }
}

async function generateWithAI(code, language, framework) {
  if (!client) return { success: false, error: 'OpenAI API key not configured' };

  try {
    const res = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: `You are an expert software engineer. Generate comprehensive test cases for the given ${language} code using ${framework} testing framework. Include:
- Unit tests for all functions/methods
- Edge cases (null, empty, invalid inputs)
- Error handling tests
- Boundary conditions

Return ONLY the test code, no explanations. No markdown code fences.`,
        },
        {
          role: 'user',
          content: `Generate ${framework} tests for this ${language} code:\n\n${code}`,
        },
      ],
    });

    const testCode = res.choices?.[0]?.message?.content?.trim();
    if (testCode) {
      return { success: true, testCode };
    }
    return { success: false, error: 'Empty response from AI' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { checkOpenAI, generateWithAI };
