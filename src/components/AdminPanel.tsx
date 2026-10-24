import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, X, Copy, Check, Trash2, Plus, ShieldAlert } from 'lucide-react'
import { MAESTRO_URL } from '../env'

// Session-scoped, not localStorage — the admin key shouldn't outlive the tab.
const ADMIN_KEY_STORAGE = 'igris_admin_key'

interface DemoCredential {
  username: string
  label: string | null
  created_at: string
  expires_at: string | null
  revoked: boolean
  last_used_at: string | null
}

interface GeneratedCredential {
  username: string
  password: string
  expires_at: string
}

interface Props {
  onClose: () => void
}

export function AdminPanel({ onClose }: Props) {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? '')
  const [unlocked, setUnlocked] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<DemoCredential[]>([])
  const [generated, setGenerated] = useState<GeneratedCredential | null>(null)
  const [label, setLabel] = useState('')
  const [minutes, setMinutes] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'username' | 'password' | null>(null)
  // Snapshot of "now" for expiry comparisons below — refreshed alongside the
  // credentials list (in the fetch callback, not render) so the component body
  // stays a pure function of state instead of calling Date.now() during render.
  const [now, setNow] = useState(() => Date.now())

  const fetchCredentials = useCallback(async (key: string) => {
    const res = await fetch(`${MAESTRO_URL}/admin/demo-credentials`, {
      headers: { 'X-Admin-Key': key },
    })
    if (!res.ok) throw new Error('bad key')
    setCredentials((await res.json()) as DemoCredential[])
    setNow(Date.now())
  }, [])

  // Try a remembered key once on mount; drop it silently if it no longer works
  // (rotated ADMIN_KEY, etc.) rather than showing a stale "unlocked" state.
  useEffect(() => {
    if (!adminKey) return
    let ignore = false
    // Deliberate fetch-on-mount to auto-verify a remembered key (see comment
    // above): the eslint-plugin-react-hooks v6 rule flags any setState reachable
    // from an effect body, including via a .then() callback — the `ignore` guard
    // above already prevents the stale-closure issue the rule exists to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCredentials(adminKey).then(
      () => {
        if (!ignore) setUnlocked(true)
      },
      () => {
        if (!ignore) {
          sessionStorage.removeItem(ADMIN_KEY_STORAGE)
          setAdminKey('')
        }
      },
    )
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setKeyError(null)
    try {
      await fetchCredentials(keyInput)
      sessionStorage.setItem(ADMIN_KEY_STORAGE, keyInput)
      setAdminKey(keyInput)
      setUnlocked(true)
    } catch {
      setKeyError('Invalid admin key')
    }
  }

  async function handleGenerate() {
    setBusy(true)
    setKeyError(null)
    setGenerated(null)
    try {
      const res = await fetch(`${MAESTRO_URL}/admin/demo-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          label: label.trim() || null,
          expires_in_minutes: minutes ? Number(minutes) : null,
        }),
      })
      if (!res.ok) throw new Error('generate failed')
      setGenerated((await res.json()) as GeneratedCredential)
      setLabel('')
      setMinutes('')
      await fetchCredentials(adminKey)
    } catch {
      setKeyError('Could not generate a credential')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(username: string) {
    try {
      await fetch(`${MAESTRO_URL}/admin/demo-credentials/${username}/revoke`, {
        method: 'POST',
        headers: { 'X-Admin-Key': adminKey },
      })
      await fetchCredentials(adminKey)
    } catch {
      // Best-effort refresh; a failed revoke call leaves the list as-is and the
      // row still shows "active" so it's visibly not silently dropped.
    }
  }

  function copy(text: string, which: 'username' | 'password') {
    void navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-6 relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm mb-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Admin access
            </div>
            <input
              type="password"
              placeholder="Admin key"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-zinc-200 placeholder-zinc-600 text-sm outline-none focus:border-white/20"
            />
            {keyError && <p className="text-red-400 text-xs">{keyError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-200 text-sm font-semibold cursor-pointer"
            >
              Unlock
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <KeyRound className="w-4 h-4 text-tungsten-400" />
              Demo credentials
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Label (optional, e.g. Acme interview)"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-zinc-200 placeholder-zinc-600 text-xs outline-none focus:border-white/20"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Minutes (default 10)"
                  value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-zinc-200 placeholder-zinc-600 text-xs outline-none focus:border-white/20"
                />
                <button
                  onClick={handleGenerate}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-tungsten-500/10 border border-tungsten-500/20 hover:bg-tungsten-500/20 text-tungsten-300 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Generate
                </button>
              </div>
              {keyError && <p className="text-red-400 text-xs">{keyError}</p>}
            </div>

            <AnimatePresence>
              {generated && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-3 flex flex-col gap-1.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Username</span>
                    <button
                      onClick={() => copy(generated.username, 'username')}
                      className="flex items-center gap-1 text-zinc-300 font-mono cursor-pointer hover:text-white"
                    >
                      {generated.username}
                      {copied === 'username' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Password</span>
                    <button
                      onClick={() => copy(generated.password, 'password')}
                      className="flex items-center gap-1 text-zinc-300 font-mono cursor-pointer hover:text-white"
                    >
                      {generated.password}
                      {copied === 'password' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    Expires {new Date(generated.expires_at).toLocaleTimeString()} — shown once, copy it now.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
              {credentials.length === 0 && (
                <p className="text-zinc-700 text-xs text-center py-4">No credentials generated yet.</p>
              )}
              {credentials.map(c => {
                const isExpired = !c.revoked && c.expires_at !== null && new Date(c.expires_at).getTime() < now
                const status = c.revoked ? 'revoked' : isExpired ? 'expired' : 'active'
                return (
                  <div
                    key={c.username}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="text-zinc-300 font-mono">{c.username}</span>
                      <span className="text-zinc-600 text-[10px]">
                        {c.label ? `${c.label} · ` : ''}
                        {status}
                      </span>
                    </div>
                    {status === 'active' && (
                      <button
                        onClick={() => handleRevoke(c.username)}
                        className="text-zinc-600 hover:text-red-400 cursor-pointer p-1.5"
                        title="Revoke"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
