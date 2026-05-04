import express from 'express'
import cors from 'cors'
import path from 'path'
import { transcribeRoute } from './routes/transcribe'
import { suggestionsRoute } from './routes/suggestions'
import { chatRoute } from './routes/chat'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/transcribe', transcribeRoute)
app.use('/api/suggestions', suggestionsRoute)
app.use('/api/chat', chatRoute)

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
