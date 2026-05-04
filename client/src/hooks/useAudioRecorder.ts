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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendChunk = useCallback(
    async (blob: Blob) => {
      if (blob.size < 1000) return
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

  const start = useCallback(async () => {
    if (!apiKey) {
      onError('Please set your Groq API key in Settings first.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          sendChunk(new Blob([e.data], { type: mimeType }))
        }
      }

      recorder.start()

      // Periodically flush audio data while recording
      intervalRef.current = setInterval(() => {
        if (recorder.state === 'recording') {
          recorder.requestData()
        }
      }, CHUNK_INTERVAL_MS)

      setIsRecording(true)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Mic access denied')
    }
  }, [apiKey, onError, sendChunk])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // Flush any remaining audio before stopping
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    mediaRecorderRef.current = null
    streamRef.current = null
    setIsRecording(false)
  }, [])

  return { isRecording, start, stop }
}
