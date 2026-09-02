import { motion, AnimatePresence } from 'framer-motion'
import {
  Microscope,
  Search,
  Cpu,
  Copy,
  Check,
  Play,
  Square,
  Globe,
  Loader2,
  AlertCircle,
  Zap,
  BrainCircuit,
} from 'lucide-react'
import { useState } from 'react'
import { useResearchStore, type Stage, type ResearchSession } from '../store/useResearchStore'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

export function ResearchAgent() {
  const {
    topic,
    stage,
    subtasks,
    searched,
    currentSearching,
    report,
    error,
    copied,
    history,
    setTopic,
    setCopied,
    runResearch,
    stopResearch,
    clearHistory,
  } = useResearchStore()

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Could not copy report text', err)
    }
  }

  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error'

  const SUGGESTED_TOPICS = [
    { text: 'What is LangGraph?', label: 'LangGraph' },
    { text: 'RAG vs fine-tuning', label: 'RAG vs FT' },
    { text: 'AI agent frameworks 2026', label: 'Agents 2026' }
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 py-6 md:py-10">
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">

        {/* Input Area */}
        <div className="flex flex-col gap-3.5 bg-[#0d0d0d]/40 backdrop-blur-md border border-white/[0.04] p-3 sm:p-4 rounded-2xl shadow-xl">
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center">
              <Globe className="w-4 h-4 text-zinc-500 absolute left-4 pointer-events-none" />
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runResearch()}
                placeholder="Enter a research topic (e.g. quantum computing advances)..."
                disabled={isRunning}
                className="w-full bg-white/[0.02] border border-white/5 focus:border-blue-500/30 focus:bg-blue-500/[0.01] rounded-xl pl-11 pr-4 py-3.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all"
              />
            </div>

            <AnimatePresence mode="wait">
              {isRunning ? (
                <motion.button key="stop" onClick={stopResearch}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-inner">
                  <Square className="w-3.5 h-3.5 fill-red-400" /><span>Stop</span>
                </motion.button>
              ) : (
                <motion.button key="research" onClick={runResearch} disabled={!topic.trim()}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="px-5 py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-all flex items-center gap-1.5 shadow-inner">
                  <Play className="w-3.5 h-3.5 fill-blue-400/25" /><span>Research</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {stage === 'idle' && (
            <div className="flex flex-wrap gap-2 items-center pl-1 mt-1">
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mr-1">Hot topics:</span>
              {SUGGESTED_TOPICS.map(s => (
                <button key={s.text} onClick={() => setTopic(s.text)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-blue-500/[0.03] hover:border-blue-500/20 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── HISTORY ── */}
        {history.length > 0 && (() => {
          const last = history[history.length - 1]
          const older = history.slice(0, -1)
          return (
            <div className="flex flex-col gap-4">
              {/* Older sessions — collapsed accordion */}
              {older.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest font-mono">Past Sessions</span>
                    <button onClick={clearHistory} className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors font-mono uppercase tracking-wider cursor-pointer">
                      Clear all
                    </button>
                  </div>
                  {older.map(session => (
                    <HistoryCard key={session.id} session={session} onCopy={() => handleCopy(session.report)} copied={copied} />
                  ))}
                </div>
              )}

              {/* Last session — always expanded */}
              <LatestReport session={last} onCopy={() => handleCopy(last.report)} copied={copied} onClearAll={clearHistory} isOnly={older.length === 0} />
            </div>
          )
        })()}

        {/* ── LIVE ACTION STRIP ── */}
        <AnimatePresence>
          {isRunning && (
            <LiveActionStrip
              stage={stage}
              currentSearching={currentSearching}
              searched={searched}
              subtasks={subtasks}
            />
          )}
        </AnimatePresence>

        {/* Pipeline */}
        {stage !== 'idle' && (
          <div className="flex flex-col gap-6 relative pl-8">
            {/* Vertical progress line */}
            <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-800 pointer-events-none rounded-full overflow-hidden">
              <motion.div
                className="w-full bg-gradient-to-b from-blue-500 via-cyan-400 to-indigo-500 origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: stage === 'planning' ? 0.25 : stage === 'searching' ? 0.6 : stage === 'synthesizing' ? 0.85 : 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{ height: '100%' }}
              />
            </div>

            {/* Step 1: Supervisor */}
            <PipelineStep label="Supervisor" icon={Cpu}
              status={stage === 'planning' ? 'active' : subtasks.length > 0 ? 'done' : 'pending'}
              description="Decomposing research query into structured subtasks">
              {subtasks.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.03] font-mono text-[11px]">
                  {subtasks.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2.5 text-zinc-400 leading-snug">
                      <span className="text-blue-500 shrink-0 font-bold">[{i + 1}]</span>
                      <span className="text-zinc-300">{t}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </PipelineStep>

            {/* Step 2: Searcher */}
            {subtasks.length > 0 && (
              <PipelineStep label="Searcher" icon={Search}
                status={stage === 'searching' ? 'active' : stage === 'synthesizing' || stage === 'done' ? 'done' : 'pending'}
                description="Crawling web indices per subtask">

                {/* ── CURRENT SEARCH CALLOUT ── */}
                <AnimatePresence mode="wait">
                  {stage === 'searching' && currentSearching && (
                    <CurrentSearchCard key={currentSearching} query={currentSearching} />
                  )}
                </AnimatePresence>

                {/* Subtask progress list */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.03] font-mono text-[11px]">
                  {subtasks.map((t, i) => {
                    const done = searched.has(t)
                    const active = currentSearching === t
                    return (
                      <div key={i} className={`flex items-start gap-2.5 transition-colors duration-300 leading-snug ${
                        active ? 'text-blue-400 font-bold' : done ? 'text-zinc-500' : 'text-zinc-700'
                      }`}>
                        <span className="shrink-0 font-bold mt-0.5">
                          {done ? <span className="text-emerald-500">✓</span>
                            : active ? (
                              <span className="relative flex h-2 w-2 mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                              </span>
                            ) : <span className="text-zinc-800">○</span>}
                        </span>
                        <span>{t}</span>
                      </div>
                    )
                  })}
                </motion.div>
              </PipelineStep>
            )}

            {/* Step 3: Analyst */}
            {(stage === 'synthesizing' || stage === 'done') && (
              <PipelineStep label="Analyst" icon={BrainCircuit}
                status={stage === 'synthesizing' && !report ? 'active' : report ? 'done' : 'pending'}
                description="Cross-referencing findings, drafting intelligence dossier" />
            )}

            {/* Report */}
            {report && (
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="rounded-2xl border border-white/[0.04] bg-[#0b0b0b]/60 backdrop-blur-md overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
                <div className="px-4 sm:px-5 py-4 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Dossier Completed</span>
                  </div>
                  <button onClick={() => handleCopy(report)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer">
                    {copied ? <><Check className="w-3.5 h-3.5" /><span>Copied</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy Report</span></>}
                  </button>
                </div>
                <div className="px-5 sm:px-6 py-6 text-sm text-zinc-300 leading-relaxed font-sans max-h-[500px] overflow-y-auto">
                  <div className="select-text">
                    <MarkdownRenderer content={report} />
                  </div>
                </div>
              </motion.div>
            )}

            {stage === 'error' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div><h4 className="font-bold">Pipeline Error</h4><p className="text-xs text-red-400/80 mt-1">{error}</p></div>
              </motion.div>
            )}
          </div>
        )}

        {/* Empty state */}
        {stage === 'idle' && history.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
            className="flex flex-col items-center gap-4 my-auto text-center px-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="w-20 h-20 rounded-3xl bg-blue-500/10 border-2 border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/[0.03]">
              <Microscope className="w-9 h-9" />
            </motion.div>
            <div className="flex flex-col gap-1.5 max-w-sm sm:max-w-md">
              <h2 className="text-white font-bold text-2xl tracking-tight sm:text-3xl">Research Agent</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Multi-agent pipeline: planning queries, fetching live web intelligence, synthesizing a structured dossier.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Latest Report (always expanded) ──────────────────────────────────────────

function LatestReport({ session, onCopy, copied, onClearAll, isOnly }: {
  session: ResearchSession
  onCopy: () => void
  copied: boolean
  onClearAll: () => void
  isOnly: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="rounded-2xl border border-white/[0.04] bg-[#0b0b0b]/60 backdrop-blur-md overflow-hidden shadow-2xl relative"
    >
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500" />
      <div className="px-4 sm:px-5 py-4 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-zinc-400 truncate">{session.topic}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer">
            {copied ? <><Check className="w-3.5 h-3.5" /><span>Copied</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
          </button>
          {isOnly && (
            <button onClick={onClearAll}
              className="text-[10px] text-zinc-700 hover:text-red-400 transition-colors font-mono uppercase tracking-wider cursor-pointer px-2">
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="px-5 sm:px-6 py-6 text-sm text-zinc-300 leading-relaxed max-h-[500px] overflow-y-auto">
        <MarkdownRenderer content={session.report} />
      </div>
    </motion.div>
  )
}

// ── History Card ─────────────────────────────────────────────────────────────

function HistoryCard({ session, onCopy, copied }: {
  session: ResearchSession
  onCopy: () => void
  copied: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.04] bg-[#0b0b0b]/50 overflow-hidden"
    >
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
        <span className="text-xs text-zinc-300 font-medium flex-1 truncate">{session.topic}</span>
        <span className="text-[10px] text-zinc-600 font-mono shrink-0">
          {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={`text-zinc-600 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded report */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.03]">
              <div className="flex items-center justify-between px-4 py-2 bg-white/[0.01]">
                <span className="text-[10px] text-zinc-600 font-mono">{session.subtasks.length} subtasks</span>
                <button onClick={onCopy}
                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer">
                  {copied ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              </div>
              <div className="px-4 py-4 text-xs text-zinc-400 leading-relaxed max-h-64 overflow-y-auto">
                <MarkdownRenderer content={session.report} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Live Action Strip ─────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { icon: typeof Zap; text: string; color: string }> = {
  planning:     { icon: Cpu,         text: 'Breaking down research query into subtasks...',  color: 'violet' },
  searching:    { icon: Globe,       text: 'Searching the web...',                           color: 'blue' },
  synthesizing: { icon: BrainCircuit, text: 'Synthesizing findings into report...',          color: 'cyan' },
}

function LiveActionStrip({ stage, currentSearching, searched, subtasks }: {
  stage: Stage
  currentSearching: string | null
  searched: Set<string>
  subtasks: string[]
}) {
  const config = ACTION_CONFIG[stage] ?? ACTION_CONFIG.planning
  const Icon = config.icon

  const displayText = stage === 'searching' && currentSearching
    ? `Searching: "${currentSearching}"`
    : config.text

  const progress = subtasks.length > 0 && stage === 'searching'
    ? `${searched.size - 1}/${subtasks.length}`  // -1 because current is counted in searched
    : null

  const colorMap: Record<string, string> = {
    violet: 'border-violet-500/20 bg-violet-500/[0.03] text-violet-300',
    blue:   'border-blue-500/20   bg-blue-500/[0.03]   text-blue-300',
    cyan:   'border-cyan-500/20   bg-cyan-500/[0.03]   text-cyan-300',
  }
  const dotMap: Record<string, string> = {
    violet: 'bg-violet-400',
    blue:   'bg-blue-400',
    cyan:   'bg-cyan-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colorMap[config.color]}`}
    >
      {/* Live dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotMap[config.color]}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotMap[config.color]}`} />
      </span>

      <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />

      {/* Animated status text — swaps on every change */}
      <AnimatePresence mode="wait">
        <motion.span
          key={displayText}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="text-xs font-mono flex-1 truncate"
        >
          {displayText}
        </motion.span>
      </AnimatePresence>

      {/* Progress counter */}
      {progress && (
        <span className="text-[10px] text-zinc-600 font-mono shrink-0 tabular-nums">
          {progress} done
        </span>
      )}

      {/* Spinner */}
      <Loader2 className="w-3.5 h-3.5 shrink-0 opacity-40 animate-spin" />
    </motion.div>
  )
}

// ── Current Search Callout ────────────────────────────────────────────────────

function CurrentSearchCard({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-blue-500/25 bg-blue-500/[0.04] relative overflow-hidden"
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.04] to-transparent"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
      />
      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-pulse" />
      <span className="text-xs text-blue-300 font-mono flex-1 truncate">{query}</span>
      <span className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest animate-pulse shrink-0">live</span>
    </motion.div>
  )
}

// ── Pipeline Step ─────────────────────────────────────────────────────────────

function PipelineStep({ label, icon: Icon, status, description, children }: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  status: 'pending' | 'active' | 'done'
  description: string
  children?: React.ReactNode
}) {
  const isActive = status === 'active'
  const isDone = status === 'done'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.38 }}
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-500 relative overflow-hidden ${
        isActive ? 'border-blue-500/35 bg-blue-500/[0.02] shadow-lg shadow-blue-500/[0.02] scale-[1.005]' :
        isDone   ? 'border-white/[0.04] bg-[#0d0d0d]/40 shadow-sm' :
                   'border-white/[0.02] bg-transparent opacity-30 pointer-events-none'
      }`}
    >
      {isActive && <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.04)_0%,transparent_80%)] pointer-events-none" />}

      <div className="flex items-center gap-3.5 relative z-10">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
          isActive ? 'bg-blue-500/10 border-blue-500/35 text-blue-400' :
          isDone   ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                     'bg-white/5 border-white/5 text-zinc-700'
        }`}>
          {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> :
           isDone   ? <Check className="w-4 h-4" /> :
                      <Icon className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-widest font-mono ${
              isActive ? 'text-blue-400' : isDone ? 'text-zinc-300' : 'text-zinc-600'
            }`}>{label}</span>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-semibold text-blue-400 animate-pulse font-mono uppercase tracking-wider shrink-0">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1 font-medium truncate leading-none">— {description}</p>
        </div>
      </div>

      {children && <div className="relative z-10">{children}</div>}
    </motion.div>
  )
}
