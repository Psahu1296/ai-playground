import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { IgrisStatus } from '../store/useIgrisStore'
import { IgrisLoader, type LoaderState } from './IgrisLoader'
import { CORE } from './igrisStatus'

// Igris's presence on the page: igris-app's loader (one pen-stroke motion, colour = step)
// on a soft kerosene glow. Replaced the violet "Shadow Monarch" dial with its ticks,
// orbiting nodes and ripples on 2026-10-24, so the web and the phone are one Igris.
//
//   idle       lit and still (breathing, at hero size)
//   listening  steel — the voice coming in
//   thinking   tungsten, the stroke circling
//   speaking   tungsten, the stroke circling (igris-app's "answering")

const STATE: Record<IgrisStatus, LoaderState> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'answering',
}

export function IgrisCore({ status, size = 320 }: { status: IgrisStatus; size?: number }) {
  const hero = size >= 120
  const rgb = CORE[status].rgb
  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: `min(${size}px, 80vw)`, height: `min(${size}px, 80vw)`, ['--core-rgb']: rgb } as CSSProperties}
    >
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(${rgb},0.22) 0%, rgba(${rgb},0.06) 45%, transparent 70%)` }}
        animate={{ opacity: status === 'idle' ? 0.7 : [0.7, 1, 0.7] }}
        transition={status === 'idle' ? { duration: 0.6 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <IgrisLoader state={STATE[status]} size={Math.round(size * (hero ? 0.48 : 0.62))} breathe={hero} />
    </div>
  )
}
