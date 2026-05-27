'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useAudio } from './AudioEngine'

const posts = [
  {
    id: 1,
    title: 'Building an AI DJ: Merging Music Theory with Machine Learning',
    excerpt: 'How I combined my background as a music producer with ML to build something that actually understands groove.',
    tag: 'AI · Music',
    color: '#00F5FF',
    date: 'Coming Soon',
  },
  {
    id: 2,
    title: 'From Violin to Vector Databases: My Journey in Tech',
    excerpt: 'What playing classical music taught me about engineering — patterns, precision, and the beauty of constraints.',
    tag: 'Personal',
    color: '#8B5CF6',
    date: 'Coming Soon',
  },
  {
    id: 3,
    title: 'Winning HackDavis with BrailleOut: A Postmortem',
    excerpt: 'The 24-hour sprint that turned a napkin idea into a hardware+AI accessibility device. What worked, what didn\'t.',
    tag: 'Hackathon',
    color: '#FF006E',
    date: 'Coming Soon',
  },
  {
    id: 4,
    title: 'Why Game Design Changed How I Think About Software',
    excerpt: 'Studying game design alongside CS gave me a fundamentally different lens for UX, systems, and player psychology.',
    tag: 'Engineering',
    color: '#00F5FF',
    date: 'Coming Soon',
  },
]

export default function Blog() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px' })
  const { setCurrentSection } = useAudio()

  useEffect(() => {
    if (isInView) setCurrentSection('blog')
  }, [isInView, setCurrentSection])

  return (
    <section id="blog" ref={ref} className="relative min-h-screen py-32 px-6 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,245,255,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <StemHeader stem="VOCALS" label="Writing" color="#00F5FF" index="04" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="font-grotesk text-white/40 text-sm mt-4 mb-16 max-w-lg tracking-wide"
        >
          The vocals — my voice, thoughts, and stories.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${post.color}15`,
              }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top, ${post.color}08, transparent 60%)` }}
              />

              <div className="flex items-start justify-between mb-4">
                <span
                  className="px-2 py-0.5 rounded font-orbitron text-[10px] tracking-widest"
                  style={{ background: `${post.color}10`, border: `1px solid ${post.color}20`, color: post.color }}
                >
                  {post.tag}
                </span>
                <span className="font-orbitron text-[10px] tracking-widest text-white/20">{post.date}</span>
              </div>

              <h3 className="font-orbitron font-bold text-white text-base mb-3 leading-snug tracking-wide group-hover:text-cyan transition-colors">
                {post.title}
              </h3>

              <p className="font-grotesk text-white/40 text-sm leading-relaxed">{post.excerpt}</p>

              <div className="mt-6 flex items-center gap-2">
                <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${post.color}20, transparent)` }} />
                <span className="font-orbitron text-[10px] tracking-widest text-white/20 group-hover:text-cyan/50 transition-colors">
                  READ →
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="mt-32 pt-8 border-t border-white/5 text-center"
      >
        <p className="font-orbitron text-[10px] tracking-[0.4em] text-white/20">
          VARUN PALANISAMY · {new Date().getFullYear()} · BUILT WITH NEXT.JS & THREE.JS
        </p>
        <div className="mt-4 flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
        </div>
      </motion.footer>
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
