// Lightweight, explainable rule-based "smart reply" generator.
// Deliberately keyword/pattern driven (not a call to an external LLM) so the
// feature works offline, has zero latency/cost, and its behaviour is easy to
// reason about and demo for a senior-focused accessibility feature.

const RULES = [
  {
    patterns: [/\bhow are you\b/i, /\bhow('|')?s it going\b/i, /\bhow have you been\b/i],
    replies: ["I'm doing well, thank you!", 'Doing great, how about you?', 'All good here 🙂']
  },
  {
    patterns: [/\?\s*$/, /\bcan you\b/i, /\bcould you\b/i, /\bwill you\b/i],
    replies: ['Yes, sure!', 'Let me check and get back to you.', "Sorry, I can't right now."]
  },
  {
    patterns: [/\bcall\b/i, /\bphone\b/i, /\bring me\b/i],
    replies: ["I'll call you shortly.", 'Can we talk later today?', "I'm free now, call me."]
  },
  {
    patterns: [/\bmedicat/i, /\bpill\b/i, /\bdose\b/i, /\bdoctor\b/i, /\bappointment\b/i],
    replies: ['Yes, I took it, thank you.', "I'll check on that.", "I'll ask my caregiver."]
  },
  {
    patterns: [/\bthank/i, /\bthanks\b/i],
    replies: ["You're welcome!", 'Anytime!', 'Happy to help 🙂']
  },
  {
    patterns: [/\bhelp\b/i, /\bneed\b/i, /\bemergency\b/i],
    replies: ["I'm on my way.", 'What do you need help with?', "I'll send someone right away."]
  },
  {
    patterns: [/\bsee you\b/i, /\bcoming over\b/i, /\bvisit\b/i, /\btoday\b/i, /\btomorrow\b/i],
    replies: ['See you then!', 'Looking forward to it.', 'What time works for you?']
  },
  {
    patterns: [/\bhappy\b/i, /\bcongrat/i, /\blove\b/i, /\bmiss you\b/i],
    replies: ['Aww, thank you!', 'That means a lot ❤️', 'Miss you too!']
  }
];

const DEFAULT_REPLIES = ['Okay, got it!', 'Thank you for letting me know.', "I'll get back to you soon."];

// Returns up to `limit` short reply suggestions for an incoming message.
const generateSuggestions = (messageText = '', limit = 3) => {
  const text = String(messageText || '').trim();
  if (!text) return DEFAULT_REPLIES.slice(0, limit);

  const matched = RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  const pool = matched ? [...matched.replies, ...DEFAULT_REPLIES] : DEFAULT_REPLIES;

  // De-duplicate while preserving order, then cap to the requested limit.
  return [...new Set(pool)].slice(0, limit);
};

module.exports = { generateSuggestions };
