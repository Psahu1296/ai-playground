import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Mic, Square, Volume2, VolumeX, Trash2, User,
  Cpu, Activity, ArrowRight, Calculator, Globe, CloudSun, Wallet, Loader2,
} from 'lucide-react'
import { useIgrisStore, type IgrisStatus, type IgrisTask } from '../store/useIgrisStore'
import { IgrisCore, coreLabel } from '../components/IgrisCore'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { Listener, sttSupported } from '../lib/speech'

const STATUS_COLOR: Record<IgrisStatus, string> = {
  idle: '139,92,246',
  listening: '34,211,238',
  thinking: '167,139,250',
  speaking: '139,92,246',
}

// ── small on-brand sigil glyph for Igris messages ───────────────────────────
function Sigil({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="text-tungsten-300">
      <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)"
        fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  )
}

const DIRECTIVES = [
  { text: 'How much did we make this month?', sub: 'Dhaba revenue', icon: Wallet },
  { text: 'What is 23456 times 789?', sub: 'Exact calculation', icon: Calculator },
  { text: 'Status of the FIFA World Cup 2026?', sub: 'Live web intel', icon: Globe },
  { text: 'What is the weather in Mumbai?', sub: 'Conditions on the ground', icon: CloudSun },
]

// ── one conversation dispatch ───────────────────────────────────────────────
function Dispatch({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div
        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          isUser
            ? 'bg-white/[0.03] border-white/10 text-zinc-400'
            : 'bg-tungsten-500/10 border-tungsten-500/25 shadow-[0_0_14px_-4px_rgba(255,179,56,0.6)]'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sigil />}
      </div>
      <div className={`max-w-[82%] ${isUser ? 'text-right' : ''}`}>
        <div className={`hud-label text-[9px] mb-1 ${isUser ? 'text-zinc-600' : 'text-tungsten-400/70'}`}>
          {isUser ? 'MY LIEGE' : 'IGRIS'}
        </div>
        <div
          className={`px-4 py-2.5 rounded-xl text-[13.5px] leading-relaxed font-hud ${
            isUser
              ? 'bg-white/[0.04] border border-white/[0.06] text-zinc-200 rounded-tr-sm inline-block text-left'
              : 'bg-tungsten-500/[0.05] border border-tungsten-500/15 text-zinc-200 rounded-tl-sm'
          }`}
        >
          {isUser ? content : <MarkdownRenderer content={content} />}
        </div>
      </div>
    </motion.div>
  )
}

// ── live operations telemetry (shows the backend's task routing) ─────────────
function Operations({ tasks, status, session }: { tasks: IgrisTask[]; status: IgrisStatus; session: string }) {
  return (
    <div className="hud-frame rounded-xl p-4 h-full flex flex-col gap-3 min-h-0">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-tungsten-400" />
        <span className="hud-label text-[10px] text-tungsten-300">Operations</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tungsten-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-tungsten-400" />
          </span>
          <span className="font-monoj text-[9px] text-zinc-500 uppercase">{status}</span>
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
        {tasks.length === 0 ? (
          <div className="text-[11px] font-monoj text-zinc-600 leading-relaxed">
            No specialist dispatched yet. Igris answers directly, or routes to the
            dhaba ledger, web intel, or a tool when your command requires it.
          </div>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="rounded-lg border border-white/[0.05] bg-black/30 p-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-cyan-400/80" />
                <span className="hud-label text-[9px] text-cyan-300/90">{t.agent}</span>
                <span className="ml-auto font-monoj text-[8px] text-emerald-400/80 uppercase">{t.status}</span>
              </div>
              <div className="mt-1.5 font-monoj text-[10px] text-zinc-500 truncate">› {t.query}</div>
            </div>
          ))
        )}
      </div>

      <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
        <span className="hud-label text-[8px] text-zinc-600">SESSION</span>
        <span className="font-monoj text-[9px] text-zinc-500">{session.slice(0, 8)}</span>
      </div>
    </div>
  )
}

export function Igris() {
  const { messages, input, status, tasks, voiceOutput, setInput, setStatus, toggleVoice, send, clear } =
    useIgrisStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const listenerRef = useRef<Listener | null>(null)
  const [session] = useState(() => localStorage.getItem('playground_igris_session') ?? '')
  const [micError, setMicError] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState(false)
  const empty = messages.length === 0

  const flashMicError = (msg: string) => {
    setMicError(msg)
    window.setTimeout(() => setMicError(null), 5000)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, status])

  const handleSend = (text: string) => {
    if (!text.trim() || status === 'thinking') return
    void send(text)
  }

  const toggleMic = () => {
    // Already recording → stop; transcription runs next and fills the input.
    if (status === 'listening') {
      setTranscribing(true)
      listenerRef.current?.stop()
      setStatus('idle')
      return
    }
    if (transcribing) return                 // busy transcribing the last clip
    if (!sttSupported()) {
      flashMicError('This browser blocks microphone access.')
      return
    }
    setMicError(null)
    const l = new Listener()
    listenerRef.current = l
    void l.start(
      (text, final) => {
        if (final) {
          setTranscribing(false)
          setStatus('idle')
          setInput(text)
          handleSend(text)
        }
      },
      () => {                                // ended with no usable transcript
        setTranscribing(false)
        if (useIgrisStore.getState().status === 'listening') setStatus('idle')
      },
      (err) => {
        setTranscribing(false)
        setStatus('idle')
        flashMicError(
          err === 'not-allowed'
            ? 'Microphone blocked. Allow mic access for this site — and macOS Settings → Privacy → Microphone → your browser.'
            : err === 'stt-unavailable'
              ? 'Voice model could not load, my liege. Check your connection and retry.'
              : `Voice input error: ${err}`,
        )
      },
    ).then((ok) => {
      if (ok) setStatus('listening')
      else setTranscribing(false)
    })
  }

  return (
    <div className="igris-stage igris-scanlines flex-1 min-h-0 relative flex flex-col">
      {/* ── persistent command header (when conversing) ── */}
      <AnimatePresence>
        {!empty && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 px-4 sm:px-6 pt-4 z-10"
          >
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <IgrisCore status={status} size={46} />
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold tracking-[0.22em] text-zinc-100 leading-none">IGRIS</span>
                <span className="hud-label text-[8px] mt-1" style={{ color: `rgb(${STATUS_COLOR[status]})` }}>
                  {coreLabel(status)}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={toggleVoice}
                  title={voiceOutput ? 'Mute Igris' : 'Let Igris speak'}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    voiceOutput
                      ? 'border-tungsten-500/30 bg-tungsten-500/10 text-tungsten-300'
                      : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={clear}
                  title="Dismiss the court"
                  className="p-2 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-red-400 hover:border-red-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── body ── */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 py-4 z-[2]">
        <div className="max-w-5xl mx-auto h-full flex gap-5 min-h-0">
          {/* main column */}
          <div className="flex-1 min-h-0 flex flex-col">
            {empty ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center gap-5 sm:gap-7 py-4"
              >
                <IgrisCore status={status} size={300} />
                <div className="flex flex-col gap-2 -mt-2">
                  <h1 className="font-display text-4xl sm:text-5xl font-black tracking-[0.34em] text-zinc-100 pl-[0.34em]">
                    IGRIS
                  </h1>
                  <p className="font-hud text-[13px] text-tungsten-300/70 tracking-wide">
                    First Knight of the Shadow Monarch
                  </p>
                  <p className="font-hud text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed mt-1">
                    Awaiting your command, my liege. Speak or type — I command the
                    dhaba's ledger, the web, and an army of tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                  {DIRECTIVES.map((d, i) => {
                    const Icon = d.icon
                    return (
                      <motion.button
                        key={d.text}
                        onClick={() => handleSend(d.text)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="group text-left p-3.5 rounded-xl border border-tungsten-500/10 bg-tungsten-500/[0.02] hover:bg-tungsten-500/[0.06] hover:border-tungsten-500/25 transition-all cursor-pointer flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-lg bg-tungsten-500/10 border border-tungsten-500/15 flex items-center justify-center text-tungsten-300 shrink-0 group-hover:scale-110 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-hud text-[13px] text-zinc-200 leading-snug">{d.text}</div>
                          <div className="font-monoj text-[10px] text-zinc-600 mt-0.5">{d.sub}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-tungsten-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-5 pb-2">
                {messages.map((m) => (
                  <Dispatch key={m.id} role={m.role} content={m.content} />
                ))}
                {status === 'thinking' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 pl-11"
                  >
                    <span className="font-hud text-xs text-tungsten-300/80 tracking-wide">Igris is deliberating</span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1 h-1 rounded-full bg-tungsten-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* operations rail (desktop) */}
          {!empty && (
            <div className="hidden lg:block w-64 shrink-0">
              <Operations tasks={tasks} status={status} session={session} />
            </div>
          )}
        </div>
      </div>

      {/* ── command bar ── */}
      <div className="shrink-0 px-4 sm:px-6 pb-6 z-10">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence>
            {micError && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-2 px-3 py-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] text-amber-300 font-hud text-[11px] flex items-center gap-2"
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span>{micError}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            className="flex items-center gap-2 p-2 rounded-2xl border bg-[#0a0812]/80 backdrop-blur-lg transition-all"
            style={{
              borderColor: `rgba(${STATUS_COLOR[status]}, ${status === 'idle' ? 0.12 : 0.4})`,
              boxShadow: status === 'idle' ? 'none' : `0 0 26px -8px rgba(${STATUS_COLOR[status]},0.5)`,
            }}
          >
            <button
              onClick={toggleMic}
              disabled={transcribing}
              title={transcribing ? 'Transcribing…' : status === 'listening' ? 'Stop listening' : 'Speak to Igris'}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border disabled:cursor-not-allowed ${
                status === 'listening'
                  ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                  : transcribing
                    ? 'bg-tungsten-500/10 border-tungsten-500/25 text-tungsten-300'
                    : 'bg-tungsten-500/5 border-tungsten-500/15 text-tungsten-300/80 hover:bg-tungsten-500/10'
              }`}
            >
              {transcribing
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : status === 'listening'
                  ? <span className="relative flex"><Mic className="w-5 h-5" /><span className="absolute inset-0 -m-2 rounded-full border border-cyan-400/40 animate-ping" /></span>
                  : <Mic className="w-5 h-5" />}
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(input))}
              placeholder={transcribing ? 'Transcribing, my liege…' : status === 'listening' ? 'Listening, my liege…' : 'Issue your command…'}
              disabled={status === 'thinking'}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-hud min-w-0 disabled:opacity-50"
            />

            <AnimatePresence mode="wait">
              {status === 'thinking' ? (
                <motion.div
                  key="busy"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-tungsten-500/10 border border-tungsten-500/25"
                >
                  <Square className="w-3.5 h-3.5 fill-tungsten-400 text-tungsten-400 animate-pulse" />
                </motion.div>
              ) : (
                <motion.button
                  key="send"
                  onClick={() => handleSend(input)}
                  disabled={!input.trim()}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-tungsten-500/15 border border-tungsten-500/30 text-tungsten-200 hover:bg-tungsten-500/25 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  <Send className="w-4.5 h-4.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <p className="text-center font-monoj text-[9px] text-zinc-700 mt-2 tracking-wider">
            IGRIS · MAESTRO BRAIN · {voiceOutput ? 'VOICE ENABLED' : 'TEXT MODE'}
          </p>
        </div>
      </div>
    </div>
  )
}
