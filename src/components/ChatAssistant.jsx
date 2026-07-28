"use client";

import { useState, useRef, useEffect } from "react";
import styles from "@/styles/ChatAssistant.module.css";
import { useChat } from "@/hooks/useChat";
import { IoSend, IoTrashOutline, IoWarningOutline } from "react-icons/io5";

const QUICK_STARTS = [
  { icon: "🌿", text: "Crop Disease" },
  { icon: "🌦️", text: "Weather Advice" },
  { icon: "💰", text: "Mandi Prices" },
  { icon: "📋", text: "Govt Schemes" }
];

export default function ChatAssistant({ language = "english", context = {} }) {
  const { messages, loading, error, suggestions, sendMessage, clearChat, sendFeedback } = useChat();

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, suggestions]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    sendMessage(inputText, language, context);
    setInputText("");
  };

  const handleQuickStart = (topic) => {
    sendMessage(`Tell me about ${topic}`, language, context);
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>🌾 Vaani Sahayak</h2>
        <button 
          onClick={clearChat} 
          className={styles.clearBtn}
          title="Clear Conversation"
          aria-label="Clear Conversation"
        >
          <IoTrashOutline size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeAvatar}>🌾</div>
            <h3 className={styles.welcomeTitle}>नमस्ते! मैं Vaani Sahayak हूं</h3>
            <p className={styles.welcomeText}>आपकी खेती से जुड़े किसी भी सवाल का जवाब देने के लिए तैयार हूं।</p>
            
            <div className={styles.quickStarts}>
              {QUICK_STARTS.map((qs, i) => (
                <button 
                  key={i} 
                  className={styles.quickStartBtn}
                  onClick={() => handleQuickStart(qs.text)}
                >
                  <span className={styles.qsIcon}>{qs.icon}</span>
                  {qs.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.wrapperUser : styles.wrapperAssistant}`}
              >
                <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                  <p className={styles.messageText}>{msg.text}</p>
                </div>
                
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginLeft: '4px' }}>
                    <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => sendFeedback(msg.id, msg.conversationId, true)}
                        title="Helpful"
                        style={{
                          background: msg.feedback === 'yes' ? '#dcfce7' : 'transparent',
                          color: msg.feedback === 'yes' ? '#15803d' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        👍 {msg.feedback === 'yes' && 'Helpful'}
                      </button>
                      <button
                        onClick={() => sendFeedback(msg.id, msg.conversationId, false)}
                        title="Not Helpful"
                        style={{
                          background: msg.feedback === 'no' ? '#fee2e2' : 'transparent',
                          color: msg.feedback === 'no' ? '#b91c1c' : '#64748b',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        👎 {msg.feedback === 'no' && 'Not helpful'}
                      </button>
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
                )}
              </div>
            ))}

            {/* Error Bubble */}
            {error && (
              <div className={`${styles.messageWrapper} ${styles.wrapperAssistant}`}>
                 <div className={`${styles.bubble} ${styles.bubbleError}`}>
                    <IoWarningOutline className={styles.errorIcon} />
                    <p className={styles.messageText}>Sorry, couldn&apos;t connect. Please try again.</p>
                 </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className={`${styles.messageWrapper} ${styles.wrapperAssistant}`}>
                <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typingBubble}`}>
                  <div className={styles.dotBounce}></div>
                  <div className={styles.dotBounce}></div>
                  <div className={styles.dotBounce}></div>
                </div>
              </div>
            )}

            {/* Suggestion Chips */}
            {suggestions.length > 0 && !loading && (
              <div className={styles.suggestionsContainer}>
                {suggestions.map((suggestion, idx) => (
                  <button 
                    key={idx} 
                    className={styles.suggestionChip}
                    onClick={() => sendMessage(suggestion, language, context)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <form className={styles.inputArea} onSubmit={handleSend}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.textInput}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="अपना सवाल पूछें... / Ask your question..."
            maxLength={500}
            disabled={loading}
          />
          {inputText.length > 200 && (
             <span className={styles.charCount}>{inputText.length}/500</span>
          )}
        </div>
        <button 
          type="submit" 
          className={styles.sendBtn} 
          disabled={!inputText.trim() || loading}
          aria-label="Send Message"
        >
          <IoSend className={styles.sendIcon} />
        </button>
      </form>
    </div>
  );
}
