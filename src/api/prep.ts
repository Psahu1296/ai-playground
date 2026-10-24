import { MAESTRO_URL } from '../env'

// Interview prep (maestro /prep/*) — the same store as igris-app's Prep screen and
// Claude Code's /interview-prep, so a card answered here lights the phone's streak too.
// Owner only: maestro answers 404 to anyone else, shown as "not available".

export interface Habit {
  streak: number
  best: number
  freezes: number
  done_today: boolean
  today_xp: number
  goal: number
  total_xp: number
  level: number
  rank: string
  next: string | null
  progress: number
  to_next: number
  week: { day: string; xp: number; frozen: boolean }[]
}

export interface PrepTask {
  key: string
  text: string
  quiz: { section: string | null; n: number } | null
  done: boolean
}

export interface PrepDay {
  day: string
  week: string | null
  tasks: PrepTask[]
  first: string
  last: string
  readiness: number
}

export interface PyCard {
  id: string
  kata: number
  kind: 'output' | 'blank' | 'bug'
  ask: string
  code: string
  options: { i: number; text: string }[]
}

export interface PyNext {
  card: PyCard | null
  unlocked: number
  mastery: { total: number; seen: number; solid: number }
}

export interface PyResult {
  right: boolean
  answer: string
  why: string
  fixed: string | null
  xp: number
  habit: Habit
  goal_hit: boolean
  streak_up: boolean
  rank_up: boolean
}

export interface PrepQuestion {
  id: number
  section: string
  question: string
  star: boolean
  last: number | null
}

export interface PrepGrade {
  score: number
  right: string
  missing: string
  say_it: string
  note: string
  model_answer: string
}

export class PrepUnavailable extends Error {}

function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('igris_session')
    const token = raw ? (JSON.parse(raw) as { token?: string }).token : undefined
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function call<T>(path: string, what: string, init?: { method: string; body: unknown }): Promise<T> {
  const res = await fetch(`${MAESTRO_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: { ...authHeader(), ...(init ? { 'Content-Type': 'application/json' } : {}) },
    body: init ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('igris:unauthorized'))
    throw new Error('Session expired. Sign in again.')
  }
  if (res.status === 404 && path.startsWith('/prep/today')) throw new PrepUnavailable('Prep is owner-only.')
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    throw new Error(typeof body?.detail === 'string' ? body.detail : `${what} failed (${res.status}).`)
  }
  return (await res.json()) as T
}

export const prepHabit = () => call<Habit>('/prep/habit', 'Loading your streak')

export const prepDay = (day?: string) => call<PrepDay>(`/prep/today${day ? `?day=${day}` : ''}`, 'Loading the plan')

export const tickTask = (day: string, task: string, done: boolean) =>
  call<{ ok: boolean }>('/prep/ticks', 'Ticking the task', { method: 'PUT', body: { day, task, done } })

export const nextCard = (ahead: boolean, after: string | null) =>
  call<PyNext>(`/prep/python/next?ahead=${ahead}${after ? `&after=${encodeURIComponent(after)}` : ''}`, 'Loading a card')

export const answerCard = (id: string, choice: number) =>
  call<PyResult>(`/prep/python/${encodeURIComponent(id)}/answer`, 'Checking', { method: 'POST', body: { choice } })

export const nextQuestions = async (n: number, section: string | null) =>
  (await call<{ questions: PrepQuestion[] }>(`/prep/next?n=${n}${section ? `&section=${section}` : ''}`, 'Loading questions'))
    .questions

export const answerQuestion = (id: number, answer: string) =>
  call<PrepGrade>(`/prep/questions/${id}/answer`, 'Grading', { method: 'POST', body: { answer } })

/** A skip: score 1 without a grading call, then the model answer to read. */
export async function skipQuestion(id: number): Promise<string> {
  await call(`/prep/questions/${id}/grade`, 'Skipping', { method: 'POST', body: { score: 1, note: 'skipped' } })
  return (await call<{ answer: string }>(`/prep/questions/${id}`, 'Loading the answer')).answer
}

/** "2026-10-24" ± days (the plan's days are IST dates; this runs in IST). */
export function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + by)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
