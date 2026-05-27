'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { skills } from '@/data/experience'
import { useAudio } from './AudioEngine'
import WaveformBar from './WaveformBar'

const skillCategories = [
  { label: 'Languages', items: skills.languages, color: '#FF006E' },
  { label: 'Frameworks', items: skills.frameworks, color: '#00F5FF' },
  { label: 'Tools & Cloud', items: skills.tools, color: '#8B5CF6' },
  { label: 'AI & Data', items: skills.ai, color: '#FF006E' },
]

export default function About() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px' })
  const { setCurrentSection } = useAudio()

  useEffect(() => {
    if (isInView) setCurrentSection('about')
  }, [isInView, setCurrentSection])

  return (
    <section id="about" ref={ref} className="relative min-h-screen py-32 px-6 grid-bg overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 0% 50%, rgba(255,0,110,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <StemHeader stem="MELODY" label="About" color="#FF006E" index="03" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="font-grotesk text-white/40 text-sm mt-4 mb-16 max-w-lg tracking-wide"
        >
          The melody — what makes the music distinctly mine.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Bio side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Photo placeholder */}
            <div
              className="relative w-48 h-48 rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(255,0,110,0.2)', boxShadow: '0 0 30px rgba(255,0,110,0.1)' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(255,0,110,0.05)' }}>
                <span className="font-orbitron text-4xl font-black text-pink/40">VP</span>
                <span className="font-orbitron text-[9px] tracking-widest text-white/20">PHOTO COMING</span>
              </div>
              {/* Neon corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-pink" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-pink" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-pink" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-pink" />
            </div>

            <div className="space-y-4">
              <p className="font-grotesk text-white/70 text-base leading-relaxed">
                I&apos;m a Computer Science: Game Design student at UC Santa Cruz, graduating June 2026.
                I&apos;m passionate about building tech that sits at the intersection of{' '}
                <span className="text-pink">creativity</span> and <span className="text-cyan">logic</span>.
              </p>
              <p className="font-grotesk text-white/50 text-sm leading-relaxed">
                When I&apos;m not engineering at Itron or building AI apps, I&apos;m producing music.
                I used to play violin and piano, I&apos;ve produced tracks, and now I&apos;m building an
                AI DJ app — blending my two worlds.
              </p>
              <p className="font-grotesk text-white/50 text-sm leading-relaxed">
                My strengths live in full-stack development, ML/AI, and data engineering.
                I love shipping things that are both functional and meaningful.
              </p>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/varunpalanisamy"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full font-orbitron text-[10px] tracking-widest text-pink/60 hover:text-pink transition-colors border border-pink/20 hover:border-pink/50"
              >
                GitHub
              </a>
              <a
                href="mailto:varun.palanisamy@gmail.com"
                className="px-4 py-2 rounded-full font-orbitron text-[10px] tracking-widest text-white/30 hover:text-white/70 transition-colors border border-white/10 hover:border-white/30"
              >
                Email
              </a>
            </div>
          </motion.div>

          {/* Skills side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-8"
          >
            {skillCategories.map((cat, ci) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: ci * 0.1 + 0.4 }}
              >
                <div
                  className="font-orbitron text-[10px] tracking-[0.3em] mb-3"
                  style={{ color: `${cat.color}70` }}
                >
                  {cat.label.toUpperCase()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item, ii) => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: ci * 0.05 + ii * 0.03 + 0.5 }}
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1 rounded-full font-grotesk text-xs transition-all duration-200"
                      style={{
                        background: `${cat.color}08`,
                        border: `1px solid ${cat.color}20`,
                        color: `${cat.color}80`,
                      }}
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="mt-24">
        <WaveformBar height={40} color="#FF006E" barCount={60} className="opacity-30" />
      </div>
    </section>
  )
}

function StemHeader({ stem, label, color, index }: { stem: string; label: string; color: string; index: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="flex items-start gap-6"
    >
      <div className="flex flex-col items-center gap-2 mt-1">
        <span className="font-orbitron text-[10px] tracking-[0.3em]" style={{ color: `${color}60` }}>{index}</span>
        <div className="w-px h-16" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
      </div>
      <div>
        <div
          className="inline-block font-orbitron text-[10px] tracking-[0.4em] uppercase px-3 py-1 rounded-full mb-3"
          style={{ background: `${color}10`, border: `1px solid ${color}20`, color: `${color}80` }}
        >
          ♪ {stem}
        </div>
        <h2 className="font-orbitron font-black text-4xl md:text-6xl tracking-wider" style={{ color }}>
          {label}
        </h2>
      </div>
    </motion.div>
  )
}
