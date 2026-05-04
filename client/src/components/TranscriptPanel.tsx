import { useEffect, useRef } from 'react'
import type { TranscriptLine } from '../lib/types'

interface Props {
  lines: TranscriptLine[]
  isRecording: boolean
  onToggle: () => void
}

export function TranscriptPanel({ lines, isRecording, onToggle }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">1. MIC &amp; TRANSCRIPT</span>
        <span className={`recording-badge ${isRecording ? 'active' : ''}`}>
          {isRecording ? '● RECORDING' : '○ STOPPED'}
        </span>
      </div>

      <div className="panel-body">
        <button
          className={`mic-btn ${isRecording ? 'mic-btn--active' : ''}`}
          onClick={onToggle}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? '⏹' : '🎙'}
        </button>

        {isRecording && (
          <p className="transcript-status">Listening… transcript updates every 30s.</p>
        )}

        <div className="transcript-lines">
          {lines.map((line, i) => (
            <div key={i} className="transcript-line">
              <span className="transcript-ts">{line.timestamp}</span>
              <span className="transcript-text">{line.text}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
