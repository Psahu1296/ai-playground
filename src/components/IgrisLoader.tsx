import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { LOGO } from './igrisMark'

// The web twin of igris-app/src/components/igris-loader.tsx: the mark as a status light.
//
// ONE motion — a pen stroke circling the crown's outline over a dimmed body, with a
// pulsing core — and the COLOUR says which step it is on. igris-app tried a motion per
// step first (segments running round the outline) and on screen it read as something
// crawling, so don't add one. Idle is the icon, lit and still; only a lone hero mark
// may `breathe`.

export type LoaderState = 'idle' | 'thinking' | 'working' | 'answering' | 'loading' | 'listening'

// igris-app's metals (constants/theme.ts laneMetal / phaseMetal).
const METALS = {
  tungsten: { hi: '#FFE0A3', mid: '#FFB338', lo: '#A9661A', core: '#FFF3D6' },
  steel: { hi: '#BFE6FF', mid: '#38BDF8', lo: '#1A6FA0', core: '#EAF6FF' },
  pink: { hi: '#FBCFE8', mid: '#F472B6', lo: '#9D174D', core: '#FFF0F7' },
} as const

const L = LOGO.crown.length
/** One travelling stroke, about a quarter of the outline. */
const DASH = `${L * 0.26} ${L * 0.74}`
/** Stroke width in viewBox units for a width on screen: never under 1.5px, ~2.4px at hero size. */
const strokeFor = (size: number) => (Math.max(1.5, size * 0.022) * 850) / size

const metalOf = (state: LoaderState) =>
  state === 'working' ? METALS.pink : state === 'listening' ? METALS.steel : METALS.tungsten

export function IgrisLoader({
  state,
  size = 28,
  breathe = false,
  className = '',
}: {
  state: LoaderState
  /** Height in px; width follows the mark's aspect. */
  size?: number
  /** Let an idle mark breathe. For a lone hero mark only — never in a list. */
  breathe?: boolean
  className?: string
}) {
  const id = useId()
  const still = useReducedMotion()
  const active = state !== 'idle'
  const metal = metalOf(state)

  return (
    <motion.div
      role={active ? 'progressbar' : 'img'}
      aria-label={active ? `Igris is ${state}` : 'Igris'}
      className={`shrink-0 ${className}`}
      style={{ width: size * LOGO.aspect, height: size }}
      animate={!active && breathe && !still ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={!active && breathe ? { duration: 4.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      <svg viewBox={LOGO.viewBox} width="100%" height="100%" className="overflow-visible">
        <defs>
          <linearGradient id={`${id}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={metal.hi} />
            <stop offset="0.42" stopColor={metal.mid} />
            <stop offset="1" stopColor={metal.lo} />
          </linearGradient>
        </defs>
        <motion.path
          d={LOGO.crown.d}
          fill={`url(#${id}-m)`}
          initial={false}
          animate={{ fillOpacity: active ? 0.18 : 1 }}
          transition={{ duration: 0.32 }}
        />
        <motion.path
          d={LOGO.flame.d}
          fill={metal.core}
          animate={active && !still ? { fillOpacity: [1, 0.35, 1] } : { fillOpacity: 1 }}
          transition={active && !still ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        />
        {/* The pen stroke: offsetting by a whole outline per lap moves the dash once round. */}
        <motion.path
          d={LOGO.crown.d}
          fill="none"
          stroke={metal.mid}
          strokeWidth={strokeFor(size)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASH}
          initial={false}
          animate={
            active && !still
              ? { strokeOpacity: 1, strokeDashoffset: [0, -L] }
              : { strokeOpacity: active ? 1 : 0, strokeDashoffset: 0 }
          }
          transition={
            active && !still
              ? { strokeDashoffset: { duration: 1.6, repeat: Infinity, ease: 'linear' }, strokeOpacity: { duration: 0.32 } }
              : { duration: 0.32 }
          }
        />
      </svg>
    </motion.div>
  )
}
