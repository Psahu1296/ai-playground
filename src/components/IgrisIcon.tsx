import { motion } from 'framer-motion'

interface IgrisIconProps {
  className?: string
  size?: number
  showGlow?: boolean
  interactive?: boolean
}

export function IgrisIcon({ className = 'w-9 h-9', size, showGlow = true, interactive = true }: IgrisIconProps) {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center shrink-0 group ${className}`}
      style={style}
      whileHover={interactive ? { scale: 1.08, rotate: [0, -2, 2, 0] } : undefined}
      whileTap={interactive ? { scale: 0.94 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {/* Ambient Monarch Pulse Glow */}
      {showGlow && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/50 via-purple-600/40 to-rose-600/50 blur-xl rounded-full animate-pulse pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute inset-0 bg-red-500/30 blur-md rounded-full group-hover:opacity-100 opacity-70 transition-opacity duration-300 pointer-events-none" />
        </>
      )}

      {/* High-Res Igris Split Emblem PNG */}
      <img
        src="/igris-logo.png"
        alt="Igris Logo"
        className="w-full h-full object-contain relative z-10 rounded-full drop-shadow-[0_0_18px_rgba(239,68,68,0.6)] border border-red-500/30 group-hover:border-red-500/70 transition-all duration-300"
      />
    </motion.div>
  )
}
