import { useId } from 'react'
import { motion } from 'framer-motion'
import { LOGO } from './igrisMark'

interface IgrisIconProps {
  className?: string
  size?: number
  showGlow?: boolean
  interactive?: boolean
}

/** The bare mark: an amber metal crown with a white-hot core — the same SVG as igris-app's icon. */
export function IgrisMark({ className = 'w-full h-full' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox={LOGO.viewBox} className={className} aria-hidden>
      <defs>
        {/* #FFB338 at 42%: the mark's optical centre still reads as Igris's tungsten. */}
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE0A3" />
          <stop offset="0.42" stopColor="#FFB338" />
          <stop offset="1" stopColor="#A9661A" />
        </linearGradient>
      </defs>
      <path d={LOGO.crown.d} fill={`url(#${id}-metal)`} />
      <path d={LOGO.flame.d} fill="#FFF3D6" />
    </svg>
  )
}

export function IgrisIcon({ className = 'w-9 h-9', size, showGlow = true, interactive = true }: IgrisIconProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center shrink-0 group ${className}`}
      style={style}
      whileHover={interactive ? { scale: 1.06 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {/* Kerosene, not neon: one soft warm glow behind the mark (ICON_BRIEF.md). */}
      {showGlow && (
        <div className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(255,179,56,0.28),transparent_65%)] blur-md pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      <IgrisMark className="w-[82%] h-[82%] relative z-10 drop-shadow-[0_0_10px_rgba(255,179,56,0.35)]" />
    </motion.div>
  )
}
