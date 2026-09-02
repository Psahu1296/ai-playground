import { create } from 'zustand'
import { RESEARCH_AGENT_URL } from '../env'

export type Stage = 'idle' | 'planning' | 'searching' | 'synthesizing' | 'done' | 'error'

export interface ResearchSession {
  id: string
  topic: string
  subtasks: string[]
  report: string
  completedAt: number
}

interface ResearchState {
  topic: string
  stage: Stage
  subtasks: string[]
  searched: Set<string>
  currentSearching: string | null
  report: string
  error: string
  copied: boolean
  history: ResearchSession[]
}

interface ResearchActions {
  setTopic: (topic: string) => void
  setCopied: (copied: boolean) => void
  runResearch: () => Promise<void>
  stopResearch: () => void
  reset: () => void
  clearHistory: () => void
}

const INITIAL_STATE: ResearchState = {
  topic: '',
  stage: 'idle',
  subtasks: [],
  searched: new Set<string>(),
  currentSearching: null,
  report: '',
  error: '',
  copied: false,
  history: [],
}

let abortController: AbortController | null = null

interface EventPayload {
  type: string
  data: string
}

export const useResearchStore = create<ResearchState & ResearchActions>((set, get) => {
  const handleEvent = (event: EventPayload) => {
    set(state => {
      switch (event.type) {
        case 'status':
          if (event.data.toLowerCase().includes('synthesiz')) {
            return { stage: 'synthesizing', currentSearching: null }
          }
          return {}
        case 'subtask':
          return { stage: 'planning', subtasks: [...state.subtasks, event.data] }
        case 'searching': {
          const nextSearched = new Set(state.searched)
          nextSearched.add(event.data)
          return { stage: 'searching', currentSearching: event.data, searched: nextSearched }
        }
        case 'report':
          return { stage: 'synthesizing', report: event.data }
        case 'done': {
          // Save completed session to history, reset active pipeline
          const session: ResearchSession = {
            id: Math.random().toString(36).slice(2),
            topic: state.topic,
            subtasks: state.subtasks,
            report: state.report,
            completedAt: Date.now(),
          }
          return {
            stage: 'idle',
            currentSearching: null,
            topic: '',
            subtasks: [],
            searched: new Set<string>(),
            report: '',
            error: '',
            copied: false,
            history: [...state.history, session],
          }
        }
        default:
          return {}
      }
    })
  }

  return {
    ...INITIAL_STATE,

    setTopic: (topic: string) => set({ topic }),
    setCopied: (copied: boolean) => set({ copied }),

    runResearch: async () => {
      const { topic, stage } = get()
      if (!topic.trim() || stage !== 'idle') return

      set({
        stage: 'planning',
        subtasks: [],
        searched: new Set<string>(),
        currentSearching: null,
        report: '',
        error: '',
        copied: false,
      })

      abortController = new AbortController()

      try {
        const res = await fetch(`${RESEARCH_AGENT_URL}/research/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.trim() }),
          signal: abortController.signal,
        })

        if (!res.ok) {
          set({ stage: 'error', error: `Server error ${res.status}` })
          return
        }

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('Response body is null or not readable')

        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value)

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as EventPayload
              handleEvent(event)
            } catch (err) {
              console.warn('Failed parsing SSE payload', err)
            }
          }
        }
      } catch (e: unknown) {
        const error = e as Error
        if (error.name !== 'AbortError') {
          set({ stage: 'error', error: 'Could not reach Research Agent server.' })
        } else {
          set({ stage: 'idle' })
        }
      } finally {
        abortController = null
      }
    },

    stopResearch: () => {
      if (abortController) {
        abortController.abort()
        abortController = null
      }
      set({ stage: 'idle' })
    },

    reset: () => {
      if (abortController) {
        abortController.abort()
        abortController = null
      }
      set(INITIAL_STATE)
    },

    clearHistory: () => set({ history: [] }),
  }
})
