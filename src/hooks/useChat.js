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
    setSuggestions([]);
    setLoading(true);
    setError(null);

    try {
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
        timestamp: new Date().toISOString(),
        conversationId: data.conversationId,
        feedback: null
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(data.suggested_questions || []);

    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const sendFeedback = useCallback(async (messageId, conversationId, helpful) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, feedback: helpful ? 'yes' : 'no' };
      }
      return msg;
    }));

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'chat',
          conversationId,
          helpful
        })
      });
    } catch (err) {
      console.warn('Failed to submit chat feedback:', err.message);
    }
  }, []);

  return { messages, loading, error, suggestions, sendMessage, clearChat, sendFeedback };
}
