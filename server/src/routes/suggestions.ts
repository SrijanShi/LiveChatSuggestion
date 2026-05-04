import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'

export const suggestionsRoute = Router()

suggestionsRoute.post('/', async (req: Request, res: Response) => {
  const apiKey = req.headers['x-groq-key'] as string
  if (!apiKey) {
    res.status(400).json({ error: 'Missing x-groq-key header' })
    return
  }

  const { recentLines, previousBatch, systemPrompt, model } = req.body as {
    recentLines: { timestamp: string; text: string }[]
    previousBatch: string[]
    systemPrompt: string
    model: string
  }

  if (!recentLines?.length) {
    res.status(400).json({ error: 'No transcript lines provided' })
    return
  }

  try {
    const groq = new Groq({ apiKey })

    const transcriptText = recentLines
      .map(l => `[${l.timestamp}] ${l.text}`)
      .join('\n')

    const previousBatchText = previousBatch?.length
      ? previousBatch.join('\n')
      : '(none)'

    const filledPrompt = systemPrompt
      .replace('{transcript}', transcriptText)
      .replace('{previousBatch}', previousBatchText)

    const completion = await groq.chat.completions.create({
      model: model || 'moonshotai/kimi-k1.5-32b-preview',
      messages: [{ role: 'user', content: filledPrompt }],
      temperature: 0.7,
      max_tokens: 1024,
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'

    // Strip markdown code fences if model wrapped the JSON
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let suggestions
    try {
      suggestions = JSON.parse(cleaned)
    } catch {
      suggestions = []
    }

    if (!Array.isArray(suggestions)) suggestions = []
    suggestions = suggestions.slice(0, 3)

    res.json({ suggestions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Suggestions failed'
    res.status(500).json({ error: message })
  }
})
