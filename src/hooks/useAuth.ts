import { useState, useCallback, useEffect } from 'react'
import { MAESTRO_URL } from '../env'

// Gates the whole app (all three tabs). Authenticates against maestro's
// demo_auth system, not dhaba-ai's Bill-App proxy — this is your own owner
// credential, or a one-time credential minted for an interviewer. role
// determines which tabs App.tsx shows ('owner' = all three, 'demo' = Igris only,
// since Dhaba AI / Research Agent bypass maestro's scoping entirely).
const AUTH_KEY = 'igris_session'

export interface AuthUser {
  token: string
  role: string
  username: string
}

function loadAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(loadAuth)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${MAESTRO_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { detail?: string }).detail ?? 'Invalid credentials')
        return false
      }
      const data = (await res.json()) as AuthUser
      localStorage.setItem(AUTH_KEY, JSON.stringify(data))
      setUser(data)
      return true
    } catch {
      setError('Could not reach the Igris server')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }, [])

  // useIgrisStore fires this on a 401 from /chat — expected routinely given
  // the short demo session TTL, not an edge case. Drops back to the login
  // screen instead of leaving a dead session looking logged in.
  useEffect(() => {
    window.addEventListener('igris:unauthorized', logout)
    return () => window.removeEventListener('igris:unauthorized', logout)
  }, [logout])

  return { user, error, isLoading, login, logout }
}
