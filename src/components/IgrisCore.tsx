import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { IgrisStatus } from '../store/useIgrisStore'
import { IgrisMark } from './IgrisIcon'

// The reactive heart of Igris — a Shadow-Monarch sigil that breathes, spins and
// pulses according to state. Glow colour + animation speed are driven by status.

const CFG: Record<
  IgrisStatus,
  { rgb: string; ring: number; pulse: number; label: string }
> = {
  idle:      { rgb: '139,92,246',  ring: 26, pulse: 4.5, label: 'STANDING BY' },
  listening: { rgb: '34,211,238',  ring: 16, pulse: 2.2, label: 'LISTENING' },
  thinking:  { rgb: '167,139,250', ring: 7,  pulse: 1.0, label: 'THINKING' },
  speaking:  { rgb: '139,92,246',  ring: 13, pulse: 0.7, label: 'SPEAKING' },
}

// short radial ticks around the dial
const TICKS = Array.from({ length: 48 }, (_, i) => i)
// orbiting nodes
const NODES = [0, 120, 240]

export function IgrisCore({ status, size = 320 }: { status: IgrisStatus; size?: number }) {
  const c = CFG[status]
  const rgb = c.rgb
  const speaking = status === 'speaking'
  const listening = status === 'listening'

  return (
    <div
      className="relative igris-core-glow shrink-0"
      style={{
        width: `min(${size}px, 80vw)`,
        height: `min(${size}px, 80vw)`,
        ['--core-rgb']: rgb,
      } as CSSProperties}
    >
      {/* expanding ripples when listening */}
      {listening &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: `rgba(${rgb},0.4)` }}
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}

      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="coreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgb(${rgb})`} stopOpacity="1" />
            <stop offset="60%" stopColor={`rgb(${rgb})`} stopOpacity="0.55" />
            <stop offset="100%" stopColor={`rgb(${rgb})`} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* outer dashed ring — slow spin */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: c.ring, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          <circle
            cx="100" cy="100" r="92"
            fill="none" stroke={`rgba(${rgb},0.35)`} strokeWidth="1"
            strokeDasharray="2 10" strokeLinecap="round"
          />
        </motion.g>

        {/* tick dial — reverse spin */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: c.ring * 1.8, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          {TICKS.map((i) => {
            const ang = (i / TICKS.length) * Math.PI * 2
            const big = i % 6 === 0
            const r1 = big ? 74 : 78
            const r2 = 82
            return (
              <line
                key={i}
                x1={100 + Math.cos(ang) * r1}
                y1={100 + Math.sin(ang) * r1}
                x2={100 + Math.cos(ang) * r2}
                y2={100 + Math.sin(ang) * r2}
                stroke={`rgba(${rgb},${big ? 0.6 : 0.22})`}
                strokeWidth={big ? 1.4 : 0.8}
              />
            )
          })}
        </motion.g>

        {/* the Monarch sigil — two counter-rotating diamonds */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: c.ring * 0.6, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          <rect
            x="64" y="64" width="72" height="72"
            fill="none" stroke={`rgba(${rgb},0.5)`} strokeWidth="1.2"
            transform="rotate(45 100 100)"
          />
        </motion.g>
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: c.ring * 0.9, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          <rect
            x="70" y="70" width="60" height="60"
            fill="none" stroke={`rgba(${rgb},0.3)`} strokeWidth="1"
          />
        </motion.g>

        {/* orbiting nodes */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: c.ring * 1.2, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '100px 100px' }}
        >
          {NODES.map((deg) => {
            const ang = (deg * Math.PI) / 180
            return (
              <circle
                key={deg}
                cx={100 + Math.cos(ang) * 58}
                cy={100 + Math.sin(ang) * 58}
                r="2.6"
                fill={`rgb(${rgb})`}
              />
            )
          })}
        </motion.g>

        {/* voice equalizer ring when speaking */}
        {speaking &&
          TICKS.filter((_, i) => i % 2 === 0).map((i) => {
            const ang = (i / TICKS.length) * Math.PI * 2
            return (
              <line
                key={`eq${i}`}
                x1={100 + Math.cos(ang) * 44}
                y1={100 + Math.sin(ang) * 44}
                x2={100 + Math.cos(ang) * 54}
                y2={100 + Math.sin(ang) * 54}
                stroke={`rgb(${rgb})`}
                strokeWidth="2"
                strokeLinecap="round"
                className="ig-eq-bar"
                style={{
                  transformOrigin: `${100 + Math.cos(ang) * 44}px ${100 + Math.sin(ang) * 44}px`,
                  animationDelay: `${(i % 8) * 0.08}s`,
                }}
              />
            )
          })}

        {/* pulsing core background */}
        <motion.circle
          cx="100" cy="100" r="34"
          fill="url(#coreFill)"
          animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: c.pulse, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '100px 100px' }}
        />

        {/* The Igris mark at the centre (same SVG as igris-app's icon) */}
        <foreignObject x="66" y="62" width="68" height="76">
          <motion.div
            className="w-full h-full drop-shadow-[0_0_12px_rgba(255,179,56,0.55)]"
            animate={{ scale: speaking ? [0.95, 1.05, 0.95] : [0.98, 1.02, 0.98] }}
            transition={{ duration: c.pulse, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IgrisMark />
          </motion.div>
        </foreignObject>
      </svg>
    </div>
  )
}

export const coreLabel = (s: IgrisStatus) => CFG[s].label
