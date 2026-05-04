import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'

export const chatRoute = Router()

chatRoute.post('/', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-groq-key'] as string
  if (!apiKey) {
    res.status(400).json({ error: 'Missing x-groq-key header' })
    return
  }

  const { messages, fullTranscript, systemPrompt, model } = req.body as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    fullTranscript: { timestamp: string; text: string }[]
    systemPrompt: string
    model: string
  }

  try {
    const groq = new Groq({ apiKey })

    const transcriptText = fullTranscript?.length
      ? fullTranscript.map(l => `[${l.timestamp}] ${l.text}`).join('\n')
      : '(no transcript yet)'

    const filledSystem = systemPrompt.replace('{fullTranscript}', transcriptText)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const stream = await groq.chat.completions.create({
      model: model || 'moonshotai/kimi-k1.5-32b-preview',
      messages: [{ role: 'system', content: filledSystem }, ...messages],
      temperature: 0.5,
      max_tokens: 2048,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
    res.end()
  }
})
