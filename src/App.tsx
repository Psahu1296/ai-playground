import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Microscope, LogOut, Crown, ShieldCheck, GraduationCap } from 'lucide-react'
import { Igris } from './tabs/Igris'
import { DhabaAI } from './tabs/DhabaAI'
import { ResearchAgent } from './tabs/ResearchAgent'
import { Prep } from './tabs/Prep'
import { LoginPage } from './components/LoginPage'
import { AdminPanel } from './components/AdminPanel'
import { IgrisIcon } from './components/IgrisIcon'
import { useAuth } from './hooks/useAuth'

const TABS = [
  { id: 'igris', label: 'Igris', icon: Crown, colorRgb: '255, 179, 56', colorHex: '#FFB338' },
  { id: 'dhaba', label: 'Dhaba AI', icon: ChefHat, colorRgb: '249, 115, 22', colorHex: '#f97316' },
  { id: 'research', label: 'Research Agent', icon: Microscope, colorRgb: '59, 130, 246', colorHex: '#3b82f6' },
  { id: 'prep', label: 'Prep', icon: GraduationCap, colorRgb: '16, 185, 129', colorHex: '#10b981' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [active, setActive] = useState<TabId>('igris')
  const [showAdmin, setShowAdmin] = useState(false)
  const { user, error, isLoading, login, logout } = useAuth()

  if (!user) {
    return <LoginPage onLogin={login} error={error} isLoading={isLoading} />
  }

  // Dhaba AI and Research Agent tabs bypass maestro's scoping entirely (their
  // own static API key / no auth at all) — a demo (interviewer) session only
  // ever sees Igris, which is the one path that actually enforces the PII
  // block. The owner sees everything, same as before this feature existed.
  const visibleTabs = user.role === 'demo' ? TABS.filter(t => t.id === 'igris') : TABS
  const currentTab = visibleTabs.find(t => t.id === active) ?? visibleTabs[0]
  const rgb = currentTab.colorRgb

  return (
    <div
      className="flex flex-col h-svh bg-[#09080E] text-zinc-100 overflow-hidden relative"
      style={{
        '--theme-accent-color': rgb,
        '--theme-accent-hex': currentTab.colorHex,
      } as React.CSSProperties}
    >
      {/* Premium Dark Grid Backdrop */}
      <div className="dark-grid" />

      {/* Floating Dynamic Ambient Glows — driven by the active tab colour */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="ambient-glow"
          style={{
            background: `radial-gradient(circle, rgba(${rgb}, 0.15) 0%, rgba(${rgb}, 0.05) 50%, transparent 100%)`,
            top: '-10%',
            left: active === 'research' ? '60%' : active === 'dhaba' ? '15%' : '38%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '800px',
          }}
        />
        <div
          className="ambient-glow"
          style={{
            background: `radial-gradient(circle, rgba(${rgb}, 0.08) 0%, transparent 80%)`,
            bottom: '-20%',
            right: active === 'research' ? '50%' : active === 'dhaba' ? '10%' : '35%',
            width: '600px',
            height: '600px',
          }}
        />
      </div>

      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.04] bg-[#050505]/40 backdrop-blur-md relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <IgrisIcon className="w-9 h-9" />
              <div className="hidden sm:flex flex-col">
                <span className="text-lg text-[#F5F2EC] font-display font-medium leading-none">Igris</span>
                <span className="text-[10px] text-tungsten-400/80 font-medium tracking-widest mt-1 uppercase">Personal Agent</span>
              </div>
            </div>

            {/* Right side: tabs + user */}
            <div className="flex items-center gap-3">

              {/* Glass Navigation Tabs */}
              <nav className="flex items-center bg-zinc-900/60 border border-white/[0.04] p-1 rounded-xl relative shadow-2xl">
                {visibleTabs.map(tab => {
                  const isActive = active === tab.id
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive(tab.id)}
                      className={`relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 active-ring focus:outline-none cursor-pointer z-10 ${
                        isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-tab-pill"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0 rounded-lg -z-10 shadow-lg"
                          style={{
                            backgroundColor: `rgba(${tab.colorRgb}, 0.1)`,
                            border: `1px solid rgba(${tab.colorRgb}, 0.2)`,
                          }}
                        />
                      )}
                      <Icon
                        className="w-3.5 h-3.5 transition-colors duration-300"
                        style={{ color: isActive ? tab.colorHex : undefined }}
                      />
                      <span className="hidden sm:inline">{tab.label}</span>

                      {isActive && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: tab.colorHex }} />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: tab.colorHex }} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>

              {/* User + admin + logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
                <span className="text-[11px] text-zinc-500 font-medium capitalize hidden sm:block">{user.username}</span>
                {user.role === 'owner' && (
                  <button
                    onClick={() => setShowAdmin(true)}
                    title="Demo access admin"
                    className="p-2 rounded-lg text-zinc-600 hover:text-tungsten-400 hover:bg-tungsten-500/10 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area — all tabs mounted to preserve state */}
      <main className="flex-1 min-h-0 relative z-0 flex flex-col">
        <div className={`flex-1 flex flex-col min-h-0 relative ${active === 'igris' ? 'z-10' : 'hidden z-0'}`}>
          <Igris />
        </div>

        {/* Not mounted at all for a demo session — these bypass maestro's
            scoping entirely, so they never even load rather than just being
            hidden by CSS. */}
        {user.role !== 'demo' && (
          <>
            <div className={`flex-1 flex flex-col min-h-0 relative ${active === 'dhaba' ? 'z-10' : 'hidden z-0'}`}>
              <motion.div
                className="flex-1 flex flex-col min-h-0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: active === 'dhaba' ? 1 : 0, y: active === 'dhaba' ? 0 : 8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <DhabaAI />
              </motion.div>
            </div>

            <div className={`flex-1 flex flex-col min-h-0 relative ${active === 'research' ? 'z-10' : 'hidden z-0'}`}>
              <motion.div
                className="flex-1 flex flex-col min-h-0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: active === 'research' ? 1 : 0, y: active === 'research' ? 0 : 8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <ResearchAgent />
              </motion.div>
            </div>

            {/* Prep: his own interview answers and progress, owner only (maestro 404s anyone else). */}
            <div className={`flex-1 flex flex-col min-h-0 relative ${active === 'prep' ? 'z-10' : 'hidden z-0'}`}>
              <Prep />
            </div>
          </>
        )}
      </main>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  )
}
