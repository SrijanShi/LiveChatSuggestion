export type SuggestionType = 'ANSWER' | 'FACT_CHECK' | 'TALKING_POINT' | 'QUESTION_TO_ASK'

export interface Suggestion {
  id: string
  type: SuggestionType
  preview: string
  detailHint: string
}

export interface SuggestionBatch {
  id: string
  timestamp: string
  suggestions: Suggestion[]
}

export interface TranscriptLine {
  timestamp: string
  text: string
}

export interface ChatMessage {
  id: string
  timestamp: string
  role: 'user' | 'assistant'
  content: string
  suggestionContext?: string
}

export const DEFAULT_SUGGESTION_PROMPT = `You are an AI meeting copilot. Analyze the recent conversation and generate exactly 3 suggestions that are maximally useful RIGHT NOW.

Suggestion types and when to use them:
- ANSWER: Someone just asked a question → give the direct answer with specifics and numbers
- FACT_CHECK: A specific factual claim was made → verify it with accurate data
- TALKING_POINT: A topic deserves a useful angle, stat, or insight the speakers haven't mentioned
- QUESTION_TO_ASK: A probing question that would deepen or redirect the conversation productively

Selection rules:
1. If someone asked a question in the last 3 turns → include an ANSWER as the first suggestion
2. If a verifiable claim was stated (specific numbers, company facts) → include a FACT_CHECK
3. Never repeat suggestions from the previous batch
4. Previews must be independently valuable — actual information, not "click to learn more"
5. Mix types based on what the conversation actually needs

Conversation (most recent last):
{transcript}

Previous batch (do not repeat these ideas):
{previousBatch}

Respond with ONLY valid JSON array, no markdown, no explanation:
[{"type":"ANSWER|FACT_CHECK|TALKING_POINT|QUESTION_TO_ASK","preview":"...","detailHint":"..."},...]`

export const DEFAULT_DETAIL_PROMPT = `You are a knowledgeable AI assistant helping during a live conversation.

Full conversation transcript:
{fullTranscript}

The user wants a detailed response to this suggestion:
[{type}] {preview}
Context: {detailHint}

Provide a focused, useful response (2–4 paragraphs):
- Open with the direct answer or key fact
- Reference specific details from the conversation when relevant
- End with 1–2 follow-up angles or questions the conversation could productively explore
No filler, no "Great question!", just substance.`

export const DEFAULT_CHAT_PROMPT = `You are a helpful AI meeting copilot with full visibility into the ongoing conversation.

Conversation transcript:
{fullTranscript}

Answer the user's question concisely and accurately. Reference transcript context when relevant.`

export interface Settings {
  groqApiKey: string
  groqModel: string
  suggestionPrompt: string
  detailPrompt: string
  chatPrompt: string
  suggestionContextLines: number
  autoRefreshInterval: number
}

export const DEFAULT_SETTINGS: Settings = {
  groqApiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  detailPrompt: DEFAULT_DETAIL_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
  suggestionContextLines: 20,
  autoRefreshInterval: 30,
}
