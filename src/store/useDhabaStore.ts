import { create } from 'zustand'
import { DHABA_AI_URL, DHABA_API_KEY } from '../env'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface DhabaState {
  messages: Message[]
  input: string
  loading: boolean
}

interface DhabaActions {
  setInput: (input: string) => void
  sendMessage: (text: string) => Promise<void>
  stopStreaming: () => void
  clearMessages: () => void
}

const SESSION_KEY = 'playground_dhaba_session'
const getSession = (): string => {
  return localStorage.getItem(SESSION_KEY) ?? (() => {
    const id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
    return id
  })()
}

// Strongly typed headers resolver matching axios clients configuration
const getAuthHeaders = (): Record<string, string> => {
  if (DHABA_API_KEY) {
    return { 'X-API-Key': DHABA_API_KEY }
  }
  try {
    const raw = localStorage.getItem('dhaba_auth')
    if (raw) {
      const parsed = JSON.parse(raw) as { token?: string }
      if (parsed.token) {
        return { 'Authorization': `Bearer ${parsed.token}` }
      }
    }
  } catch (e) {
    console.warn('Failed to parse authentication inside store headers', e)
  }
  return {}
}

const uid = (): string => Math.random().toString(36).slice(2)

let abortController: AbortController | null = null
const sessionId = getSession()

export const useDhabaStore = create<DhabaState & DhabaActions>((set, get) => ({
  messages: [],
  input: '',
  loading: false,

  setInput: (input: string) => set({ input }),

  sendMessage: async (text: string) => {
    if (!text.trim() || get().loading) return

    set({ input: '', loading: true })
    
    // Add user query
    const userMsgId = uid()
    set(state => ({
      messages: [...state.messages, { id: userMsgId, role: 'user', content: text }]
    }))

    // Initialize streaming assistant response
    const assistantId = uid()
    set(state => ({
      messages: [...state.messages, { id: assistantId, role: 'assistant', content: '', streaming: true }]
    }))

    abortController = new AbortController()

    try {
      const res = await fetch(`${DHABA_AI_URL}/agent/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ message: text, session_id: sessionId }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.text().catch(() => '')
        let detail = `Error ${res.status}`
        try {
          const parsed = JSON.parse(err) as { detail?: string }
          detail = parsed.detail ?? detail
        } catch {}
        
        set(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId ? { ...m, content: detail, streaming: false } : m
          )
        }))
        set({ loading: false })
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Response body is null or not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        
        set(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        }))
      }
    } catch (e: unknown) {
      const error = e as Error
      if (error.name !== 'AbortError') {
        set(state => ({
          messages: state.messages.map(m =>
            m.id === assistantId ? { ...m, content: 'Could not reach Dhaba AI server.', streaming: false } : m
          )
        }))
      }
    } finally {
      set(state => ({
        messages: state.messages.map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        ),
        loading: false
      }))
      abortController = null
    }
  },

  stopStreaming: () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    set({ loading: false })
  },

  clearMessages: () => {
    set({ messages: [] })
  }
}))
