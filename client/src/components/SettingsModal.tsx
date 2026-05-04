import { useState } from 'react'
import { DEFAULT_SETTINGS } from '../lib/types'
import type { Settings } from '../lib/types'

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>({ ...settings })

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  const handleReset = () => setDraft({ ...DEFAULT_SETTINGS, groqApiKey: draft.groqApiKey })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label className="settings-label">
            Groq API Key
            <input
              type="password"
              className="settings-input"
              value={draft.groqApiKey}
              onChange={e => set('groqApiKey', e.target.value)}
              placeholder="gsk_..."
              autoComplete="off"
            />
          </label>

          <label className="settings-label">
            Model ID
            <input
              className="settings-input"
              value={draft.groqModel}
              onChange={e => set('groqModel', e.target.value)}
              placeholder="moonshotai/kimi-k1.5-32b-preview"
            />
          </label>

          <label className="settings-label">
            Suggestion context (last N transcript lines)
            <input
              type="number"
              className="settings-input settings-input--narrow"
              value={draft.suggestionContextLines}
              min={5}
              max={100}
              onChange={e => set('suggestionContextLines', Number(e.target.value))}
            />
          </label>

          <label className="settings-label">
            Auto-refresh interval (seconds)
            <input
              type="number"
              className="settings-input settings-input--narrow"
              value={draft.autoRefreshInterval}
              min={10}
              max={300}
              onChange={e => set('autoRefreshInterval', Number(e.target.value))}
            />
          </label>

          <label className="settings-label">
            Live suggestions prompt
            <textarea
              className="settings-textarea"
              rows={10}
              value={draft.suggestionPrompt}
              onChange={e => set('suggestionPrompt', e.target.value)}
            />
          </label>

          <label className="settings-label">
            Detailed answer prompt (on click)
            <textarea
              className="settings-textarea"
              rows={8}
              value={draft.detailPrompt}
              onChange={e => set('detailPrompt', e.target.value)}
            />
          </label>

          <label className="settings-label">
            Chat prompt
            <textarea
              className="settings-textarea"
              rows={6}
              value={draft.chatPrompt}
              onChange={e => set('chatPrompt', e.target.value)}
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleReset}>Reset prompts to defaults</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
