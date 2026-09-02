import { create } from 'zustand'
import { MAESTRO_URL } from '../env'
import { speak, stopSpeaking, warmKokoro } from '../lib/speech'

export type IgrisStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface IgrisTask {
  id: string
  agent: string
  query: string
  status: string
  result: string | null
}

export interface IgrisMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  tasks?: IgrisTask[]
}

interface IgrisState {
  messages: IgrisMessage[]
  input: string
  status: IgrisStatus
  tasks: IgrisTask[]       // latest operations, for the telemetry panel
  voiceOutput: boolean
}

interface IgrisActions {
  setInput: (v: string) => void
  setStatus: (s: IgrisStatus) => void
  toggleVoice: () => void
  send: (text: string) => Promise<void>
  clear: () => void
}

const SESSION_KEY = 'playground_igris_session'
const getSession = (): string =>
  localStorage.getItem(SESSION_KEY) ??
  (() => {
    const id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
    return id
  })()

const VOICE_KEY = 'playground_igris_voice'
const uid = (): string => Math.random().toString(36).slice(2)
const sessionId = getSession()

// Same key useAuth.ts writes to. Read fresh on every send (not cached at
// module load) so a re-login mid-session picks up the new token immediately.
const AUTH_KEY = 'igris_session'
function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    const token = raw ? (JSON.parse(raw) as { token?: string }).token : null
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export const useIgrisStore = create<IgrisState & IgrisActions>((set, get) => ({
  messages: [],
  input: '',
  status: 'idle',
  tasks: [],
  voiceOutput: localStorage.getItem(VOICE_KEY) === '1',

  setInput: (v) => set({ input: v }),
  setStatus: (s) => set({ status: s }),

  toggleVoice: () => {
    const next = !get().voiceOutput
    localStorage.setItem(VOICE_KEY, next ? '1' : '0')
    if (next) void warmKokoro()   // start the ~80MB model download now
    else stopSpeaking()
    set({ voiceOutput: next })
  },

  send: async (text: string) => {
    const clean = text.trim()
    if (!clean || get().status === 'thinking') return

    stopSpeaking()
    set((st) => ({
      input: '',
      status: 'thinking',
      messages: [...st.messages, { id: uid(), role: 'user', content: clean, ts: Date.now() }],
    }))

    try {
      const res = await fetch(`${MAESTRO_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ message: clean, session_id: sessionId }),
      })
      if (res.status === 401) {
        // Given the short (10 min) session TTL this is routine, not exceptional —
        // useAuth listens for this event and clears the session so App.tsx drops
        // back to the login screen instead of leaving a dead session logged in.
        window.dispatchEvent(new Event('igris:unauthorized'))
        throw new Error('Session expired or revoked — please sign in again')
      }
      if (!res.ok) throw new Error(`Maestro responded ${res.status}`)
      const data = (await res.json()) as { response: string; tasks?: IgrisTask[] }
      const tasks = data.tasks ?? []

      set((st) => ({
        tasks,
        messages: [
          ...st.messages,
          { id: uid(), role: 'assistant', content: data.response, ts: Date.now(), tasks },
        ],
      }))

      if (get().voiceOutput) {
        set({ status: 'speaking' })
        speak(data.response, () => {
          if (get().status === 'speaking') set({ status: 'idle' })
        })
      } else {
        set({ status: 'idle' })
      }
    } catch (e) {
      const msg =
        e instanceof Error && /Failed to fetch/i.test(e.message)
          ? 'I cannot reach my mind, my liege — is the maestro server running on port 8000?'
          : `A fault in the link, my liege: ${(e as Error).message}`
      set((st) => ({
        status: 'idle',
        messages: [...st.messages, { id: uid(), role: 'assistant', content: msg, ts: Date.now() }],
      }))
    }
  },

  clear: () => {
    stopSpeaking()
    set({ messages: [], tasks: [], status: 'idle' })
  },
}))

// If the user had voice enabled on a previous visit, start fetching the model
// immediately so the first spoken reply already uses the neural voice.
if (localStorage.getItem(VOICE_KEY) === '1') void warmKokoro()
