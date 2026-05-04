import type { TranscriptLine, SuggestionBatch, ChatMessage } from './types'

export function exportSession(
  transcript: TranscriptLine[],
  batches: SuggestionBatch[],
  chat: ChatMessage[]
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    transcript,
    suggestionBatches: batches.map(b => ({
      timestamp: b.timestamp,
      suggestions: b.suggestions.map(s => ({
        type: s.type,
        preview: s.preview,
        detailHint: s.detailHint,
      })),
    })),
    chatHistory: chat.map(m => ({
      timestamp: m.timestamp,
      role: m.role,
      content: m.content,
      ...(m.suggestionContext ? { suggestionContext: m.suggestionContext } : {}),
    })),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `twinmind-session-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}
