import type { AIAlbumSnapshot } from './albumSnapshot'

export type AIChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AIToolResult = {
  name: string
  summary: string
  data: Record<string, unknown>
}

export type AIChatResponse = {
  answer: string
  provider: string
  tools: AIToolResult[]
  degraded: boolean
}

export type AIProvider = 'ollama' | 'openai'

export function getAIServiceUrl() {
  return (import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
}

export async function askAIvan({
  message,
  snapshot,
  history,
  provider,
}: {
  message: string
  snapshot: AIAlbumSnapshot
  history: AIChatMessage[]
  provider?: AIProvider
}) {
  const response = await fetch(`${getAIServiceUrl()}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      snapshot,
      history,
      provider,
    }),
  })

  if (!response.ok) {
    throw new Error(`AIvan service returned ${response.status}`)
  }

  return (await response.json()) as AIChatResponse
}
