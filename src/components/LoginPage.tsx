import { useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { IgrisIcon } from './IgrisIcon'

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>
  error: string | null
  isLoading: boolean
}

export function LoginPage({ onLogin, error, isLoading }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onLogin(username, password)
  }

  return (
    <div className="flex flex-col items-center justify-center h-svh bg-[#09080E] relative overflow-hidden">
      {/* Grid backdrop */}
      <div className="dark-grid" />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(255,179,56,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <IgrisIcon className="w-20 h-20" size={80} />
          </motion.div>
          <div className="text-center">
            <h1 className="text-4xl text-[#F5F2EC] font-display font-medium">Igris</h1>
            <p className="text-tungsten-400/90 text-[11px] font-medium tracking-[0.25em] uppercase mt-1.5">
              Personal Agent
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-zinc-200 placeholder-zinc-600 text-sm outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.03] border border-white/[0.07] text-zinc-200 placeholder-zinc-600 text-sm outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs text-center font-medium py-1"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] text-zinc-200 font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="text-zinc-700 text-[11px] text-center">
          Owner or demo access only
        </p>
      </motion.div>
    </div>
  )
}
