'use client'

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Html, PerspectiveCamera, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { experiences, type Experience } from '@/data/experience'

const HEALER_BASE = '/3d/pokemon-healer'
const HEALER_MODEL = `${HEALER_BASE}/source/CubikModel/healer.obj`
const HEALER_TEXTURE = `${HEALER_BASE}/textures/healer_.png`
const HEALING_EFFECT_FRAMES = Array.from(
  { length: 9 },
  (_, index) => `/healing-frames/frame-${String(index).padStart(2, '0')}.png`
)
const HEALING_EFFECT_DURATION_MS = 900
const STATION_DPR: [number, number] = [1, 1.25]
const BALL_BASE_Y = 2.74
const BALL_CLIP_Y = BALL_BASE_Y - 0.13

const STATION_BOUNDS = {
  minX: -2.25,
  maxX: 2.25,
  minZ: -2.2,
  maxZ: 1.1,
}

type Direction = 'down' | 'left' | 'right' | 'up'

const DIRECTION_ROW: Record<Direction, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
}

type Slot = {
  x: number
  ballZ: number
  textX: number
  textZ: number
}

const SLOTS: Slot[] = [
  { x: -1.38, ballZ: -0.58, textX: -2.42, textZ: 1.38 },
  { x: 0, ballZ: -0.58, textX: 0, textZ: 1.52 },
  { x: 1.38, ballZ: -0.58, textX: 2.42, textZ: 1.38 },
]

const SLOT_INTERACTION_X = 0.52
const SLOT_INTERACTION_FRONT = 0.55
const SLOT_INTERACTION_BACK = 1.76
const SLOT_VISUAL_OVERLAP_X = 0.5
const SLOT_FEET_LAYER_LINE_Z = -0.22

type HealerExperienceCard = Pick<Experience, 'company' | 'role' | 'location' | 'period' | 'tags' | 'color'> & {
  eyebrow: string
  bullet?: string
}

const textifyExperience = experiences.find((experience) => experience.id === 'textify') ?? experiences[3]
const verseExperience = experiences.find((experience) => experience.id === 'theverse') ?? experiences[2]
const itronCurrentExperience = experiences.find((experience) => experience.id === 'itron-2') ?? experiences[0]
const itronFullStackExperience = experiences.find((experience) => experience.id === 'itron-1') ?? experiences[1]

const HEALER_SLOT_CARDS: HealerExperienceCard[][] = [
  [
    {
      eyebrow: 'INTERNSHIP 1',
      company: textifyExperience.company,
      role: textifyExperience.role,
      location: textifyExperience.location,
      period: textifyExperience.period,
      tags: textifyExperience.tags.slice(0, 4),
      color: textifyExperience.color,
      bullet: textifyExperience.bullets[0],
    },
  ],
  [
    {
      eyebrow: 'INTERNSHIP 2',
      company: verseExperience.company,
      role: verseExperience.role,
      location: verseExperience.location,
      period: verseExperience.period,
      tags: verseExperience.tags.slice(0, 4),
      color: verseExperience.color,
      bullet: verseExperience.bullets[0],
    },
  ],
  [
    {
      eyebrow: 'INTERNSHIP 3',
      company: itronFullStackExperience.company,
      role: 'Full Stack Engineering Intern',
      location: itronFullStackExperience.location,
      period: 'June 2025 - September 2025',
      tags: itronFullStackExperience.tags.slice(0, 4),
      color: itronFullStackExperience.color,
    },
    {
      eyebrow: 'INTERNSHIP 4',
      company: itronCurrentExperience.company,
      role: itronCurrentExperience.role,
      location: itronCurrentExperience.location,
      period: 'January 2026 - Current',
      tags: itronCurrentExperience.tags.slice(0, 4),
      color: itronCurrentExperience.color,
    },
  ],
]

function preparePixelTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  if (texture.image) texture.needsUpdate = true
  return texture
}

function makeGrayHealerTexture(sourceTexture: THREE.Texture) {
  const image = sourceTexture.image as CanvasImageSource & {
    width?: number
    height?: number
    naturalWidth?: number
    naturalHeight?: number
  }
  const width = image.naturalWidth ?? image.width ?? 128
  const height = image.naturalHeight ?? image.height ?? 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return preparePixelTexture(sourceTexture)

  ctx.drawImage(image, 0, 0, width, height)
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const isWhitePlastic = r > 166 && g > 166 && b > 154 && Math.max(r, g, b) - Math.min(r, g, b) < 58
    if (!isWhitePlastic) continue

    const luminance = (r + g + b) / 3
    const gray = THREE.MathUtils.clamp(Math.round(luminance * 0.68), 116, 178)
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = Math.max(106, gray - 6)
  }

  ctx.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function useStationKeys() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const handledKeys = new Set([
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'w',
      'a',
      's',
      'd',
    ])
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (handledKeys.has(key)) event.preventDefault()
      keys.current[key] = true
    }
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  return keys
}

function HealerModel() {
  const obj = useLoader(OBJLoader, HEALER_MODEL)
  const texture = useTexture(HEALER_TEXTURE)

  const model = useMemo(() => {
    const map = makeGrayHealerTexture(texture)
    const root = obj.clone(true)

    root.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = false
      child.receiveShadow = false
      child.material = new THREE.MeshBasicMaterial({
        map,
        color: '#f2f2f2',
        side: THREE.DoubleSide,
      })
    })

    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const scale = 6.9 / Math.max(size.x, 1)
    root.scale.setScalar(scale)

    box.setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    root.position.set(-center.x, -box.min.y, -center.z)

    return root
  }, [obj, texture])

  return <primitive object={model} />
}

function NurseJoyPlayer({ onNearSlotChange }: { onNearSlotChange: (slot: number | null) => void }) {
  const keys = useStationKeys()
  const groupRef = useRef<THREE.Group>(null)
  const spriteRef = useRef<THREE.Sprite>(null)
  const positionRef = useRef(new THREE.Vector3(-0.05, 2.78, 0.92))
  const nearSlotRef = useRef<number | null>(null)
  const directionRef = useRef<Direction>('up')
  const frameRef = useRef(0)
  const elapsedRef = useRef(0)
  const sharedSheet = useTexture('/nursejoy.png')

  const sheet = useMemo(() => {
    const texture = sharedSheet.clone()
    preparePixelTexture(texture)
    texture.repeat.set(1 / 4, 1 / 4)
    texture.offset.set(0, 0)
    texture.needsUpdate = true
    return texture
  }, [sharedSheet])

  useFrame((_, delta) => {
    const k = keys.current
    const up = k.arrowup || k.w
    const down = k.arrowdown || k.s
    const left = k.arrowleft || k.a
    const right = k.arrowright || k.d
    let vx = 0
    let vz = 0

    if (left) vx -= 1
    if (right) vx += 1
    if (up) vz -= 1
    if (down) vz += 1

    const moving = vx !== 0 || vz !== 0
    if (moving) {
      if (vx && vz) {
        vx *= Math.SQRT1_2
        vz *= Math.SQRT1_2
      }

      if (Math.abs(vx) > Math.abs(vz)) {
        directionRef.current = vx < 0 ? 'left' : 'right'
      } else {
        directionRef.current = vz < 0 ? 'up' : 'down'
      }

      const current = positionRef.current
      current.x = THREE.MathUtils.clamp(current.x + vx * 1.75 * delta, STATION_BOUNDS.minX, STATION_BOUNDS.maxX)
      current.z = THREE.MathUtils.clamp(current.z + vz * 1.75 * delta, STATION_BOUNDS.minZ, STATION_BOUNDS.maxZ)
      elapsedRef.current += delta
      frameRef.current = Math.floor(elapsedRef.current * 8) % 4
    } else {
      elapsedRef.current = 0
      frameRef.current = 0
    }

    const row = DIRECTION_ROW[directionRef.current]
    sheet.offset.x = frameRef.current / 4
    sheet.offset.y = 1 - (row + 1) / 4

    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
    }

    let closest: number | null = null
    let closestScore = Infinity
    let behindBall = false
    SLOTS.forEach((slot, index) => {
      const dx = Math.abs(positionRef.current.x - slot.x)
      const dz = positionRef.current.z - slot.ballZ
      if (dx < SLOT_VISUAL_OVERLAP_X && dz < SLOT_FEET_LAYER_LINE_Z) behindBall = true
      if (dx > SLOT_INTERACTION_X || dz > SLOT_INTERACTION_FRONT || dz < -SLOT_INTERACTION_BACK) return

      const score = dx + Math.abs(dz) * 0.28
      if (score < closestScore) {
        closest = index
        closestScore = score
      }
    })

    if (spriteRef.current) {
      spriteRef.current.renderOrder = behindBall ? 5 : 8
    }

    const nearSlot = closest
    if (nearSlot !== nearSlotRef.current) {
      nearSlotRef.current = nearSlot
      onNearSlotChange(nearSlot)
    }
  })

  return (
    <group ref={groupRef} position={positionRef.current.toArray()}>
      <sprite ref={spriteRef} scale={[0.54, 0.58, 1]} renderOrder={8}>
        <spriteMaterial
          map={sheet}
          transparent
          alphaTest={0.12}
          depthTest={false}
          depthWrite={false}
        />
      </sprite>
    </group>
  )
}

function HealingEffect({ index, active }: { index: number; active: boolean }) {
  const slot = SLOTS[index]
  const spriteRef = useRef<THREE.Sprite>(null)
  const materialRef = useRef<THREE.SpriteMaterial>(null)
  const startTimeRef = useRef<number | null>(null)
  const frameTextures = useTexture(HEALING_EFFECT_FRAMES) as THREE.Texture[]

  const frames = useMemo(() => frameTextures.map((texture) => preparePixelTexture(texture)), [frameTextures])

  useEffect(() => {
    startTimeRef.current = null
    if (materialRef.current && frames[0]) materialRef.current.map = frames[0]
  }, [active, index, frames])

  useFrame((state) => {
    if (!active || frames.length === 0) return
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime

    const duration = HEALING_EFFECT_DURATION_MS / 1000
    const progress = THREE.MathUtils.clamp((state.clock.elapsedTime - startTimeRef.current) / duration, 0, 0.999)
    const frameIndex = Math.min(frames.length - 1, Math.floor(progress * frames.length))
    if (materialRef.current && materialRef.current.map !== frames[frameIndex]) {
      materialRef.current.map = frames[frameIndex]
      materialRef.current.needsUpdate = true
    }

    if (spriteRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 18) * 0.045
      spriteRef.current.scale.set(1.36 * pulse, 0.55 * pulse, 1)
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.9 + Math.sin(state.clock.elapsedTime * 16) * 0.1
    }
  })

  if (!active || frames.length === 0) return null

  return (
    <sprite ref={spriteRef} position={[slot.x, BALL_BASE_Y + 0.18, slot.ballZ + 0.02]} scale={[1.36, 0.55, 1]} renderOrder={10}>
      <spriteMaterial
        ref={materialRef}
        map={frames[0]}
        transparent
        opacity={1}
        color="#66ff4f"
        alphaTest={0.08}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  )
}

function PokeballSlot({
  index,
  active,
  opened,
  opening,
}: {
  index: number
  active: boolean
  opened: boolean
  opening: boolean
}) {
  const texturePath = opening
    ? '/about-pokeball-opening.png'
    : opened
      ? '/about-pokeball-open.png'
      : '/about-pokeball-closed.png'
  const texture = useTexture(texturePath)
  const map = useMemo(() => preparePixelTexture(texture), [texture])
  const clipPlanes = useMemo(
    () => [new THREE.Plane(new THREE.Vector3(0, 1, 0), -BALL_CLIP_Y)],
    []
  )
  const slot = SLOTS[index]
  const spriteRef = useRef<THREE.Sprite>(null)

  useFrame((state) => {
    if (!spriteRef.current) return
    const pulse = active ? Math.sin(state.clock.elapsedTime * 8) * 0.035 : 0
    const openLift = opening ? Math.sin(state.clock.elapsedTime * 22) * 0.055 : 0
    const size = opened ? 0.58 : 0.48
    spriteRef.current.scale.set(size + pulse, (opened ? 0.72 : 0.48) + pulse, 1)
    spriteRef.current.position.y = BALL_BASE_Y + openLift
  })

  return (
    <sprite ref={spriteRef} position={[slot.x, BALL_BASE_Y, slot.ballZ]} renderOrder={6}>
      <spriteMaterial
        map={map}
        transparent
        alphaTest={0.12}
        clippingPlanes={clipPlanes}
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  )
}

function StatCardBody({ card }: { card: HealerExperienceCard }) {
  return (
    <>
      <div className="healer-stat-eyebrow">{card.eyebrow}</div>
      <div className="healer-stat-company">{card.company}</div>
      <div className="healer-stat-role">{card.role}</div>
      <div className="healer-stat-line">{card.period}</div>
      <div className="healer-stat-tags">{card.tags.join(' / ')}</div>
    </>
  )
}

function StatPanel({ index, opened }: { index: number; opened: boolean }) {
  if (!opened) return null

  const cards = HEALER_SLOT_CARDS[index]
  const slot = SLOTS[index]
  const panelColor = cards[0]?.color ?? '#54ff2c'
  const stacked = cards.length > 1

  return (
    <Html
      transform
      sprite
      position={[slot.textX, stacked ? 1.98 : 1.92, slot.textZ]}
      distanceFactor={stacked ? 2.32 : 2.56}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: 'none' }}
    >
      {stacked ? (
        <div className="healer-stat-stack">
          {cards.map((card, cardIndex) => (
            <div
              key={`${card.company}-${card.role}-${cardIndex}`}
              className="healer-stat-panel healer-stat-panel--stack-item"
              style={{
                borderColor: card.color,
                boxShadow: `0 0 18px ${card.color}33`,
              }}
            >
              <StatCardBody card={card} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="healer-stat-panel"
          style={{
            borderColor: panelColor,
            boxShadow: `0 0 18px ${panelColor}33`,
          }}
        >
          <StatCardBody card={cards[0]} />
        </div>
      )}
    </Html>
  )
}

function SlotPrompt({ slotIndex }: { slotIndex: number | null }) {
  if (slotIndex === null) return null

  const slot = SLOTS[slotIndex]
  return (
    <Html
      transform
      sprite
      position={[slot.x, 3.34, slot.ballZ - 0.08]}
      distanceFactor={2.6}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div className="healer-space-prompt">SPACE TO HEAL</div>
    </Html>
  )
}

function StationCamera() {
  return (
    <PerspectiveCamera
      makeDefault
      fov={35}
      position={[0, 4.15, 7.15]}
      near={0.1}
      far={120}
      onUpdate={(camera) => camera.lookAt(0, 2.05, -0.08)}
    />
  )
}

function StationScene({
  openedSlots,
  openingSlot,
  nearSlot,
  onNearSlotChange,
}: {
  openedSlots: Record<number, boolean>
  openingSlot: number | null
  nearSlot: number | null
  onNearSlotChange: (slot: number | null) => void
}) {
  return (
    <>
      <StationCamera />
      <color attach="background" args={['#000000']} />
      <ambientLight color="#ffffff" intensity={1} />
      <Suspense fallback={null}>
        <HealerModel />
        {SLOTS.map((_, index) => (
          <PokeballSlot
            key={index}
            index={index}
            active={nearSlot === index}
            opened={Boolean(openedSlots[index])}
            opening={openingSlot === index}
          />
        ))}
        {SLOTS.map((_, index) => (
          <HealingEffect key={`healing-${index}`} index={index} active={openingSlot === index} />
        ))}
        {SLOTS.map((_, index) => (
          <StatPanel key={index} index={index} opened={Boolean(openedSlots[index])} />
        ))}
        <SlotPrompt slotIndex={nearSlot} />
        <NurseJoyPlayer onNearSlotChange={onNearSlotChange} />
      </Suspense>
    </>
  )
}

export default function ExperienceHealingStation({ onClose }: { onClose: () => void }) {
  const [nearSlot, setNearSlot] = useState<number | null>(null)
  const [openingSlot, setOpeningSlot] = useState<number | null>(null)
  const [openedSlots, setOpenedSlots] = useState<Record<number, boolean>>({})
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'escape') {
        event.preventDefault()
        onClose()
        return
      }

      if ((event.code === 'Space' || key === ' ' || key === 'enter') && nearSlot !== null) {
        event.preventDefault()
        if (openingSlot !== null || openedSlots[nearSlot]) return
        setOpeningSlot(nearSlot)
        timerRef.current = window.setTimeout(() => {
          setOpenedSlots((current) => ({ ...current, [nearSlot]: true }))
          setOpeningSlot(null)
        }, 900)
      }
    }

    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [nearSlot, onClose, openedSlots, openingSlot])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-[70] bg-black">
      <Canvas
        dpr={STATION_DPR}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true
        }}
        className="absolute inset-0"
      >
        <StationScene
          openedSlots={openedSlots}
          openingSlot={openingSlot}
          nearSlot={nearSlot}
          onNearSlotChange={setNearSlot}
        />
      </Canvas>

      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-20 px-3 py-2 font-mono text-[10px] font-bold tracking-[0.18em]"
        style={{
          background: 'rgba(0,0,0,0.72)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: 'rgba(255,255,255,0.62)',
        }}
      >
        ESC BACK
      </button>

      <div
        className="absolute left-4 top-4 z-20 pointer-events-none px-3 py-2 font-mono text-[9px] tracking-[0.28em]"
        style={{
          background: 'rgba(0,0,0,0.58)',
          border: '1px solid rgba(0,245,255,0.22)',
          color: 'rgba(0,245,255,0.82)',
        }}
      >
        EXPERIENCE HEALER
      </div>

      <div
        className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 pointer-events-none px-4 py-2 font-mono text-[10px] font-bold tracking-[0.18em]"
        style={{
          background: 'rgba(0,0,0,0.68)',
          border: '1px solid rgba(84,255,44,0.2)',
          color: 'rgba(84,255,44,0.74)',
        }}
      >
        ARROWS MOVE NURSE JOY / SPACE OPENS THE NEAREST BALL
      </div>

      <style jsx global>{`
        .healer-stat-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .healer-stat-panel {
          width: 284px;
          min-height: 136px;
          padding: 12px 14px;
          box-sizing: border-box;
          overflow: hidden;
          background: rgba(0, 12, 4, 0.9);
          border: 2px solid #54ff2c;
          color: #54ff2c;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
          image-rendering: pixelated;
          text-shadow: 0 0 8px rgba(84, 255, 44, 0.52);
          letter-spacing: 0.02em;
          overflow-wrap: break-word;
        }
        .healer-stat-panel--stack-item {
          min-height: 126px;
        }
        .healer-stat-eyebrow {
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          color: rgba(84, 255, 44, 0.74);
          margin-bottom: 8px;
          letter-spacing: 0.18em;
        }
        .healer-stat-company {
          font-size: 20px;
          line-height: 1.05;
          font-weight: 900;
          color: #9cff68;
          margin-bottom: 5px;
        }
        .healer-stat-role {
          font-size: 13px;
          line-height: 1.2;
          font-weight: 800;
          color: rgba(206, 255, 190, 0.92);
          margin-bottom: 7px;
        }
        .healer-stat-line,
        .healer-stat-tags,
        .healer-stat-bullet {
          font-size: 11px;
          line-height: 1.28;
          font-weight: 800;
          color: rgba(140, 255, 105, 0.84);
        }
        .healer-stat-tags {
          margin-top: 8px;
          color: rgba(255, 225, 100, 0.88);
        }
        .healer-stat-bullet {
          margin-top: 8px;
          color: rgba(206, 255, 190, 0.82);
        }
        .healer-space-prompt {
          white-space: nowrap;
          padding: 7px 10px;
          background: rgba(0, 0, 0, 0.74);
          border: 2px solid rgba(84, 255, 44, 0.72);
          color: #54ff2c;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-shadow: 0 0 8px rgba(84, 255, 44, 0.55);
        }
      `}</style>
    </div>
  )
}
