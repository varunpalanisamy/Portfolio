'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { experiences, education } from '@/data/experience'
import { useAudio } from './AudioEngine'
import WaveformBar from './WaveformBar'

export default function Experience() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px' })
  const { setCurrentSection } = useAudio()

  useEffect(() => {
    if (isInView) setCurrentSection('experience')
  }, [isInView, setCurrentSection])

  return (
    <section id="experience" ref={ref} className="relative min-h-screen py-32 px-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 100% 50%, rgba(139,92,246,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <StemHeader stem="DRUMS" label="Experience" color="#8B5CF6" index="02" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="font-grotesk text-white/40 text-sm mt-4 mb-16 max-w-lg tracking-wide"
        >
          The rhythm of my career — each beat pushing forward.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Timeline */}
          <div className="lg:col-span-2 relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px timeline-line opacity-30" />

            <div className="space-y-10">
              {experiences.map((exp, i) => (
                <ExperienceCard key={exp.id} exp={exp} index={i} />
              ))}
            </div>
          </div>

          {/* Education card */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="sticky top-24 p-6 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(139,92,246,0.2)',
                boxShadow: 'inset 0 0 30px rgba(139,92,246,0.03)',
              }}
            >
              <div className="font-orbitron text-[10px] tracking-[0.3em] text-purple/60 mb-4">EDUCATION</div>
              <h3 className="font-orbitron font-bold text-white text-base mb-1">
                {education.school}
              </h3>
              <p className="font-grotesk text-purple text-sm mb-1">{education.degree}</p>
              <p className="font-grotesk text-white/40 text-xs mb-4">{education.period}</p>

              <div className="h-px bg-gradient-to-r from-purple/30 to-transparent mb-4" />

              <div className="font-orbitron text-[9px] tracking-widest text-white/30 mb-3">
                RELEVANT COURSEWORK
              </div>
              <div className="flex flex-wrap gap-2">
                {education.courses.map(c => (
                  <span
                    key={c}
                    className="px-2 py-0.5 rounded text-[10px] font-orbitron tracking-wide"
                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8B5CF6' }}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-purple/10">
                <div className="font-orbitron text-[9px] tracking-widest text-white/30 mb-3">LOCATION</div>
                <p className="font-grotesk text-white/50 text-sm">{education.location}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mt-24">
        <WaveformBar height={40} color="#8B5CF6" barCount={60} className="opacity-30" />
      </div>
    </section>
  )
}

function ExperienceCard({ exp, index }: { exp: typeof experiences[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-16"
    >
      {/* Timeline dot */}
      <div
        className="absolute left-4 top-1 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 z-10"
        style={{
          borderColor: exp.color,
          background: exp.current ? exp.color : 'var(--bg)',
          boxShadow: exp.current ? `0 0 12px ${exp.color}` : 'none',
        }}
      />

      <div
        className="p-5 rounded-xl transition-all duration-300 hover:bg-white/[0.03]"
        style={{ border: `1px solid ${exp.color}15` }}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-orbitron font-bold text-white text-sm">{exp.company}</h3>
              {exp.current && (
                <span
                  className="px-2 py-0.5 rounded-full font-orbitron text-[9px] tracking-widest"
                  style={{ background: `${exp.color}20`, color: exp.color }}
                >
                  CURRENT
                </span>
              )}
            </div>
            <p className="font-grotesk text-sm mt-0.5" style={{ color: exp.color }}>
              {exp.role}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-orbitron text-[10px] tracking-wider text-white/40">{exp.period}</p>
            <p className="font-grotesk text-xs text-white/30 mt-0.5">{exp.location}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {exp.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: exp.color }} />
              <span className="font-grotesk text-xs text-white/50 leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {exp.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded font-orbitron text-[9px] tracking-wider"
              style={{
                background: `${exp.color}08`,
                border: `1px solid ${exp.color}15`,
                color: `${exp.color}70`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
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
