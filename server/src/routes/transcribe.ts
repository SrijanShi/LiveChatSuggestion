import { Router, Request, Response } from 'express'
import multer from 'multer'
import Groq, { toFile } from 'groq-sdk'

export const transcribeRoute = Router()
const upload = multer({ storage: multer.memoryStorage() })

transcribeRoute.post('/', upload.single('audio'), async (req: Request, res: Response) => {
  const apiKey = req.headers['x-groq-key'] as string
  if (!apiKey) {
    res.status(400).json({ error: 'Missing x-groq-key header' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'No audio file provided' })
    return
  }

  try {
    const groq = new Groq({ apiKey })

    const file = await toFile(req.file.buffer, 'audio.webm', {
      type: req.file.mimetype || 'audio/webm',
    })

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      response_format: 'json',
    })

    res.json({ text: transcription.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed'
    res.status(500).json({ error: message })
  }
})
