'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { projects } from '@/data/projects'
import { useAudio } from './AudioEngine'
import WaveformBar from './WaveformBar'

export default function Projects() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px' })
  const { setCurrentSection } = useAudio()

  useEffect(() => {
    if (isInView) setCurrentSection('projects')
  }, [isInView, setCurrentSection])

  return (
    <section id="projects" ref={ref} className="relative min-h-screen py-32 px-6 grid-bg overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,245,255,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <StemHeader stem="BASS" label="Projects" color="#00F5FF" index="01" />

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-grotesk text-white/40 text-sm mt-4 mb-16 max-w-lg tracking-wide"
        >
          The foundation — projects that define my technical range and creativity.
        </motion.p>

        {/* Projects grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>

      {/* Waveform divider */}
      <div className="mt-24">
        <WaveformBar height={40} color="#00F5FF" barCount={60} className="opacity-30" />
      </div>
    </section>
  )
}

function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="project-card relative p-6 rounded-2xl neon-border-cyan bg-white/[0.02] group"
      style={{ borderColor: `${project.color}30` }}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${project.accentColor}, transparent 60%)` }}
      />

      {/* Award badge */}
      {project.award && (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-orbitron tracking-widest mb-4"
          style={{
            background: `${project.color}15`,
            border: `1px solid ${project.color}30`,
            color: project.color,
          }}
        >
          {project.award}
        </div>
      )}

      {/* Title */}
      <h3
        className="font-orbitron font-bold text-xl mb-3 tracking-wide"
        style={{ color: project.color }}
      >
        {project.title}
      </h3>

      {/* Description */}
      <p className="font-grotesk text-white/60 text-sm leading-relaxed mb-5">
        {project.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded text-[10px] font-orbitron tracking-wider"
            style={{
              background: `${project.color}10`,
              border: `1px solid ${project.color}20`,
              color: `${project.color}99`,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Links */}
      <div className="flex items-center gap-4">
        <a
          href={project.github}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-orbitron text-[11px] tracking-widest transition-all duration-300"
          style={{ color: `${project.color}80` }}
          onMouseEnter={e => (e.currentTarget.style.color = project.color)}
          onMouseLeave={e => (e.currentTarget.style.color = `${project.color}80`)}
        >
          <GitHubIcon />
          GitHub
        </a>
        {project.demo && (
          <a
            href={project.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-orbitron text-[11px] tracking-widest text-white/30 hover:text-white/70 transition-colors"
          >
            <ExternalIcon />
            Live Demo
          </a>
        )}
        <span className="ml-auto font-orbitron text-[10px] tracking-widest text-white/20">
          {project.year}
        </span>
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
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-6"
    >
      <div className="flex flex-col items-center gap-2 mt-1">
        <span className="font-orbitron text-[10px] tracking-[0.3em]" style={{ color: `${color}60` }}>
          {index}
        </span>
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

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  )
}
