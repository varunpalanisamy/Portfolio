'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Dialogue scripts ───────────────────────────────────────────────────────────

const INTRO: string[] = [
  "TRAINER VARUN wants to battle!",
  "VARUN: …",
  "VARUN: So you made it.",
  "VARUN: I'm Varun Palanisamy.",
  "VARUN: CS: Game Design at UC Santa Cruz.",
  "VARUN: Graduating June 2026.",
  "VARUN: Former music producer, violinist, and pianist.",
  "VARUN: I build things at the intersection of creativity and engineering.",
  "VARUN: Let me show you what I've got.",
]

const SECTIONS: Record<string, string[]> = {
  PROJECTS: [
    "VARUN: Here's what I've built.",
    "VARUN used BRAILLEOUT!",
    "🏆 HackDavis 2026 — AI reads text via webcam → Braille in real time.",
    "Stack: Python · AI · Computer Vision",
    "→ github.com/varunpalanisamy/BrailleOut",
    "VARUN used ECOQUEST!",
    "🏆 SF Hacks 2026 — On-device AI classifies litter, routes to recycling.",
    "Stack: Swift · ExecuTorch · IBM API · MongoDB",
    "VARUN used BANANABREAK!",
    "Full-stack site: UCSC students find empty classrooms in real time.",
    "Stack: Node.js · EJS · MongoDB · Selenium",
    "VARUN used DJ SET MAKER!",
    "AI DJ set generator merging music theory with machine learning.",
    "Stack: Python · ML · Audio Analysis",
    "VARUN: These are my projects. What else?",
  ],
  WORK: [
    "VARUN: Here's where I've worked.",
    "► Itron — Software Engineer Intern (Jan 2026 – Present) ●",
    "  C++ · Angular · TypeScript · Pytest",
    "► Itron — Full Stack Intern (Jun – Sep 2025)",
    "  C# · .NET · Angular · Azure",
    "► The Verse — Software Engineer Intern (Jun – Sep 2024)",
    "  Unity · C# · SQL · CI/CD",
    "► Textify Analytics — Data Science Intern (Jul – Sep 2024)",
    "  Python · LangChain · MongoDB · React",
    "VARUN: That's my work history. Anything else?",
  ],
  ABOUT: [
    "VARUN: Let me tell you more.",
    "VARUN: I grew up playing violin and piano, then started producing music.",
    "VARUN: Then I discovered programming — and never looked back.",
    "VARUN: Now I combine both: game design, AI, and music.",
    "VARUN: Education: B.S. CS: Game Design @ UCSC · June 2026.",
    "VARUN: Skills: React · Next.js · Python · TensorFlow · Unity · C# · C++ · Phaser",
    "VARUN: Anything else?",
  ],
  CONTACT: [
    "VARUN: Here's how to reach me.",
    "✉  varun.palanisamy@gmail.com",
    "↗  github.com/varunpalanisamy",
    "VARUN: Open to full-time engineering roles starting June 2026.",
    "VARUN: Let's build something great together.",
  ],
}

// ── HP Bar ─────────────────────────────────────────────────────────────────────

function HPBar({ name, level, hp = 100, right = false }: { name: string; level: number; hp?: number; right?: boolean }) {
  const hpColor = hp > 50 ? '#58c858' : hp > 20 ? '#f8d858' : '#f83838'
  return (
    <div
      className="flex flex-col gap-0.5"
      style={{
        background: '#e8e8c0',
        border: '3px solid #585050',
        borderRadius: 4,
        padding: '5px 10px',
        width: 200,
        fontFamily: "'Press Start 2P', monospace",
        boxShadow: '2px 2px 0 #585050',
      }}
    >
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 9, color: '#303030' }}>{name}</span>
        <span style={{ fontSize: 7, color: '#686060' }}>Lv{level}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 7, color: '#585050', fontWeight: 'bold' }}>HP</span>
        <div style={{ flex: 1, height: 5, background: '#484040', borderRadius: 2 }}>
          <div style={{ width: `${hp}%`, height: '100%', background: hpColor, borderRadius: 2, transition: 'width 0.5s' }} />
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export function BattleScreen({ onClose }: Props) {
  const [flashIdx,    setFlashIdx   ] = useState(0)
  const [battleVis,  setBattleVis  ] = useState(false)
  const [trainerIn,  setTrainerIn  ] = useState(false)
  const [trainerOut, setTrainerOut ] = useState(false)
  const [pkmnVis,    setPkmnVis    ] = useState(false)
  const [lines,      setLines      ] = useState<string[]>(INTRO)
  const [lineIdx,    setLineIdx    ] = useState(0)
  const [chars,      setChars      ] = useState(0)
  const [typeDone,   setTypeDone   ] = useState(false)
  const [showMenu,   setShowMenu   ] = useState(false)
  const [phase,      setPhase      ] = useState<'title'|'flash'|'enter'|'battle'>('title')
  const [titleOut,   setTitleOut   ] = useState(false)
  const [titleIn,    setTitleIn    ] = useState(false)

  // ── Title card ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'title') return
    const t1 = setTimeout(() => setTitleIn(true), 80)
    const t2 = setTimeout(() => setTitleOut(true), 2800)
    const t3 = setTimeout(() => setPhase('flash'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [phase])

  // ── Flash sequence ───────────────────────────────────────────────────────────
  const FLASHES = ['#fff','#111','#fff','#111','#fff','#111','#fff','#111','#000','#000','#000']

  useEffect(() => {
    if (phase !== 'flash') return
    if (flashIdx >= FLASHES.length) {
      setPhase('enter')
      return
    }
    const delay = flashIdx >= FLASHES.length - 3 ? 350 : 80
    const t = setTimeout(() => setFlashIdx(i => i + 1), delay)
    return () => clearTimeout(t)
  }, [phase, flashIdx])

  // ── Trainer slide-in ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'enter') return
    setBattleVis(true)
    const t1 = setTimeout(() => setTrainerIn(true), 200)
    const t2 = setTimeout(() => { setTrainerOut(true) }, 1800)
    const t3 = setTimeout(() => { setPkmnVis(true); setPhase('battle') }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [phase])

  // ── Typewriter ───────────────────────────────────────────────────────────────
  const currentLine = lines[lineIdx] ?? ''
  useEffect(() => {
    if (phase !== 'battle' || showMenu) return
    if (chars < currentLine.length) {
      const t = setTimeout(() => setChars(c => c + 1), 22)
      return () => clearTimeout(t)
    }
    setTypeDone(true)
  }, [phase, showMenu, chars, currentLine])

  const advance = useCallback(() => {
    if (!typeDone) {
      setChars(currentLine.length)
      setTypeDone(true)
      return
    }
    if (lineIdx >= lines.length - 1) {
      setShowMenu(true)
      return
    }
    setLineIdx(l => l + 1)
    setChars(0)
    setTypeDone(false)
  }, [typeDone, lineIdx, lines, currentLine])

  const selectMenu = useCallback((opt: string) => {
    if (opt === 'RUN') { onClose(); return }
    const script = SECTIONS[opt]
    if (!script) return
    setShowMenu(false)
    setLines(script)
    setLineIdx(0)
    setChars(0)
    setTypeDone(false)
  }, [onClose])

  // ── Render ───────────────────────────────────────────────────────────────────

  // Title card
  if (phase === 'title') return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes titleSlideL { from { transform:translateX(-110%) } to { transform:translateX(0) } }
        @keyframes titleSlideR { from { transform:translateX(110%) } to { transform:translateX(0) } }
        @keyframes titleSlideOutL { from { transform:translateX(0) } to { transform:translateX(-110%) } }
        @keyframes titleSlideOutR { from { transform:translateX(0) } to { transform:translateX(110%) } }
        @keyframes trainerFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.02)} }
        @keyframes lightning { 0%,100%{opacity:0} 10%,30%{opacity:0.9} 20%,40%{opacity:0.2} 50%{opacity:0.7} 60%{opacity:0} }
        @keyframes titleGlow { 0%,100%{text-shadow:0 0 8px #fff,0 0 20px #60a5fa} 50%{text-shadow:0 0 20px #fff,0 0 50px #60a5fa,0 0 80px #3b82f6} }
      `}</style>
      <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background:'#000' }}>
        {/* Left panel — trainer */}
        <div style={{
          position:'absolute', inset:0, right:'50%',
          background:'linear-gradient(135deg,#0a0a2e 0%,#1e3a8a 40%,#1e40af 70%,#0a0a2e 100%)',
          animation: titleOut
            ? 'titleSlideOutL 0.5s ease-in forwards'
            : titleIn ? 'titleSlideL 0.45s ease-out forwards' : 'none',
          transform: titleIn ? undefined : 'translateX(-110%)',
          display:'flex', alignItems:'center', justifyContent:'flex-end',
          paddingRight: 32, overflow:'hidden',
        }}>
          {/* Electric streaks */}
          <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            {[15,35,55,70,85].map(x => (
              <div key={x} style={{
                position:'absolute', left:`${x}%`, top:0, bottom:0, width:2,
                background:'linear-gradient(180deg,transparent 0%,#93c5fd 40%,transparent 100%)',
                animation:`lightning ${1.2+x*0.03}s ease-in-out infinite`,
                animationDelay:`${x*0.1}s`,
              }} />
            ))}
          </div>
          <img
            src="/varun_trainer.png"
            alt="Varun"
            style={{
              imageRendering:'pixelated', height:340,
              animation:'trainerFloat 2s ease-in-out infinite',
              filter:'drop-shadow(0 0 24px #60a5fa) drop-shadow(0 0 60px #3b82f6)',
              zIndex:1,
            }}
          />
        </div>

        {/* Right panel — name */}
        <div style={{
          position:'absolute', inset:0, left:'50%',
          background:'linear-gradient(135deg,#0c0c0c 0%,#111827 50%,#0c0c0c 100%)',
          animation: titleOut
            ? 'titleSlideOutR 0.5s ease-in forwards'
            : titleIn ? 'titleSlideR 0.45s ease-out forwards' : 'none',
          transform: titleIn ? undefined : 'translateX(110%)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          gap:12,
        }}>
          <p style={{ fontFamily:"'Press Start 2P',monospace", fontSize:8, color:'#60a5fa88', letterSpacing:'0.4em', marginBottom:4 }}>
            TRAINER
          </p>
          <h1 style={{
            fontFamily:"'Press Start 2P',monospace", fontSize:20, color:'#ffffff',
            animation:'titleGlow 1.8s ease-in-out infinite', lineHeight:1.6, textAlign:'center',
          }}>
            VARUN<br/>PALANISAMY
          </h1>
          <div style={{ width:120, height:2, background:'linear-gradient(90deg,transparent,#60a5fa,transparent)', margin:'4px 0' }} />
          <p style={{ fontFamily:"'Press Start 2P',monospace", fontSize:6, color:'#6b7280', letterSpacing:'0.15em', textAlign:'center', lineHeight:2 }}>
            CS: GAME DESIGN<br/>UC SANTA CRUZ
          </p>
        </div>

        {/* Center divider flash */}
        <div style={{
          position:'absolute', top:0, bottom:0, left:'50%', width:3,
          background:'linear-gradient(180deg,transparent,#93c5fd,transparent)',
          animation:'lightning 0.8s ease-in-out infinite',
        }} />
      </div>
    </>
  )

  // Flash overlay
  if (phase === 'flash') {
    const bg = FLASHES[Math.min(flashIdx, FLASHES.length - 1)]
    return <div className="absolute inset-0 z-50" style={{ background: bg }} />
  }

  return (
    <>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      <div
        className="absolute inset-0 z-50 flex flex-col"
        style={{ fontFamily: "'Press Start 2P', monospace", opacity: battleVis ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={phase === 'battle' && !showMenu ? advance : undefined}
      >
        {/* ── Arena ─────────────────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden" style={{
          background: 'linear-gradient(180deg, #78b8f8 0%, #a8d0f8 28%, #a8d0f8 28%, #60a828 28%, #58a020 55%, #408018 55%, #306010 100%)',
        }}>

          {/* Horizon line */}
          <div style={{ position:'absolute', top:'28%', left:0, right:0, height:3, background:'#50a020', opacity:0.6 }} />

          {/* Enemy platform */}
          <div style={{
            position:'absolute', top:'32%', right:'10%',
            width:220, height:28, background:'rgba(0,0,0,0.18)', borderRadius:'50%',
          }} />

          {/* Player platform */}
          <div style={{
            position:'absolute', bottom:'32%', left:'8%',
            width:200, height:24, background:'rgba(0,0,0,0.22)', borderRadius:'50%',
          }} />

          {/* ── Trainer slides in ─────────────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            bottom: '28%',
            right: trainerOut ? '-25%' : trainerIn ? '10%' : '100%',
            transition: trainerOut ? 'right 0.5s ease-in' : 'right 0.7s ease-out',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <img
              src="/varun_trainer.png"
              alt="Varun trainer"
              style={{ imageRendering: 'pixelated', width: 160, height: 160 }}
            />
          </div>

          {/* ── Varun as Pokemon ──────────────────────────────────────────── */}
          <div style={{
            position: 'absolute',
            top: '2%',
            right: '8%',
            opacity: pkmnVis ? 1 : 0,
            transform: pkmnVis ? 'scale(1)' : 'scale(0.2)',
            transition: 'opacity 0.4s, transform 0.4s',
          }}>
            <img
              src="/varun_trainer.png"
              alt="Varun"
              style={{
                imageRendering: 'pixelated', width: 180, height: 180,
                animation: 'trainerBob 2.4s ease-in-out infinite',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
              }}
            />
          </div>

          {/* ── Snivy (player back) ──────────────────────────────────────── */}
          <div style={{ position: 'absolute', bottom: '22%', left: '6%' }}>
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/495.gif"
              alt="Snivy"
              style={{ imageRendering: 'pixelated', width: 160, height: 160 }}
              onError={e => { (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/495.png' }}
            />
          </div>

          {/* ── HP bars ──────────────────────────────────────────────────── */}
          {pkmnVis && (
            <div style={{ position: 'absolute', top: '5%', left: '4%' }}>
              <HPBar name="VARUN" level={22} hp={100} />
            </div>
          )}
          {pkmnVis && (
            <div style={{ position: 'absolute', bottom: '38%', right: '4%' }}>
              <HPBar name="SNIVY" level={10} hp={100} right />
            </div>
          )}
        </div>

        {/* ── Dialogue box ─────────────────────────────────────────────────── */}
        <div style={{
          height: 168,
          background: '#f8f0d8',
          borderTop: '4px solid #484040',
          position: 'relative',
          cursor: showMenu ? 'default' : 'pointer',
        }}>
          {showMenu ? (
            /* Action menu */
            <div className="flex h-full">
              <div style={{ flex: 1, padding: '14px 18px', borderRight: '3px solid #484040' }}>
                <p style={{ fontSize: 10, color: '#303030', lineHeight: 1.8 }}>What will you ask?</p>
              </div>
              <div style={{ width: 240, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
                {(['PROJECTS','WORK','ABOUT','CONTACT'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => selectMenu(opt)}
                    style={{
                      fontSize: 8, color: '#303030', background: 'transparent',
                      border: '1px solid #48404033', cursor: 'pointer',
                      padding: '8px 4px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e0d8c0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {opt}
                  </button>
                ))}
                <button
                  onClick={() => selectMenu('RUN')}
                  style={{
                    gridColumn: '1 / -1',
                    fontSize: 8, color: '#888', background: 'transparent',
                    border: '1px solid #48404033', cursor: 'pointer',
                    padding: '6px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#e0d8c0')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  RUN
                </button>
              </div>
            </div>
          ) : (
            /* Typewriter dialogue */
            <div style={{ padding: '14px 20px', height: '100%', position: 'relative' }}>
              <p style={{ fontSize: 10, color: '#202020', lineHeight: 2.2, whiteSpace: 'pre-wrap', letterSpacing: 1 }}>
                {currentLine.slice(0, chars)}
              </p>
              {typeDone && lineIdx < lines.length - 1 && (
                <div
                  style={{
                    position: 'absolute', bottom: 12, right: 18,
                    fontSize: 12, color: '#585050',
                    animation: 'pokeBounce 0.6s ease-in-out infinite alternate',
                  }}
                >
                  ▼
                </div>
              )}
              {typeDone && lineIdx >= lines.length - 1 && (
                <div style={{ position: 'absolute', bottom: 12, right: 18, fontSize: 8, color: '#888' }}>
                  tap for menu
                </div>
              )}
            </div>
          )}
        </div>

        <style>{`
          @keyframes pokeBounce {
            from { transform: translateY(0); }
            to   { transform: translateY(4px); }
          }
          @keyframes trainerBob {
            0%,100% { transform: translateY(0px); }
            50%     { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    </>
  )
}
