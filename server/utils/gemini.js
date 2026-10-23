const { GoogleGenerativeAI } = require('@google/generative-ai');

function getApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function isGeminiConfigured() {
  const key = getApiKey();
  return Boolean(key && key !== 'dummy-key-for-development' && key.length > 20);
}

function candidateModels() {
  return [...new Set([
    process.env.GEMINI_MODEL || 'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash'
  ].filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJson(text) {
  if (!text) throw new Error('Empty AI response');
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const starts = [firstBrace, firstBracket].filter((i) => i >= 0);
    if (starts.length === 0) throw new Error('AI response did not contain JSON');
    const start = Math.min(...starts);
    const endChar = cleaned[start] === '{' ? '}' : ']';
    const end = cleaned.lastIndexOf(endChar);
    if (end <= start) throw new Error('AI response contained malformed JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

async function generateText({ system, prompt, history = [], json = false, maxOutputTokens = 1200, temperature = 0.6 }) {
  if (!isGeminiConfigured()) {
    const error = new Error('Gemini is not configured on the server');
    error.code = 'GEMINI_NOT_CONFIGURED';
    throw error;
  }

  const genAI = new GoogleGenerativeAI(getApiKey());
  let lastError;
  const models = candidateModels();

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: system || undefined
        });
        const chat = model.startChat({
          history,
          generationConfig: json
            ? { maxOutputTokens, temperature, responseMimeType: 'application/json' }
            : { maxOutputTokens, temperature }
        });
        const result = await chat.sendMessage(prompt);
        const text = result.response.text();
        if (!text || !text.trim()) throw new Error('Gemini returned an empty response');
        return { text, model: modelName };
      } catch (error) {
        lastError = error;
        const status = error?.status;
        const transient = status === 429 || status === 503 || status === 500;
        if (transient && attempt < 2) {
          await sleep(1200 * attempt);
          continue;
        }
        if (transient || status === 404) {
          console.warn(`Gemini model ${modelName} unavailable (${status || error.message}); trying fallback`);
          break;
        }
        throw error;
      }
    }
  }

  throw lastError || new Error('Gemini request failed');
}

async function generateJson(options) {
  const { text, model } = await generateText({ ...options, json: true });
  try {
    return { data: extractJson(text), model, raw: text };
  } catch (error) {
    const repairPrompt = `${options.prompt}\n\nYour previous response was not valid JSON. Return ONLY valid JSON, with no markdown fences or explanation.`;
    const retry = await generateText({ ...options, prompt: repairPrompt, json: true });
    return { data: extractJson(retry.text), model: retry.model, raw: retry.text };
  }
}

module.exports = {
  isGeminiConfigured,
  candidateModels,
  generateText,
  generateJson,
  extractJson
};
