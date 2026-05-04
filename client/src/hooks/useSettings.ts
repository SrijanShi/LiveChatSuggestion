import { useState, useCallback } from 'react'
import { DEFAULT_SETTINGS } from '../lib/types'
import type { Settings } from '../lib/types'

const STORAGE_KEY = 'tm_settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  return { settings, saveSettings }
}
