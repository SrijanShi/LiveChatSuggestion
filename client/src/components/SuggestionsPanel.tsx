import type { SuggestionBatch, Suggestion } from '../lib/types'
import { SuggestionCard } from './SuggestionCard'

interface Props {
  batches: SuggestionBatch[]
  loading: boolean
  nextRefreshIn: number
  onReload: () => void
  onSuggestionClick: (s: Suggestion) => void
}

export function SuggestionsPanel({ batches, loading, nextRefreshIn, onReload, onSuggestionClick }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">2. LIVE SUGGESTIONS</span>
        <span className="batch-count">{batches.length} BATCHES</span>
      </div>

      <div className="suggestions-toolbar">
        <button className="reload-btn" onClick={onReload} disabled={loading}>
          {loading ? '⟳ Loading…' : '↺ Reload suggestions'}
        </button>
        <span className="refresh-countdown">
          auto-refresh in {nextRefreshIn}s
        </span>
      </div>

      <div className="panel-body suggestions-body">
        {batches.length === 0 && !loading && (
          <div className="suggestions-empty">
            <p>Start recording and click Reload to see suggestions.</p>
          </div>
        )}

        {batches.map((batch, batchIdx) => (
          <div key={batch.id} className="suggestion-batch">
            {batch.suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                faded={batchIdx > 0}
                onClick={onSuggestionClick}
              />
            ))}
            <div className="batch-separator">
              — BATCH {batches.length - batchIdx} · {batch.timestamp} —
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
