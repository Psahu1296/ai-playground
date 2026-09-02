import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  Send,
  Sparkles,
  Receipt,
  BarChart3,
  CookingPot,
  TrendingUp,
  Square,
  User,
  ArrowRight,
  Database,
  Zap,
} from 'lucide-react'
import { useDhabaStore, type Message } from '../store/useDhabaStore'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

// ── Live Activity Strip ────────────────────────────────────────────────────────

const THINKING_STEPS = [
  { icon: Database, text: 'Querying Dhaba database...' },
  { icon: ChefHat,  text: 'Analyzing business data...'  },
  { icon: BarChart3, text: 'Running tool calls...'      },
  { icon: Zap,      text: 'Processing your request...'  },
]

function LiveDhabaStrip({ messages }: { messages: Message[] }) {
  const lastMsg = messages[messages.length - 1]
  const isThinking = !lastMsg || lastMsg.role !== 'assistant' || lastMsg.content === ''

  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (!isThinking) return
    const id = setInterval(() => setStepIdx(i => (i + 1) % THINKING_STEPS.length), 1800)
    return () => clearInterval(id)
  }, [isThinking])

  const step = isThinking ? THINKING_STEPS[stepIdx] : null
  const Icon = step?.icon ?? Zap

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-2xl mb-2"
    >
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${
        isThinking
          ? 'border-orange-500/20 bg-orange-500/[0.03]'
          : 'border-amber-500/15 bg-amber-500/[0.02]'
      }`}>
        {/* Live dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
        </span>

        {/* Animated text — cycles during thinking, fixed during streaming */}
        <AnimatePresence mode="wait">
          {isThinking ? (
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Icon className="w-3.5 h-3.5 text-orange-400/70 shrink-0" />
              <span className="text-xs text-orange-300 font-mono truncate">{step!.text}</span>
            </motion.div>
          ) : (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
              <span className="text-xs text-amber-300 font-mono">Streaming response...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing dots */}
        <div className="flex gap-1 shrink-0">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-orange-400/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function DhabaAI() {
  const { 
    messages, 
    input, 
    loading, 
    setInput, 
    sendMessage, 
    stopStreaming 
  } = useDhabaStore()

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return
    await sendMessage(text)
  }

  const SUGGESTIONS = [
    { text: "What are today's top dishes?", sub: "Popular item analytics", icon: CookingPot },
    { text: "Give me a revenue summary", sub: "Earnings and cash flow", icon: BarChart3 },
    { text: "Show recent orders", sub: "Delivery & dine-in list", icon: Receipt },
    { text: "What are today's KPIs?", sub: "Key performance metrics", icon: TrendingUp },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Messages / Hero Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 md:py-10 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-8 my-auto w-full max-w-2xl px-2"
            >
              {/* Floating Hero Avatar */}
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-3xl bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/[0.03] relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-amber-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <ChefHat className="w-9 h-9" />
                </motion.div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-white font-bold text-2xl tracking-tight sm:text-3xl">Dhaba AI</h2>
                  <p className="text-zinc-500 text-sm max-w-sm sm:max-w-md mx-auto leading-relaxed">
                    Business intelligence customized for your dhaba — monitor dish analytics, sales revenue, recent orders, or daily expenses.
                  </p>
                </div>
              </div>

              {/* Suggestions Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {SUGGESTIONS.map((s, idx) => {
                  const Icon = s.icon
                  return (
                    <motion.button 
                      key={s.text} 
                      onClick={() => handleSend(s.text)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.3 }}
                      className="group text-left p-4 rounded-2xl border border-white/[0.04] bg-[#0d0d0d]/40 hover:bg-orange-500/[0.03] hover:border-orange-500/20 transition-all duration-300 relative overflow-hidden cursor-pointer shadow-sm hover:shadow-orange-500/[0.01]"
                    >
                      <div className="flex items-start gap-3.5 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/10 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 group-hover:text-orange-300 transition-colors duration-300 shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors leading-snug">{s.text}</h4>
                          <p className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5">{s.sub}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-orange-400 transition-all transform group-hover:translate-x-1 shrink-0 self-center" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <div className="w-full max-w-2xl flex flex-col gap-6 pb-6">
              {messages.map((m) => {
                const isUser = m.role === 'user'
                return (
                  <motion.div 
                    key={m.id}
                    initial={{ opacity: 0, y: 12, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className={`flex items-start ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-md shadow-orange-500/[0.02] mr-3 mt-1 shrink-0 relative group">
                        <ChefHat className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className={`relative max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all shadow-md ${
                      isUser
                        ? 'bg-gradient-to-br from-orange-500/15 to-amber-600/5 border border-orange-500/25 text-zinc-100 rounded-tr-sm shadow-orange-500/[0.01] whitespace-pre-wrap'
                        : 'bg-[#0d0d0d]/70 backdrop-blur-sm border border-white/[0.04] text-zinc-300 rounded-tl-sm'
                    }`}>
                      {isUser ? m.content : <MarkdownRenderer content={m.content} />}
                      {m.streaming && (
                        <motion.span 
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="inline-block w-1.5 h-4 bg-orange-400 ml-1 rounded-sm align-middle" 
                        />
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 shadow-md ml-3 mt-1 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
        {/* ── LIVE ACTIVITY STRIP ── */}
        <AnimatePresence>
          {loading && <LiveDhabaStrip messages={messages} />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Floating Glass Chat Input Area */}
      <div className="shrink-0 px-4 pb-6 md:pb-8 flex justify-center z-10">
        <div className="w-full max-w-2xl bg-[#080808]/80 backdrop-blur-lg border border-white/[0.04] p-2 rounded-2xl shadow-2xl flex items-center gap-2 glow-input transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500/60 shrink-0 hidden sm:flex">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(input))}
            placeholder="Ask anything about your dhaba..."
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none min-w-0"
          />
          
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.button 
                key="stop"
                onClick={stopStreaming}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors shadow-inner"
              >
                <Square className="w-3.5 h-3.5 fill-red-400" />
                <span>Stop</span>
              </motion.button>
            ) : (
              <motion.button 
                key="send"
                onClick={() => handleSend(input)} 
                disabled={!input.trim()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 disabled:opacity-20 disabled:hover:bg-orange-500/10 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-all flex items-center justify-center shadow-inner border border-orange-500/20"
              >
                <Send className="w-4.5 h-4.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
