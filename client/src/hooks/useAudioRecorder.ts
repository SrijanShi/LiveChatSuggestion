import { useState, useRef, useCallback } from 'react'
import type { TranscriptLine } from '../lib/types'

const CHUNK_INTERVAL_MS = 15_000

interface UseAudioRecorderOptions {
  apiKey: string
  onTranscriptLine: (line: TranscriptLine) => void
  onError: (msg: string) => void
}

export function useAudioRecorder({ apiKey, onTranscriptLine, onError }: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const activeRecorderRef = useRef<MediaRecorder | null>(null)
  const shouldContinueRef = useRef(false)

  const getMimeType = () =>
    MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

  const sendChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size < 2000) return
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'x-groq-key': apiKey },
          body: form,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Transcription error')
        if (data.text?.trim()) {
          onTranscriptLine({
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            text: data.text.trim(),
          })
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Transcription failed')
      }
    },
    [apiKey, onTranscriptLine, onError]
  )

  const runCycle = useCallback(
    (stream: MediaStream) => {
      if (!shouldContinueRef.current) return

      const mimeType = getMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      activeRecorderRef.current = recorder
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        if (chunks.length > 0) {
          // Each stop produces a complete, self-contained WebM file with header
          sendChunk(new Blob(chunks, { type: mimeType }))
        }
        // Start next cycle immediately if still recording
        if (shouldContinueRef.current) runCycle(stream)
      }

      recorder.start()

      // Stop after interval — onstop will send the blob and start the next cycle
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, CHUNK_INTERVAL_MS)
    },
    [sendChunk]
  )

  const start = useCallback(async () => {
    if (!apiKey) {
      onError('Please set your Groq API key in Settings first.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      shouldContinueRef.current = true
      runCycle(stream)
      setIsRecording(true)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Mic access denied')
    }
  }, [apiKey, onError, runCycle])

  const stop = useCallback(() => {
    shouldContinueRef.current = false
    if (activeRecorderRef.current?.state === 'recording') {
      activeRecorderRef.current.stop() // sends final chunk via onstop
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    activeRecorderRef.current = null
    setIsRecording(false)
  }, [])

  return { isRecording, start, stop }
}
