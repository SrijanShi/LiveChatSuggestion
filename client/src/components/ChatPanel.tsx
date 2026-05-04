import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../lib/types'

interface Props {
  messages: ChatMessage[]
  streamingContent: string
  onSend: (text: string) => void
  isStreaming: boolean
}

const TYPE_LABELS: Record<string, string> = {
  ANSWER: 'Answer',
  FACT_CHECK: 'Fact-Check',
  TALKING_POINT: 'Talking Point',
  QUESTION_TO_ASK: 'Question to Ask',
}

export function ChatPanel({ messages, streamingContent, onSend, isStreaming }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    onSend(text)
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <span className="panel-title">3. CHAT (DETAILED ANSWERS)</span>
        <span className="session-badge">SESSION-ONLY</span>
      </div>

      <div className="panel-body chat-body">
        <div className="chat-info-banner">
          Clicking a suggestion adds it to this chat and streams a detailed answer. You can also type questions directly. One session — no login, no persistence.
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
            <div className="chat-message-meta">
              {msg.role === 'user' ? 'YOU' : 'ASSISTANT'}
              {msg.suggestionContext && (
                <span className={`chat-suggestion-chip chat-suggestion-chip--${msg.suggestionContext.toLowerCase().replace(/_/g, '-')}`}>
                  {TYPE_LABELS[msg.suggestionContext] ?? msg.suggestionContext}
                </span>
              )}
            </div>
            <div className="chat-message-content">{msg.content}</div>
          </div>
        ))}

        {streamingContent && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message-meta">ASSISTANT</div>
            <div className="chat-message-content">
              {streamingContent}
              <span className="chat-cursor">▋</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Ask anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isStreaming}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
