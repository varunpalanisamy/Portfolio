'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useCallback, type CSSProperties, type PointerEvent } from 'react'
import { BattleScreen } from './BattleScreen'
import { projects } from '@/data/projects'
import { education, experiences, skills } from '@/data/experience'

const HD2DWorld       = dynamic(() => import('./hd2d/HD2DWorld'),        { ssr: false })
const PCInteriorScene = dynamic(() => import('./PCInteriorScene'),        { ssr: false })
const SwitchInteriorScene = dynamic(() => import('./SwitchInteriorScene'), { ssr: false })
const ExperienceHealingStation = dynamic(() => import('./ExperienceHealingStation'), { ssr: false })

type PortfolioBuildingId = 'projects' | 'about' | 'experience'
type NearbyBuilding = {
  id: PortfolioBuildingId
  label: string
  shortLabel: string
  prompt: string
  color: string
}
type IntroPhase = 'opening' | 'card-opening' | 'card' | 'ready' | 'spawn' | 'waiting-move' | 'revealing' | 'done'
type IntroBallStage = 'closed' | 'opening' | 'open'

const ZONE_META: Record<string, { label:string; color:string }> = {
  hub:        { label:'EXPLORE THE WORLD',    color:'#ffffff' },
  projects:   { label:'PROJECTS',             color:'#FF006E' },
  experience: { label:'MUSICAL THEATER',      color:'#FFD700' },
  about:      { label:'POKÉMON CENTER',       color:'#00F5FF' },
  contact:    { label:'CONTACT',              color:'#A78BFA' },
}

function PortfolioPanel({
  section,
  onClose,
}: {
  section: Exclude<PortfolioBuildingId, 'about'>
  onClose: () => void
}) {
  const isProjects = section === 'projects'
  const title = isProjects ? 'Projects Stadium' : 'Musical Theater'
  const accent = isProjects ? '#FF006E' : '#FFD700'
  const eyebrow = isProjects ? 'BUILDING 01 / SHOWCASE' : 'BUILDING 03 / TIMELINE'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{ background:'rgba(5, 7, 10, 0.76)', backdropFilter:'blur(10px)' }}>
      <div className="w-full max-w-5xl max-h-[86vh] overflow-hidden rounded-lg"
        style={{ background:'rgba(10,12,18,0.94)', border:`1px solid ${accent}55`, boxShadow:`0 0 36px ${accent}18` }}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b"
          style={{ borderColor:`${accent}30` }}>
          <div>
            <p className="font-mono text-[9px] tracking-[0.34em] mb-1" style={{ color:`${accent}aa` }}>{eyebrow}</p>
            <h2 className="font-mono text-2xl font-bold tracking-widest text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md font-mono text-[10px] tracking-[0.2em] font-bold"
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.72)' }}
          >
            ESC / EXIT
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {isProjects ? (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <article key={project.id} className="rounded-lg p-4"
                  style={{ background:'rgba(255,255,255,0.045)', border:`1px solid ${project.color}44` }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-[9px] tracking-[0.25em]" style={{ color:project.color }}>{project.year}</p>
                      <h3 className="font-mono text-lg font-bold text-white">{project.title}</h3>
                    </div>
                    {project.award && <span className="font-mono text-[9px]" style={{ color:'#FFD700' }}>{project.award}</span>}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color:'rgba(255,255,255,0.68)' }}>{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded font-mono text-[9px]"
                        style={{ background:project.accentColor, color:'rgba(255,255,255,0.76)' }}>{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-3 font-mono text-[10px] tracking-[0.18em]">
                    <a href={project.github} target="_blank" rel="noreferrer" style={{ color:project.color }}>GITHUB</a>
                    {project.demo && <a href={project.demo} target="_blank" rel="noreferrer" style={{ color:project.color }}>DEMO</a>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_0.82fr] gap-5">
              <div className="space-y-4">
                {experiences.map((experience) => (
                  <article key={experience.id} className="rounded-lg p-4"
                    style={{ background:'rgba(255,255,255,0.045)', border:`1px solid ${experience.color}40` }}>
                    <p className="font-mono text-[9px] tracking-[0.25em]" style={{ color:experience.color }}>{experience.period}</p>
                    <h3 className="font-mono text-lg font-bold text-white">{experience.role}</h3>
                    <p className="font-mono text-xs mb-3" style={{ color:'rgba(255,255,255,0.44)' }}>{experience.company} / {experience.location}</p>
                    <p className="text-sm leading-relaxed" style={{ color:'rgba(255,255,255,0.68)' }}>{experience.bullets[0]}</p>
                  </article>
                ))}
              </div>
              <aside className="rounded-lg p-4 h-fit"
                style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.24)' }}>
                <p className="font-mono text-[9px] tracking-[0.3em] mb-3" style={{ color:'#FFD700' }}>TRAINER CARD</p>
                <h3 className="font-mono text-lg font-bold text-white mb-2">{education.school}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color:'rgba(255,255,255,0.65)' }}>
                  {education.degree}. Expected graduation: {education.period}.
                </p>
                <div className="space-y-3">
                  {Object.entries(skills).map(([group, values]) => (
                    <div key={group}>
                      <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-1" style={{ color:'rgba(255,255,255,0.38)' }}>{group}</p>
                      <p className="text-xs leading-relaxed" style={{ color:'rgba(255,255,255,0.68)' }}>{values.slice(0, 8).join(' / ')}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t" style={{ borderColor:'rgba(255,215,0,0.18)' }}>
                  <p className="font-mono text-[9px] tracking-[0.3em] mb-3" style={{ color:'#FFD700' }}>CONTACT KIOSK</p>
                  <div className="flex flex-wrap gap-3 font-mono text-[10px] tracking-[0.18em]">
                    <a href="mailto:varun.palanisamy@gmail.com" style={{ color:'#FFD700' }}>EMAIL</a>
                    <a href="https://github.com/varunpalanisamy" target="_blank" rel="noreferrer" style={{ color:'#FFD700' }}>GITHUB</a>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TiltCardImage({
  width,
  maxHeight,
  animation,
  filter,
}: {
  width: string
  maxHeight: string
  animation: string
  filter: string
}) {
  const tiltRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const tiltLayer = tiltRef.current
    if (!tiltLayer) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 28
    const rotateX = (0.5 - y) * 18

    tiltLayer.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`)
    tiltLayer.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`)
    tiltLayer.style.setProperty('--card-glow-x', `${(x * 100).toFixed(1)}%`)
    tiltLayer.style.setProperty('--card-glow-y', `${(y * 100).toFixed(1)}%`)
    tiltLayer.style.setProperty('--card-glow-opacity', '0.32')
    tiltLayer.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.018)`
  }, [])

  const handlePointerLeave = useCallback(() => {
    const tiltLayer = tiltRef.current
    if (!tiltLayer) return
    tiltLayer.style.setProperty('--card-rotate-x', '0deg')
    tiltLayer.style.setProperty('--card-rotate-y', '0deg')
    tiltLayer.style.setProperty('--card-glow-opacity', '0')
    tiltLayer.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)'
  }, [])

  const wrapperStyle = {
    width,
    maxHeight,
    animation,
    filter,
    perspective: '900px',
  } as CSSProperties

  const tiltStyle = {
    '--card-rotate-x': '0deg',
    '--card-rotate-y': '0deg',
    '--card-glow-x': '50%',
    '--card-glow-y': '35%',
    '--card-glow-opacity': '0',
    transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)',
    transformStyle: 'preserve-3d',
    transition: 'transform 120ms ease-out, filter 160ms ease-out',
    willChange: 'transform',
  } as CSSProperties

  return (
    <div
      className="relative select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={wrapperStyle}
    >
      <div ref={tiltRef} className="relative" style={tiltStyle}>
        <img
          src="/about-card.png"
          alt="Varun Palanisamy supporter card"
          className="block w-full h-auto select-none"
          draggable={false}
          style={{
            maxHeight,
            objectFit: 'contain',
            transform: 'translateZ(22px)',
          }}
        />
        <div
          className="absolute inset-0 rounded-[4%] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at var(--card-glow-x) var(--card-glow-y), rgba(255,255,255,0.58), rgba(255,245,155,0.18) 18%, transparent 46%)',
            mixBlendMode: 'screen',
            opacity: 'var(--card-glow-opacity)',
            transition: 'opacity 180ms ease-out',
            transform: 'translateZ(26px)',
          }}
        />
      </div>
    </div>
  )
}

function AboutCardOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 z-[55] flex items-center justify-center px-4 py-7"
      style={{
        background:
          'radial-gradient(ellipse 70% 70% at 50% 44%, rgba(255,225,95,0.16), transparent 58%), rgba(0,0,0,0.76)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        aria-label="Close about card"
      />
      <TiltCardImage
        width="min(74vw, 430px)"
        maxHeight="86vh"
        animation="aboutCardReveal 620ms cubic-bezier(0.16, 1, 0.3, 1) both"
        filter="drop-shadow(0 24px 46px rgba(0,0,0,0.55))"
      />
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full pointer-events-none font-mono text-[10px] tracking-[0.22em] font-bold"
        style={{
          background: 'rgba(0,0,0,0.52)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
        }}
      >
        SPACE TO CLOSE
      </div>
      <style jsx>{`
        @keyframes aboutCardReveal {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.74) rotateX(18deg);
          }
          58% {
            opacity: 1;
            transform: translateY(-6px) scale(1.025) rotateX(0deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
          }
        }
      `}</style>
    </div>
  )
}

function IntroCinematicOverlay({
  phase,
  onAdvance,
}: {
  phase: IntroPhase
  onAdvance: () => void
}) {
  if (phase === 'done') return null

  const revealPhase = phase === 'spawn' || phase === 'waiting-move' || phase === 'revealing'
  const prompt =
    phase === 'card'
      ? 'PRESS ANY KEY TO PUT CARD AWAY'
      : phase === 'ready'
        ? 'PRESS ANY KEY TO BEGIN'
        : phase === 'waiting-move'
          ? 'MOVE SNIVY TO REVEAL THE WORLD'
          : ''
  const clickToAdvance = phase === 'opening' || phase === 'card' || phase === 'ready'

  return (
    <>
      {clickToAdvance && (
        <button
          className="absolute inset-0 z-[57] cursor-default"
          onClick={onAdvance}
          aria-label="Advance intro"
          style={{ background: 'transparent' }}
        />
      )}


      {phase === 'card' && (
        <div
          className="absolute inset-0 z-[58] flex items-center justify-center px-4 py-7"
          style={{
            background:
              'radial-gradient(ellipse 62% 62% at 50% 48%, rgba(255,221,84,0.14), transparent 58%), rgba(0,0,0,0.78)',
            backdropFilter: 'blur(5px)',
          }}
          onClick={onAdvance}
        >
          <TiltCardImage
            width="min(72vw, 440px)"
            maxHeight="86vh"
            animation="introCardReveal 700ms cubic-bezier(0.16, 1, 0.3, 1) both"
            filter="drop-shadow(0 24px 50px rgba(0,0,0,0.68))"
          />
        </div>
      )}

      {prompt && (
        <div
          className="absolute bottom-8 left-1/2 z-[62] -translate-x-1/2 pointer-events-none px-5 py-2.5 rounded-full font-mono text-[10px] font-bold tracking-[0.24em]"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: phase === 'waiting-move' ? '#00F5FF' : 'rgba(255,255,255,0.82)',
            boxShadow: phase === 'waiting-move' ? '0 0 24px rgba(0,245,255,0.14)' : '0 12px 30px rgba(0,0,0,0.32)',
          }}
        >
          {prompt}
        </div>
      )}

      <style jsx global>{`
        @keyframes introCardReveal {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.62) rotateX(18deg);
          }
          60% {
            opacity: 1;
            transform: translateY(-8px) scale(1.035) rotateX(0deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotateX(0deg);
          }
        }
      `}</style>
    </>
  )
}

function ExperienceHealingDashboard({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(0)
  const [joyLane, setJoyLane] = useState(1)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openedIds, setOpenedIds] = useState<Record<string, boolean>>({})
  const timerRef = useRef<number | null>(null)

  const selectedExperience = experiences[selected]
  const selectedOpened = Boolean(openedIds[selectedExperience.id])
  const joyTop = 83 + selected * 112
  const joyLeft = joyLane === 1 ? 126 : 34

  const openSelectedBall = useCallback(() => {
    if (openingId) return
    const experience = experiences[selected]
    if (openedIds[experience.id]) return

    setJoyLane(1)
    setOpeningId(experience.id)
    timerRef.current = window.setTimeout(() => {
      setOpenedIds((current) => ({ ...current, [experience.id]: true }))
      setOpeningId(null)
    }, 430)
  }, [openedIds, openingId, selected])

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright' ||
        key === 'w' ||
        key === 'a' ||
        key === 's' ||
        key === 'd' ||
        key === ' ' ||
        key === 'enter' ||
        key === 'escape'
      ) {
        event.preventDefault()
      }

      if (key === 'escape') {
        onClose()
        return
      }
      if (key === 'arrowup' || key === 'w') {
        setSelected((value) => Math.max(0, value - 1))
        return
      }
      if (key === 'arrowdown' || key === 's') {
        setSelected((value) => Math.min(experiences.length - 1, value + 1))
        return
      }
      if (key === 'arrowleft' || key === 'a') {
        setJoyLane(0)
        return
      }
      if (key === 'arrowright' || key === 'd') {
        setJoyLane(1)
        return
      }
      if (key === ' ' || key === 'enter') {
        openSelectedBall()
      }
    }

    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [onClose, openSelectedBall])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center px-4 py-6"
      style={{
        background:
          'radial-gradient(ellipse 72% 62% at 50% 48%, rgba(0,245,255,0.08), transparent 62%), rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative grid w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-md"
        style={{
          gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)',
          background: 'rgba(5,8,13,0.96)',
          border: '2px solid rgba(0,245,255,0.58)',
          boxShadow: '0 0 0 4px rgba(0,245,255,0.07), 0 0 42px rgba(0,245,255,0.18)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.18em]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.68)',
          }}
        >
          ESC BACK
        </button>

        <section
          className="relative min-h-[620px] px-5 py-5"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,245,255,0.07), rgba(0,245,255,0.015)), rgba(0,0,0,0.28)',
            borderRight: '1px solid rgba(0,245,255,0.26)',
          }}
        >
          <p className="font-mono text-[9px] font-bold tracking-[0.36em]" style={{ color: 'rgba(255,155,181,0.82)' }}>
            NURSE JOY TERMINAL
          </p>
          <h2 className="mt-2 font-mono text-2xl font-black tracking-[0.18em] text-white">
            EXP HEAL
          </h2>
          <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
            ARROWS MOVE JOY / SPACE HEALS / ESC BACK
          </p>

          <div
            className="absolute z-20"
            style={{
              left: joyLeft,
              top: joyTop,
              width: 68,
              height: 72,
              backgroundImage: 'url(/nursejoy.png)',
              backgroundSize: '400% 400%',
              backgroundPosition: '0 0',
              imageRendering: 'pixelated',
              transform: 'translate(-50%, -8px) scale(1.08)',
              filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.38))',
              transition: 'left 150ms steps(3), top 150ms steps(3)',
            }}
            aria-hidden="true"
          />

          <div className="mt-8 space-y-4">
            {experiences.map((experience, index) => {
              const selectedBall = index === selected
              const opening = openingId === experience.id
              const opened = Boolean(openedIds[experience.id])
              const ballSrc = opening
                ? '/about-pokeball-opening.png'
                : opened
                  ? '/about-pokeball-open.png'
                  : '/about-pokeball-closed.png'

              return (
                <div
                  key={experience.id}
                  className="relative h-24"
                  style={{
                    border: selectedBall ? `2px solid ${experience.color}` : '2px solid transparent',
                    background: selectedBall ? `${experience.color}10` : 'rgba(255,255,255,0.025)',
                    boxShadow: selectedBall ? `0 0 18px ${experience.color}25` : 'none',
                  }}
                >
                  <div
                    className="absolute left-[112px] top-1/2 flex h-[86px] w-[98px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{
                      filter: opening
                        ? `drop-shadow(0 0 16px ${experience.color})`
                        : selectedBall
                          ? `drop-shadow(0 0 10px ${experience.color}66)`
                          : 'drop-shadow(0 5px 0 rgba(0,0,0,0.35))',
                    }}
                  >
                    <img
                      src={ballSrc}
                      alt=""
                      draggable={false}
                      className={opening ? 'heal-ball-opening' : ''}
                      style={{
                        width: opened ? 82 : 76,
                        height: 'auto',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <div className="absolute left-[180px] right-3 top-1/2 -translate-y-1/2">
                    <p
                      className="font-mono text-[9px] font-bold tracking-[0.24em]"
                      style={{ color: selectedBall ? experience.color : 'rgba(255,255,255,0.34)' }}
                    >
                      BALL {String(index + 1).padStart(2, '0')}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs font-black tracking-[0.08em] text-white">
                      {opened ? experience.company : 'SEALED EXP'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="min-h-[620px] overflow-y-auto px-6 py-6 md:px-8">
          <div className="pr-24">
            <p className="font-mono text-[9px] font-bold tracking-[0.36em]" style={{ color: selectedExperience.color }}>
              EXPERIENCE STORAGE
            </p>
            <h2 className="mt-2 font-mono text-3xl font-black tracking-[0.15em] text-white">
              {selectedOpened ? selectedExperience.company : 'SELECT A POKEBALL'}
            </h2>
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.43)' }}>
              {selectedOpened
                ? `${selectedExperience.role} / ${selectedExperience.period}`
                : 'Move Nurse Joy to a ball and press space to heal it open.'}
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {experiences.map((experience, index) => {
              const opened = Boolean(openedIds[experience.id])
              const active = index === selected

              return (
                <article
                  key={experience.id}
                  className="rounded-sm p-4"
                  style={{
                    background: opened ? `${experience.color}0d` : 'rgba(255,255,255,0.035)',
                    border: active ? `2px solid ${experience.color}` : `1px solid ${opened ? `${experience.color}45` : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: active ? `0 0 28px ${experience.color}1f` : 'none',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] font-bold tracking-[0.24em]" style={{ color: opened ? experience.color : 'rgba(255,255,255,0.28)' }}>
                        {opened ? experience.period : `POKEBALL ${String(index + 1).padStart(2, '0')}`}
                      </p>
                      <h3 className="mt-1 font-mono text-lg font-black text-white">
                        {opened ? experience.role : 'Experience sealed'}
                      </h3>
                      <p className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.46)' }}>
                        {opened ? `${experience.company} / ${experience.location}` : 'Press space while selected to reveal.'}
                      </p>
                    </div>
                    <span
                      className="px-2 py-1 font-mono text-[9px] font-bold tracking-[0.18em]"
                      style={{
                        background: opened ? `${experience.color}18` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${opened ? `${experience.color}45` : 'rgba(255,255,255,0.1)'}`,
                        color: opened ? experience.color : 'rgba(255,255,255,0.28)',
                      }}
                    >
                      {opened ? 'HEALED' : 'LOCKED'}
                    </span>
                  </div>

                  {opened && (
                    <>
                      <ul className="mt-4 space-y-2">
                        {experience.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.68)' }}>
                            <span className="mt-2 h-1.5 w-1.5 shrink-0" style={{ background: experience.color }} />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {experience.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 font-mono text-[9px] font-bold"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: `1px solid ${experience.color}30`,
                              color: 'rgba(255,255,255,0.72)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </div>

      <style jsx>{`
        .heal-ball-opening {
          animation: healBallOpen 430ms steps(4) both;
        }
        @keyframes healBallOpen {
          0% {
            opacity: 0.82;
            transform: translateY(0) scale(0.96);
          }
          28% {
            opacity: 1;
            transform: translateY(-7px) scale(1.18);
          }
          64% {
            opacity: 1;
            transform: translateY(2px) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default function PokemonGame() {
  const [started,    setStarted   ] = useState(false)
  const [introPhase, setIntroPhase] = useState<IntroPhase>('opening')
  const [introBallStage, setIntroBallStage] = useState<IntroBallStage>('closed')
  const [zone,       setZone      ] = useState('hub')
  const [battle,     setBattle    ] = useState(false)
  const [pcInterior, setPcInterior] = useState(false)
  const [switchInterior, setSwitchInterior] = useState(false)
  const [aboutCardOpen, setAboutCardOpen] = useState(false)
  const [experienceDashboardOpen, setExperienceDashboardOpen] = useState(false)
  const [nearBuilding, setNearBuilding] = useState<NearbyBuilding | null>(null)
  const [activePanel, setActivePanel] = useState<Exclude<PortfolioBuildingId, 'about'> | null>(null)
  const [fadeOut,    setFadeOut   ] = useState(false)  // black-flash transition

  const handleZone = useCallback((z: string) => setZone(z), [])
  const handleItem = useCallback((_type: 'project'|'job'|null, _index: number) => {}, [])

  const handleBattle = useCallback(() => {
    setBattle(true)
  }, [])

  const handleBattleClose = useCallback(() => {
    setBattle(false)
  }, [])

  // ── Portfolio buildings ──────────────────────────────────────────────────
  const handleBuildingNear = useCallback((near: boolean, building?: NearbyBuilding) => {
    setNearBuilding(near && building ? building : null)
  }, [])

  const handleEnterBuilding = useCallback((building: PortfolioBuildingId = 'about') => {
    // Brief black-flash before revealing interior
    setFadeOut(true)
    setTimeout(() => {
      if (building === 'about') {
        setPcInterior(true)
      } else if (building === 'experience') {
        setSwitchInterior(true)
      } else {
        setActivePanel(building)
      }
      setFadeOut(false)
    }, 380)
  }, [])

  const handleExitBuilding = useCallback(() => {
    setFadeOut(true)
    setTimeout(() => {
      setPcInterior(false)
      setSwitchInterior(false)
      setActivePanel(null)
      setAboutCardOpen(false)
      setExperienceDashboardOpen(false)
      setNearBuilding(null)
      setFadeOut(false)
    }, 380)
  }, [])

  useEffect(() => {
    const timers: number[] = []

    if (introPhase === 'opening') {
      setStarted(false)
      setIntroBallStage('closed')
    }

    if (introPhase === 'card-opening') {
      setIntroBallStage('opening')
      timers.push(window.setTimeout(() => setIntroBallStage('open'), 280))
      timers.push(window.setTimeout(() => setIntroPhase('card'), 380))
    }

    if (introPhase === 'card') {
      setIntroBallStage('open')
    }

    if (introPhase === 'ready') {
      setIntroBallStage('closed')
    }

    if (introPhase === 'spawn') {
      setStarted(true)
      setIntroBallStage('opening')
      timers.push(window.setTimeout(() => setIntroBallStage('open'), 620))
      timers.push(window.setTimeout(() => setIntroPhase('waiting-move'), 980))
    }

    if (introPhase === 'revealing') {
      timers.push(window.setTimeout(() => setIntroPhase('done'), 3400))
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [introPhase])

  useEffect(() => {
    if (introPhase === 'done') return

    const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])
    const handleIntroKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      const key = event.key.toLowerCase()

      if (introPhase === 'opening') {
        event.preventDefault()
        setIntroPhase('card-opening')
        return
      }

      if (introPhase === 'card') {
        event.preventDefault()
        setIntroBallStage('closed')
        setIntroPhase('ready')
        return
      }

      if (introPhase === 'ready') {
        event.preventDefault()
        setIntroPhase('spawn')
        return
      }

      if (introPhase === 'waiting-move' && movementKeys.has(key)) {
        setIntroPhase('revealing')
      }
    }

    window.addEventListener('keydown', handleIntroKey)
    return () => window.removeEventListener('keydown', handleIntroKey)
  }, [introPhase])

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activePanel) handleExitBuilding()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [activePanel, handleExitBuilding])

  useEffect(() => {
    if (!aboutCardOpen) return
    const close = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ' || event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        setAboutCardOpen(false)
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [aboutCardOpen])

  const advanceIntro = useCallback(() => {
    if (introPhase === 'opening') {
      setIntroPhase('card-opening')
    } else if (introPhase === 'card') {
      setIntroBallStage('closed')
      setIntroPhase('ready')
    } else if (introPhase === 'ready') {
      setIntroPhase('spawn')
    }
  }, [introPhase])

  const zoneMeta = ZONE_META[zone] ?? ZONE_META.hub
  const introActive = introPhase !== 'done'
  const introOnlyAboutBall =
    introPhase === 'opening' ||
    introPhase === 'card-opening' ||
    introPhase === 'card' ||
    introPhase === 'ready'
  // Black-world mode: pokéball + player on pure black, no world geometry
  const introBlackWorld =
    introOnlyAboutBall ||
    introPhase === 'spawn' ||
    introPhase === 'waiting-move'
  const introFocus = introPhase === 'opening' || introPhase === 'card-opening' || introPhase === 'card' || introPhase === 'ready'
  const introGameplayVisible =
    introPhase === 'spawn' ||
    introPhase === 'waiting-move' ||
    introPhase === 'revealing' ||
    introPhase === 'done'
  const introGameplayLocked = introActive && introPhase !== 'waiting-move' && introPhase !== 'revealing'
  const showWorldAtmosphere = !introBlackWorld

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        background: introBlackWorld
          ? '#000000'
          : 'radial-gradient(ellipse 120% 90% at 50% 35%, #1d2d12 0%, #0e1909 62%, #071006 100%)',
      }}
    >
      <HD2DWorld
        paused={battle || !started || introGameplayLocked || pcInterior || switchInterior || aboutCardOpen || !!activePanel}
        aboutCardOpen={aboutCardOpen}
        introFocus={introFocus}
        introOnlyAboutBall={introBlackWorld}
        introAboutStage={introActive ? introBallStage : undefined}
        playerVisible={introGameplayVisible && started}
        onZone={handleZone as any}
        onItem={handleItem}
        onBattle={handleBattle}
        onAboutCardOpen={() => setAboutCardOpen(true)}
        onEnterBuilding={handleEnterBuilding}
        onBuildingNear={handleBuildingNear}
      />

      {showWorldAtmosphere && (
        <>
          {/* Sunset horizon glow — screen-space, unaffected by rotateX */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,105,58,0.13) 0%, rgba(255,156,82,0.052) 25%, rgba(255,205,132,0.018) 48%, transparent 66%)',
              mixBlendMode: 'screen',
            }}
          />
          {/* Far-field blur only: keeps the background softer without changing scene lighting. */}
          <div
            className="absolute inset-x-0 top-0 h-[55vh] pointer-events-none z-20"
            style={{
              background: 'rgba(255,255,255,0.01)',
              backdropFilter: 'blur(1.2px) saturate(0.98)',
              WebkitBackdropFilter: 'blur(1.2px) saturate(0.98)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
            }}
          />
          {/* Ground haze: keeps the tilted map feeling like it sits inside a lit space. */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                'radial-gradient(ellipse 78% 38% at 50% 78%, rgba(255,184,92,0.026), transparent 64%)',
              mixBlendMode: 'soft-light',
            }}
          />
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                'radial-gradient(ellipse 98% 84% at 50% 48%, transparent 58%, rgba(4,8,3,0.12) 86%, rgba(0,0,0,0.22) 100%)',
            }}
          />
          {/* HD-2D lens blur: softens distant and near edges while keeping the player plane readable. */}
          <div
            className="absolute inset-x-0 top-0 h-[17vh] pointer-events-none z-20"
            style={{
              background: 'linear-gradient(to bottom, rgba(2,5,2,0.18) 0%, rgba(2,5,2,0.08) 38%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[4vh] pointer-events-none z-20"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.16), transparent)',
            }}
          />
        </>
      )}

      {/* Battle screen overlay */}
      {battle && <BattleScreen onClose={handleBattleClose} />}

      {/* Pokémon Center interior */}
      {pcInterior && (
        <PCInteriorScene
          onExit={handleExitBuilding}
          onAskExperiences={() => setExperienceDashboardOpen(true)}
          paused={experienceDashboardOpen}
        />
      )}

      {pcInterior && experienceDashboardOpen && (
        <ExperienceHealingStation onClose={() => setExperienceDashboardOpen(false)} />
      )}

      {/* Musical Theater / Switch side-scroller interior */}
      {switchInterior && <SwitchInteriorScene onExit={handleExitBuilding} />}

      {/* Portfolio section overlays */}
      {activePanel && <PortfolioPanel section={activePanel} onClose={handleExitBuilding} />}

      {/* Pokeball About card overlay */}
      {aboutCardOpen && <AboutCardOverlay onClose={() => setAboutCardOpen(false)} />}

      <IntroCinematicOverlay phase={introPhase} onAdvance={advanceIntro} />

      {/* "Walk north to enter" prompt when near a portfolio building */}
      {started && introPhase === 'done' && !battle && !pcInterior && !switchInterior && !activePanel && nearBuilding && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          style={{ animation: 'pulse 1.4s ease-in-out infinite' }}
        >
          <div
            className="px-4 py-2 rounded-full font-mono text-[10px] tracking-[0.25em] flex items-center gap-2"
            style={{
              background: 'rgba(0,0,0,0.72)',
              border: `1px solid ${nearBuilding.color}66`,
              color: nearBuilding.color,
            }}
          >
            <span style={{ fontSize: 12 }}>▲</span> {nearBuilding.prompt}
          </div>
        </div>
      )}

      {/* Black-flash transition overlay */}
      {fadeOut && (
        <div
          className="absolute inset-0 z-[60] bg-black"
          style={{ animation: 'fadeInOut 0.38s ease-in-out forwards' }}
        />
      )}

      {/* ── Zone indicator (bottom-centre) ───────────────────────────────────── */}
      {started && introPhase === 'done' && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{ background:'rgba(0,0,0,0.6)', border:`1px solid ${zoneMeta.color}22` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background:zoneMeta.color, opacity:0.7 }} />
            <span className="font-mono text-[9px] tracking-[0.25em]" style={{ color:`${zoneMeta.color}99` }}>
              {nearBuilding ? nearBuilding.label : zoneMeta.label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
