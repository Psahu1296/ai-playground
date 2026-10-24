import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Flame,
  MessageSquareText,
  Play,
  Snowflake,
  Star,
  Terminal,
  Trophy,
  X,
} from 'lucide-react'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import {
  answerCard,
  answerQuestion,
  nextCard,
  nextQuestions,
  prepDay,
  prepHabit,
  PrepUnavailable,
  shiftDay,
  skipQuestion,
  tickTask,
  type Habit,
  type PrepDay,
  type PrepGrade,
  type PrepQuestion,
  type PrepTask,
  type PyNext,
  type PyResult,
} from '../api/prep'

// The desktop twin of igris-app's Prep screen (same maestro /prep/* store, same streak).
// Left: the habit and today's plan. Right: practice — read-code cards or the spoken-answer
// quiz, typed here. On a keyboard the cards go fast: 1–4 picks, Enter for the next one,
// which is the point — the shorter the gap between cards, the more "one more" happens.

type Mode = 'cards' | 'quiz'
type QuizStart = { section: string | null; n: number; task: { day: string; key: string } | null }
type Party = { emoji: string; title: string; line: string }

export function Prep() {
  const [habit, setHabit] = useState<Habit | null>(null)
  const [plan, setPlan] = useState<PrepDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [mode, setMode] = useState<Mode>('cards')
  const [quiz, setQuiz] = useState<QuizStart | null>(null)

  const load = useCallback(async (day?: string) => {
    try {
      const [h, p] = await Promise.all([prepHabit(), prepDay(day)])
      setHabit(h)
      setPlan(p)
      setError(null)
    } catch (e) {
      if (e instanceof PrepUnavailable) setUnavailable(true)
      setError(e instanceof Error ? e.message : 'Could not load prep.')
    }
  }, [])

  useEffect(() => {
    // Fetch-on-mount; setState lands in the promise, after the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const toggle = async (t: PrepTask) => {
    if (!plan) return
    const flip = (done: boolean) =>
      setPlan(p => p && { ...p, tasks: p.tasks.map(x => (x.key === t.key ? { ...x, done } : x)) })
    flip(!t.done)
    try {
      await tickTask(plan.day, t.key, !t.done)
    } catch (e) {
      flip(t.done)
      setError(e instanceof Error ? e.message : 'That did not go through.')
    }
  }

  const move = (by: number) => {
    if (!plan) return
    const next = shiftDay(plan.day, by)
    if (next < plan.first || next > plan.last) return
    void load(next)
  }

  if (unavailable) {
    return <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">Prep is owner-only.</div>
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-4">
          {habit ? <HabitCard habit={habit} /> : <Skeleton h="h-64" />}
          {plan ? (
            <PlanCard
              plan={plan}
              onMove={move}
              onToggle={t => void toggle(t)}
              onStart={t => {
                setMode('quiz')
                setQuiz({ section: t.quiz!.section, n: t.quiz!.n, task: { day: plan.day, key: t.key } })
              }}
            />
          ) : (
            <Skeleton h="h-80" />
          )}
        </aside>

        <section className="flex flex-col gap-4 min-w-0">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex bg-zinc-900/60 border border-white/[0.04] p-1 rounded-xl w-fit">
            {(
              [
                ['cards', 'Python cards', Terminal],
                ['quiz', 'Interview quiz', MessageSquareText],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === id ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {mode === 'cards' ? (
            <Cards habit={habit} onHabit={setHabit} />
          ) : quiz ? (
            <Quiz
              key={`${quiz.section}-${quiz.task?.key ?? 'free'}`}
              start={quiz}
              onDone={async () => {
                if (quiz.task) await tickTask(quiz.task.day, quiz.task.key, true).catch(() => {})
                setQuiz(null)
                void load(plan?.day)
              }}
            />
          ) : (
            <QuizPicker onStart={n => setQuiz({ section: null, n, task: null })} />
          )}
        </section>
      </div>
    </div>
  )
}

function Skeleton({ h }: { h: string }) {
  return <div className={`${h} rounded-2xl bg-zinc-900/40 border border-white/[0.04] animate-pulse`} />
}

function Bar({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      />
    </div>
  )
}

function HabitCard({ habit }: { habit: Habit }) {
  const lit = habit.done_today
  const goalHit = habit.today_xp >= habit.goal
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Flame className={`w-8 h-8 ${lit ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
        <div>
          <div className={`text-3xl font-bold leading-none ${lit ? 'text-amber-400' : 'text-zinc-100'}`}>{habit.streak}</div>
          <div className="text-[11px] text-zinc-500 mt-1">day streak · best {habit.best}</div>
        </div>
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: habit.freezes }, (_, n) => (
            <Snowflake key={n} className="w-4 h-4 text-sky-400" />
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5" />
          {habit.rank}
        </div>
      </div>
      {!lit && (
        <p className="text-xs text-amber-400/90">
          {habit.streak > 0 ? 'Not lit today. One card keeps the streak alive.' : 'One card starts a streak.'}
        </p>
      )}
      <div className="flex justify-between">
        {habit.week.map((d, n) => {
          const today = n === habit.week.length - 1
          return (
            <div key={d.day} className="flex flex-col items-center gap-1">
              <div
                title={`${d.day} · ${d.xp} XP`}
                className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center ${
                  d.xp > 0 ? 'bg-amber-400 border-amber-400' : d.frozen ? 'border-sky-400' : today ? 'border-amber-400 border-dashed' : 'border-zinc-700'
                }`}
              >
                {d.frozen && <Snowflake className="w-3 h-3 text-sky-400" />}
              </div>
              <span className="text-[10px] text-zinc-600">
                {new Date(`${d.day}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' })}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[10px] tracking-widest text-zinc-500">
          <span>{goalHit ? 'DAILY GOAL HIT ✓' : 'DAILY GOAL'}</span>
          <span className="tracking-normal">{`${habit.today_xp} / ${habit.goal} XP`}</span>
        </div>
        <Bar value={habit.today_xp / habit.goal} className={goalHit ? 'bg-emerald-400' : 'bg-amber-400'} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[10px] tracking-widest text-zinc-500">
          <span>{`LEVEL ${habit.level} · ${habit.total_xp} XP`}</span>
          <span className="tracking-normal">{habit.next ? `${habit.to_next} XP to ${habit.next}` : 'Top rank'}</span>
        </div>
        <Bar value={habit.progress} className="bg-emerald-500" />
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  onMove,
  onToggle,
  onStart,
}: {
  plan: PrepDay
  onMove: (by: number) => void
  onToggle: (t: PrepTask) => void
  onStart: (t: PrepTask) => void
}) {
  const done = plan.tasks.filter(t => t.done).length
  const label = new Date(`${plan.day}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button onClick={() => onMove(-1)} disabled={plan.day <= plan.first} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-zinc-100">{label}</div>
          <div className="text-[11px] text-zinc-500">{plan.week ?? 'Outside the plan'}</div>
        </div>
        <button onClick={() => onMove(1)} disabled={plan.day >= plan.last} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-between text-[10px] tracking-widest text-zinc-500">
        <span>{`TASKS · ${done} OF ${plan.tasks.length}`}</span>
        <span className="tracking-normal">{`interview readiness ${plan.readiness}%`}</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {plan.tasks.map(t => (
          <li key={t.key} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/50 border border-white/[0.04]">
            <button onClick={() => onToggle(t)} className="mt-0.5 cursor-pointer" aria-label={t.text}>
              {t.done ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" /> : <Circle className="w-4.5 h-4.5 text-zinc-600" />}
            </button>
            <span className={`flex-1 text-[13px] leading-5 ${t.done ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>{t.text}</span>
            {t.quiz && !t.done && (
              <button onClick={() => onStart(t)} className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 text-[11px] font-semibold cursor-pointer">
                Start
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Code({ code }: { code: string }) {
  return (
    <pre className="rounded-xl bg-zinc-950/80 border border-white/[0.06] p-4 overflow-x-auto text-[13px] leading-6 font-mono">
      {code.split('\n').map((line, n) => (
        <div key={n} className="flex gap-4">
          <span className="select-none text-zinc-700 w-5 text-right shrink-0">{n + 1}</span>
          <span className="text-zinc-200 whitespace-pre">{line || ' '}</span>
        </div>
      ))}
    </pre>
  )
}

function Cards({ habit, onHabit }: { habit: Habit | null; onHabit: (h: Habit) => void }) {
  const [next, setNext] = useState<PyNext | null>(null)
  const [ahead, setAhead] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)
  const [result, setResult] = useState<PyResult | null>(null)
  const [combo, setCombo] = useState(0)
  const [party, setParty] = useState<Party | null>(null)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  const load = useCallback(async (wantAhead: boolean, after: string | null) => {
    try {
      setNext(await nextCard(wantAhead, after))
      setChosen(null)
      setResult(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load a card.')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false, null)
  }, [load])

  const card = next?.card ?? null

  const choose = useCallback(
    async (i: number) => {
      if (!card || chosen !== null || busy.current) return
      busy.current = true
      setChosen(i)
      try {
        const r = await answerCard(card.id, i)
        setResult(r)
        onHabit(r.habit)
        setCombo(c => (r.right ? c + 1 : 0))
        const p: Party | null = r.rank_up
          ? { emoji: '🏆', title: `Promoted: ${r.habit.rank}`, line: `Level ${r.habit.level}. Next stop: ${r.habit.next ?? 'the top'}.` }
          : r.streak_up
            ? {
                emoji: '🔥',
                title: `${r.habit.streak}-day streak`,
                line: r.habit.streak === 1 ? 'Day one. Come back tomorrow and it grows.' : 'Lit for today. Keep the chain going.',
              }
            : r.goal_hit
              ? { emoji: '🎯', title: 'Daily goal hit', line: 'Everything from here is bonus XP.' }
              : null
        if (p) setTimeout(() => setParty(p), 400)
      } catch (e) {
        setChosen(null)
        setError(e instanceof Error ? e.message : 'That did not go through.')
      } finally {
        busy.current = false
      }
    },
    [card, chosen, onHabit],
  )

  // 1–4 picks the option in the order shown; Enter or Space moves on (or closes a celebration).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (party) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault()
          setParty(null)
        }
        return
      }
      if (!card) return
      const n = Number(e.key)
      if (!result && n >= 1 && n <= card.options.length) void choose(card.options[n - 1].i)
      if (result && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        void load(ahead, card.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, result, party, ahead, choose, load])

  const toGoal = habit ? Math.max(0, habit.goal - habit.today_xp) : 0

  if (!next) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton h="h-96" />

  if (!card) {
    return (
      <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-8 flex flex-col gap-4 items-start">
        <h2 className="text-xl font-semibold text-zinc-100">Cards unlock with your katas</h2>
        <p className="text-sm text-zinc-400">
          {`Each card opens on the day its kata is in the plan (K1 on Mon 26 Oct). ${next.mastery.total} cards in the deck.`}
        </p>
        <button
          onClick={() => {
            setAhead(true)
            void load(true, null)
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold cursor-pointer"
        >
          Practise ahead anyway
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <motion.div
        key={`${card.id}-${result ? 'r' : 'q'}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest text-zinc-500">{`K${card.kata} · ${card.kind.toUpperCase()}`}</span>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {combo >= 2 && (
                <motion.span
                  key={combo}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-400 text-xs font-bold"
                >
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />×{combo}
                </motion.span>
              )}
            </AnimatePresence>
            <span className="text-[11px] text-zinc-500">
              {`${next.mastery.solid} of ${next.mastery.total} solid${ahead ? ' · ahead' : ''}`}
            </span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">{card.ask}</h2>
        <Code code={card.code} />

        <div className="grid gap-2">
          {card.options.map((o, n) => {
            const isRight = result && o.i === 0
            const isWrongPick = result && chosen === o.i && o.i !== 0
            return (
              <button
                key={o.i}
                onClick={() => void choose(o.i)}
                disabled={chosen !== null}
                className={`flex items-center gap-3 text-left p-3 rounded-xl border-[1.5px] transition-all ${
                  isRight
                    ? 'border-emerald-400 bg-emerald-400/10'
                    : isWrongPick
                      ? 'border-red-400 bg-red-400/5'
                      : result
                        ? 'border-white/[0.04] opacity-40'
                        : chosen === o.i
                          ? 'border-emerald-500/60'
                          : 'border-white/[0.06] bg-zinc-950/40 hover:border-emerald-500/40 hover:bg-zinc-900 cursor-pointer'
                }`}
              >
                <kbd className="shrink-0 w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 text-[11px] flex items-center justify-center font-mono">{n + 1}</kbd>
                <span className={`flex-1 text-sm text-zinc-200 whitespace-pre-wrap ${card.kind !== 'bug' ? 'font-mono text-[13px]' : ''}`}>{o.text}</span>
                {isRight && <Check className="w-4.5 h-4.5 text-emerald-400" />}
                {isWrongPick && <X className="w-4.5 h-4.5 text-red-400" />}
              </button>
            )
          })}
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-semibold ${result.right ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.right ? (combo >= 3 ? `Right · ${combo} in a row` : 'Right') : 'Not quite'}
              </span>
              <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="text-lg font-bold text-amber-400">
                {`+${result.xp} XP`}
              </motion.span>
            </div>
            <div className="text-sm text-zinc-300">
              <MarkdownRenderer content={result.why} />
            </div>
            {result.fixed && (
              <>
                <span className="text-[10px] tracking-widest text-zinc-500">FIXED</span>
                <Code code={result.fixed} />
              </>
            )}
            <button
              onClick={() => void load(ahead, card.id)}
              className="h-12 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
            >
              {toGoal > 0 ? `Next card · ${toGoal} XP to goal` : 'One more card'}
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950/20">Enter</kbd>
            </button>
          </motion.div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </motion.div>

      <AnimatePresence>
        {party && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setParty(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="rounded-3xl bg-zinc-900 border border-emerald-500/40 px-10 py-8 flex flex-col items-center gap-2 max-w-sm w-full shadow-2xl"
            >
              <span className="text-7xl">{party.emoji}</span>
              <span className="text-2xl font-semibold text-zinc-100 text-center">{party.title}</span>
              <span className="text-sm text-zinc-400 text-center">{party.line}</span>
              <span className="text-[11px] text-zinc-600 mt-2">Enter to keep going</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QuizPicker({ onStart }: { onStart: (n: number) => void }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-8 flex flex-col gap-4 items-start">
      <h2 className="text-xl font-semibold text-zinc-100">Interview quiz</h2>
      <p className="text-sm text-zinc-400">
        Questions about your own projects, graded 1–5 against the model answer. Weak ones come back first. Answer as you would out loud.
      </p>
      <button onClick={() => onStart(5)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold cursor-pointer">
        <Play className="w-4 h-4" /> 5 mixed questions
      </button>
    </div>
  )
}

type Graded = PrepGrade | { skipped: true; model_answer: string }

function Quiz({ start, onDone }: { start: QuizStart; onDone: () => void }) {
  const [questions, setQuestions] = useState<PrepQuestion[] | null>(null)
  const [i, setI] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [graded, setGraded] = useState<Graded | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    nextQuestions(start.n, start.section).then(
      qs => {
        if (!ignore) setQuestions(qs)
      },
      e => {
        if (!ignore) setError(e instanceof Error ? e.message : 'Could not load questions.')
      },
    )
    return () => {
      ignore = true
    }
  }, [start])

  if (error && !questions) return <p className="text-xs text-red-400">{error}</p>
  if (!questions) return <Skeleton h="h-80" />
  if (questions.length === 0) return <p className="text-sm text-zinc-500">No questions left in that section.</p>

  if (i >= questions.length) {
    const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)
    return (
      <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-8 flex flex-col gap-4 items-start">
        <span className={`text-4xl font-bold ${avg < 3 ? 'text-red-400' : 'text-emerald-400'}`}>{`${avg.toFixed(1)} / 5`}</span>
        <p className="text-sm text-zinc-400">{`${scores.length} answered. Under 3 comes back tomorrow; the rest climbs the 1/3/7/21/60-day ladder.`}</p>
        <button onClick={onDone} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold cursor-pointer">
          {start.task ? 'Done · tick the task' : 'Done'}
        </button>
      </div>
    )
  }

  const q = questions[i]

  const submit = async () => {
    if (!draft.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const g = await answerQuestion(q.id, draft.trim())
      setGraded(g)
      setScores(s => [...s, g.score])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Grading failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const skip = async () => {
    setBusy(true)
    try {
      setGraded({ skipped: true, model_answer: await skipQuestion(q.id) })
      setScores(s => [...s, 1])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not skip.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/[0.06] p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[10px] tracking-widest text-zinc-500">
        <span>{`QUESTION ${i + 1} OF ${questions.length} · SECTION ${q.section} · Q${q.id}`}</span>
        {q.star && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
        {q.last !== null && <span className="tracking-normal">{`last ${q.last}/5`}</span>}
      </div>
      <h2 className="text-xl font-semibold text-zinc-100">{q.question}</h2>
      {!graded ? (
        <>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
            }}
            rows={7}
            autoFocus
            disabled={busy}
            placeholder="Answer as you would in the interview."
            className="w-full rounded-xl bg-zinc-950/60 border border-white/[0.06] p-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 resize-y"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => void skip()} disabled={busy} className="px-4 h-11 rounded-xl bg-zinc-800 text-zinc-400 text-sm cursor-pointer">
              Skip
            </button>
            <button
              onClick={() => void submit()}
              disabled={busy || !draft.trim()}
              className="flex-1 h-11 rounded-xl bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-sm font-semibold cursor-pointer"
            >
              {busy ? 'Grading…' : 'Grade it · ⌘↵'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {'skipped' in graded ? (
            <p className="text-xs text-zinc-500">Skipped · counted as 1/5, back tomorrow.</p>
          ) : (
            <>
              <span className={`text-3xl font-bold ${graded.score < 3 ? 'text-red-400' : 'text-emerald-400'}`}>{`${graded.score} / 5`}</span>
              {graded.right && <p className="text-sm text-zinc-300">✅ {graded.right}</p>}
              {graded.missing && <p className="text-sm text-zinc-300">❌ {graded.missing}</p>}
              {graded.say_it && (
                <div className="rounded-xl bg-zinc-950/50 border border-white/[0.04] p-4">
                  <div className="text-[10px] tracking-widest text-zinc-500 mb-1">SAY IT LIKE THIS</div>
                  <p className="text-sm text-zinc-200">{graded.say_it}</p>
                </div>
              )}
            </>
          )}
          <div className="rounded-xl bg-zinc-950/50 border border-white/[0.04] p-4 text-sm text-zinc-300">
            <div className="text-[10px] tracking-widest text-zinc-500 mb-1">MODEL ANSWER</div>
            <MarkdownRenderer content={graded.model_answer} />
          </div>
          <button
            onClick={() => {
              setDraft('')
              setGraded(null)
              setI(n => n + 1)
            }}
            className="h-11 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-semibold cursor-pointer"
          >
            {i + 1 < questions.length ? 'Next question' : 'See the score'}
          </button>
        </div>
      )}
    </div>
  )
}
