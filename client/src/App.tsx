import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import type { TranscriptLine, SuggestionBatch, Suggestion, ChatMessage } from './lib/types'
import { exportSession } from './lib/export'
import { useSettings } from './hooks/useSettings'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionsPanel } from './components/SuggestionsPanel'
import { ChatPanel } from './components/ChatPanel'
import { SettingsModal } from './components/SettingsModal'
import './App.css'

export default function App() {
  const { settings, saveSettings } = useSettings()
  const [showSettings, setShowSettings] = useState(!settings.groqApiKey)
  const [error, setError] = useState<string | null>(null)

  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [batches, setBatches] = useState<SuggestionBatch[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const [nextRefreshIn, setNextRefreshIn] = useState(settings.autoRefreshInterval)

  // Use refs to always get current state inside intervals without re-creating them
  const transcriptRef = useRef<TranscriptLine[]>([])
  const batchesRef = useRef<SuggestionBatch[]>([])
  transcriptRef.current = transcript
  batchesRef.current = batches

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const onError = useCallback((msg: string) => {
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }, [])

  const onTranscriptLine = useCallback((line: TranscriptLine) => {
    setTranscript(prev => [...prev, line])
  }, [])

  const { isRecording, start, stop } = useAudioRecorder({
    apiKey: settings.groqApiKey,
    onTranscriptLine,
    onError,
  })

  const fetchSuggestions = useCallback(async (
    lines: TranscriptLine[],
    prevBatches: SuggestionBatch[]
  ) => {
    if (lines.length === 0) return
    const s = settingsRef.current
    setLoadingSuggestions(true)
    try {
      const recentLines = lines.slice(-s.suggestionContextLines)
      const previousBatch = prevBatches[0]?.suggestions.map(s => s.preview) ?? []

      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-key': s.groqApiKey,
        },
        body: JSON.stringify({
          recentLines,
          previousBatch,
          systemPrompt: s.suggestionPrompt,
          model: s.groqModel,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Suggestions error')

      const suggestions: Suggestion[] = (data.suggestions as Array<{
        type: string; preview: string; detailHint: string
      }>).map(s => ({
        id: uuid(),
        type: s.type as Suggestion['type'],
        preview: s.preview,
        detailHint: s.detailHint,
      }))

      if (suggestions.length === 0) return

      const batch: SuggestionBatch = {
        id: uuid(),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        suggestions,
      }
      setBatches(prev => [batch, ...prev])
      batchesRef.current = [batch, ...prevBatches]
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }, [onError])

  // Auto-refresh timer — recreate when interval setting changes
  useEffect(() => {
    const interval = settings.autoRefreshInterval
    setNextRefreshIn(interval)

    const countdown = setInterval(() => {
      setNextRefreshIn(prev => (prev <= 1 ? interval : prev - 1))
    }, 1000)

    const refresh = setInterval(() => {
      fetchSuggestions(transcriptRef.current, batchesRef.current)
      setNextRefreshIn(interval)
    }, interval * 1000)

    return () => {
      clearInterval(countdown)
      clearInterval(refresh)
    }
  }, [settings.autoRefreshInterval, fetchSuggestions])

  const handleReload = useCallback(() => {
    setNextRefreshIn(settings.autoRefreshInterval)
    fetchSuggestions(transcriptRef.current, batchesRef.current)
  }, [fetchSuggestions, settings.autoRefreshInterval])

  const streamChat = useCallback(async (
    messages: { role: string; content: string }[],
    suggestionContext?: string
  ) => {
    const s = settingsRef.current
    setIsStreaming(true)
    setStreamingContent('')
    let accumulated = ''

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-key': s.groqApiKey,
        },
        body: JSON.stringify({
          messages,
          fullTranscript: transcriptRef.current,
          systemPrompt: s.chatPrompt,
          model: s.groqModel,
        }),
      })

      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break outer
          try {
            const parsed = JSON.parse(payload)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.content) {
              accumulated += parsed.content
              setStreamingContent(accumulated)
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: uuid(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          role: 'assistant',
          content: accumulated,
          ...(suggestionContext ? { suggestionContext } : {}),
        },
      ])
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Chat failed')
    } finally {
      setStreamingContent('')
      setIsStreaming(false)
    }
  }, [onError])

  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    const s = settingsRef.current
    const detailPrompt = s.detailPrompt
      .replace('{type}', suggestion.type)
      .replace('{preview}', suggestion.preview)
      .replace('{detailHint}', suggestion.detailHint)
      .replace('{fullTranscript}', transcriptRef.current.map(l => `[${l.timestamp}] ${l.text}`).join('\n'))

    const userMsg: ChatMessage = {
      id: uuid(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      role: 'user',
      content: `[${suggestion.type}] ${suggestion.preview}`,
      suggestionContext: suggestion.type,
    }
    setChatMessages(prev => [...prev, userMsg])
    streamChat([{ role: 'user', content: detailPrompt }], suggestion.type)
  }, [streamChat])

  const handleChatSend = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: uuid(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      role: 'user',
      content: text,
    }
    setChatMessages(prev => {
      const updated = [...prev, userMsg]
      const history = updated.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      streamChat(history)
      return updated
    })
  }, [streamChat])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">TwinMind — Live Suggestions</h1>
        <div className="header-actions">
          <button className="header-btn" onClick={() => exportSession(transcript, batches, chatMessages)}>
            ↓ Export
          </button>
          <button className="header-btn" onClick={() => setShowSettings(true)}>⚙ Settings</button>
        </div>
      </header>

      {error && <div className="error-toast">{error}</div>}

      <main className="app-columns">
        <TranscriptPanel
          lines={transcript}
          isRecording={isRecording}
          onToggle={isRecording ? stop : start}
        />
        <SuggestionsPanel
          batches={batches}
          loading={loadingSuggestions}
          nextRefreshIn={nextRefreshIn}
          onReload={handleReload}
          onSuggestionClick={handleSuggestionClick}
        />
        <ChatPanel
          messages={chatMessages}
          streamingContent={streamingContent}
          onSend={handleChatSend}
          isStreaming={isStreaming}
        />
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
