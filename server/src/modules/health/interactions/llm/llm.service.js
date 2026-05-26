const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'openrouter/free';
const REQUEST_TIMEOUT_MS = 5000;

const explainInteraction = async (engineResult) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || typeof fetch !== 'function') {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a medical explanation assistant. You MUST NOT modify or override medical interaction results. You MUST NOT change severity or detect new interactions. You ONLY explain the provided result in simple human language.'
          },
          {
            role: 'user',
            content: `Explain this drug interaction result in simple human language. Do not add new interactions, do not change severity, and do not override the result.\n\n${JSON.stringify(engineResult, null, 2)}`
          }
        ],
        temperature: 0.2
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const explanation = data?.choices?.[0]?.message?.content;

    if (typeof explanation !== 'string' || !explanation.trim()) {
      return null;
    }

    return explanation.trim();
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  explainInteraction
};
