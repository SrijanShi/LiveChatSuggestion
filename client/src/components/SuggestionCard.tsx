import type { Suggestion, SuggestionType } from '../lib/types'

const TYPE_LABELS: Record<SuggestionType, string> = {
  ANSWER: 'Answer',
  FACT_CHECK: 'Fact-Check',
  TALKING_POINT: 'Talking Point',
  QUESTION_TO_ASK: 'Question to Ask',
}

interface Props {
  suggestion: Suggestion
  faded?: boolean
  onClick: (s: Suggestion) => void
}

export function SuggestionCard({ suggestion, faded, onClick }: Props) {
  return (
    <button
      className={`suggestion-card suggestion-card--${suggestion.type.toLowerCase().replace(/_/g, '-')} ${faded ? 'suggestion-card--faded' : ''}`}
      onClick={() => onClick(suggestion)}
    >
      <span className="suggestion-type-chip">{TYPE_LABELS[suggestion.type]}</span>
      <p className="suggestion-preview">{suggestion.preview}</p>
    </button>
  )
}
