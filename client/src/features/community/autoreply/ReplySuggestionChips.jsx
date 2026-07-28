import { useEffect, useState } from 'react';
import { fetchReplySuggestions } from '../services/communityApi';

/**
 * Shows tappable quick-reply chips based on the latest incoming message.
 * Drop this above a chat input, e.g.:
 *
 *   <ReplySuggestionChips
 *     lastIncomingMessage={lastMessage?.text}
 *     onSelect={(text) => setDraft(text)}
 *   />
 */
export default function ReplySuggestionChips({ lastIncomingMessage, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!lastIncomingMessage) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetchReplySuggestions(lastIncomingMessage)
      .then((data) => { if (!cancelled) setSuggestions(data); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [lastIncomingMessage]);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect?.(suggestion)}
          className="motion-interactive rounded-full border border-brand-primary/30 bg-brand-primary/5 px-3 py-1.5 text-sm text-brand-primary hover:bg-brand-primary/10"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
