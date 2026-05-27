'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useAudio } from './AudioEngine'
import WaveformBar from './WaveformBar'

const HeroScene = dynamic(() => import('./three/HeroScene'), { ssr: false })

const name = 'VARUN PALANISAMY'

export default function Hero() {
  const { isPlaying, toggle } = useAudio()

  return (
    <section
      id="hero"
      className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden grid-bg scanline"
    >
      {/* Radial glow behind 3D */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,245,255,0.06) 0%, transparent 70%)',
        }}
      />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <HeroScene />
      </div>

      {/* Text content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex items-center gap-3"
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan" />
          <span className="font-orbitron text-xs tracking-[0.3em] text-cyan uppercase">
            Full Stack · AI · Game Design
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan" />
        </motion.div>

        {/* Name */}
        <div className="flex flex-wrap justify-center gap-x-[0.15em]">
          {name.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: 0.5 + i * 0.04,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`font-orbitron font-black text-4xl md:text-6xl lg:text-7xl tracking-wider ${
                char === ' ' ? 'w-4' : ''
              }`}
              style={{
                color: char === ' ' ? 'transparent' : 'white',
                textShadow:
                  i % 5 === 0
                    ? '0 0 30px rgba(0,245,255,0.6)'
                    : i % 5 === 2
                    ? '0 0 30px rgba(139,92,246,0.6)'
                    : 'none',
              }}
            >
              {char === ' ' ? ' ' : char}
            </motion.span>
          ))}
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="font-grotesk text-white/50 text-lg md:text-xl max-w-md tracking-wide"
        >
          CS: Game Design @ UCSC · Building impactful tech at the intersection of creativity and logic
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.8 }}
          className="flex items-center gap-4 mt-2"
        >
          <a
            href="#projects"
            className="px-6 py-3 font-orbitron text-xs tracking-widest uppercase bg-cyan/10 border border-cyan/40 text-cyan rounded-full hover:bg-cyan/20 hover:border-cyan transition-all duration-300 glow-cyan"
          >
            View Projects
          </a>
          <button
            onClick={toggle}
            className="px-6 py-3 font-orbitron text-xs tracking-widest uppercase border border-white/10 text-white/40 rounded-full hover:border-white/30 hover:text-white/70 transition-all duration-300 flex items-center gap-2"
          >
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan animate-pulse' : 'bg-white/30'}`} />
            {isPlaying ? 'Playing' : 'Play Music'}
          </button>
        </motion.div>
      </div>

      {/* Waveform at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-0 left-0 right-0 z-10"
      >
        <WaveformBar height={50} color="#00F5FF" barCount={80} />
        <div className="h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="absolute bottom-20 right-8 flex flex-col items-center gap-2 z-10"
      >
        <span className="font-orbitron text-[10px] tracking-widest text-white/30 rotate-90 mb-4">SCROLL</span>
        <div className="w-px h-12 bg-gradient-to-b from-cyan/50 to-transparent" />
      </motion.div>

      {/* UCSC badge */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-24 left-8 font-orbitron text-[10px] tracking-widest text-white/20 z-10"
      >
        UC SANTA CRUZ · 2026
      </motion.div>
    </section>
  )
}
