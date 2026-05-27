'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAudio } from './AudioEngine'

const navLinks = [
  { label: 'Projects', href: '#projects', stem: 'Bass' },
  { label: 'Experience', href: '#experience', stem: 'Drums' },
  { label: 'About', href: '#about', stem: 'Melody' },
  { label: 'Blog', href: '#blog', stem: 'Vocals' },
]

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const { isPlaying, toggle } = useAudio()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-bg/80 backdrop-blur-xl border-b border-cyan/10' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="font-orbitron text-sm font-bold tracking-widest text-glow-cyan text-cyan">
          VP
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative font-grotesk text-xs tracking-widest uppercase text-white/60 hover:text-cyan transition-colors duration-300"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-cyan group-hover:w-full transition-all duration-300" />
              <span className="absolute -top-4 left-0 text-[9px] text-cyan/40 font-orbitron tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                {link.stem}
              </span>
            </a>
          ))}
        </div>

        {/* Audio toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan/20 hover:border-cyan/60 transition-all duration-300 group"
        >
          <WaveformIcon playing={isPlaying} />
          <span className="font-orbitron text-[10px] tracking-widest text-cyan/60 group-hover:text-cyan transition-colors">
            {isPlaying ? 'LIVE' : 'PLAY'}
          </span>
        </button>
      </div>

      {/* Bottom scan line */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
    </motion.nav>
  )
}

function WaveformIcon({ playing }: { playing: boolean }) {
  const bars = [3, 5, 8, 5, 3, 7, 4]
  return (
    <div className="flex items-end gap-px h-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-0.5 bg-cyan rounded-full"
          style={{
            height: playing ? `${h * 2}px` : '3px',
            transition: 'height 0.3s ease',
            animationDelay: `${i * 0.1}s`,
            ...(playing ? {
              animation: `waveBar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
            } : {}),
          }}
        />
      ))}
    </div>
  )
}
