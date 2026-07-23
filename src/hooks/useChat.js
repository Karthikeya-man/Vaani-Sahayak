import { useState, useEffect, useCallback } from 'react';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Load chat history from localStorage on first mount
  useEffect(() => {
    const savedChat = localStorage.getItem("vaani_chat_history");
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (err) {
        console.error("Failed to parse saved chat history", err);
      }
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
       localStorage.setItem("vaani_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setError(null);
    localStorage.removeItem("vaani_chat_history");
  }, []);

  const sendMessage = useCallback(async (text, language = "english", context = {}) => {
    if (!text.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setSuggestions([]); // Clear previous suggestions
    setLoading(true);
    setError(null);

    try {
      // Build history payload for Gemini format
      // Need all previous messages excluding this current one
      const historyPayload = messages.map(msg => ({
         role: msg.role === 'user' ? 'user' : 'model',
         parts: [{ text: msg.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          language: language,
          context: context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(data.suggested_questions || []);

    } catch (err) {
      setError(err.message);
      // Wait a bit, then clear error
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return { messages, loading, error, suggestions, sendMessage, clearChat };
}
