'use client'

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { PerspectiveCamera, useTexture } from '@react-three/drei'
import { Suspense, useMemo, useEffect, useRef, useState, Component, ReactNode } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

function prepareInteriorTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  if (texture.image) texture.needsUpdate = true
  return texture
}

type Dir8 = 'down'|'down-right'|'right'|'up-right'|'up'|'up-left'|'left'|'down-left'
const ROW: Record<Dir8, number> = {
  down:0,'down-right':1,right:2,'up-right':3,up:4,'up-left':5,left:6,'down-left':7,
}
const INTERIOR_BOUNDS = {
  minX: -4.05,
  maxX: 4.05,
  minZ: -2.75,
  maxZ: 4.2,
}
const INTERIOR_PLAYER_SPEED = 2.75
const INTERIOR_PLAYER_Y = 0.14
const INTERIOR_PLAYER_SPRITE_SIZE = 0.66
const INTERIOR_DPR: [number, number] = [1, 1.25]
const DESK_COLLIDER = {
  minX: -1.75,
  maxX: 2.05,
  minZ: -0.52,
  maxZ: 0.36,
}
const DESK_PROMPT_ZONE = {
  minX: -1.35,
  maxX: 1.45,
  minZ: 0.2,
  maxZ: 0.92,
}
const PLAYER_COLLISION_RADIUS = 0.24

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'])
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (movementKeys.has(key)) event.preventDefault()
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

// ── FBX model ─────────────────────────────────────────────────────────────────
const RSE_CENTER_BASE = '/3d/pokemon-rse-pokemon-center'
const RSE_TEXTURES = {
  center: `${RSE_CENTER_BASE}/textures/RSE_pokecenter_diffuse.png`,
  pokeball: `${RSE_CENTER_BASE}/textures/RSE_pokeball_diffuse.png`,
  misc: `${RSE_CENTER_BASE}/textures/RSE_misc_diffuse.png`,
  miscAlpha: `${RSE_CENTER_BASE}/textures/RSE_misc_alpha.png`,
}

const HIDDEN_RSE_PROPS = new Set([
  'tree',
  'table',
  'chair_01',
  'chair_02',
  'chair_03',
  'chair_04',
  'chair_05',
  'chair_06',
])

function collidesWithDesk(x: number, z: number) {
  return (
    x > DESK_COLLIDER.minX - PLAYER_COLLISION_RADIUS &&
    x < DESK_COLLIDER.maxX + PLAYER_COLLISION_RADIUS &&
    z > DESK_COLLIDER.minZ - PLAYER_COLLISION_RADIUS &&
    z < DESK_COLLIDER.maxZ + PLAYER_COLLISION_RADIUS
  )
}

function canAskAtDesk(position: THREE.Vector3, direction: Dir8) {
  return (
    direction === 'up' &&
    position.x >= DESK_PROMPT_ZONE.minX &&
    position.x <= DESK_PROMPT_ZONE.maxX &&
    position.z >= DESK_PROMPT_ZONE.minZ &&
    position.z <= DESK_PROMPT_ZONE.maxZ
  )
}

// The RSE FBX references absolute texture paths from the original Maya project.
// Remap by filename so the model can load from this repo's public/3d folder.
function PCModel() {
  const fbx = useLoader(FBXLoader, `${RSE_CENTER_BASE}/source/RSE_Pokecenter/RSE_Pokecenter.fbx`, (loader) => {
    const manager = loader.manager
    manager.setURLModifier((url) => {
      const normalized = decodeURIComponent(url).replace(/\\/g, '/')
      const filename = normalized.split('/').pop()?.toLowerCase()
      if (filename === 'rse_pokecenter_diffuse.png') return RSE_TEXTURES.center
      if (filename === 'rse_pokeball_diffuse.png') return RSE_TEXTURES.pokeball
      if (filename === 'rse_misc_diffuse.png') return RSE_TEXTURES.misc
      if (filename === 'rse_misc_alpha.png') return RSE_TEXTURES.miscAlpha
      return url
    })
  })
  const centerDiffuse = useTexture(RSE_TEXTURES.center)
  const pokeballDiffuse = useTexture(RSE_TEXTURES.pokeball)
  const miscDiffuse = useTexture(RSE_TEXTURES.misc)
  const miscAlpha = useTexture(RSE_TEXTURES.miscAlpha)

  const model = useMemo(() => {
    ;[centerDiffuse, pokeballDiffuse, miscDiffuse, miscAlpha].forEach(prepareInteriorTexture)

    const root = fbx.clone(true)

    root.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow    = false
      child.receiveShadow = false

      if (HIDDEN_RSE_PROPS.has(child.name.toLowerCase())) {
        child.visible = false
        return
      }

      const rawMats = Array.isArray(child.material) ? child.material : [child.material]
      const bakedMats = rawMats.map((mat: any) => {
        const materialName = String(mat?.name ?? '').toLowerCase()
        const existingMapName = String(mat?.map?.name ?? mat?.map?.source?.data?.src ?? '').toLowerCase()
        let map = mat?.map as THREE.Texture | undefined
        if (materialName.includes('pokeball') || existingMapName.includes('pokeball')) {
          map = pokeballDiffuse
        } else if (materialName.includes('misc') || existingMapName.includes('misc')) {
          map = miscDiffuse
        } else {
          map = centerDiffuse
        }

        return new THREE.MeshBasicMaterial({
          map: prepareInteriorTexture(map ?? centerDiffuse),
          side: THREE.DoubleSide,
          transparent: false,
          alphaTest: 0.03,
          color: '#ffffff',
        })
      })

      child.material = bakedMats.length === 1 ? bakedMats[0] : bakedMats
    })

    // Normalise: fit the longest dimension to the room footprint.
    const box    = new THREE.Box3().setFromObject(root)
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    root.scale.setScalar(9.8 / maxDim)

    // Re-centre on X/Z, sit on Y=0
    box.setFromObject(root)
    const center = box.getCenter(new THREE.Vector3())
    root.position.set(-center.x, -box.min.y, -center.z)

    return root
  }, [fbx, centerDiffuse, pokeballDiffuse, miscDiffuse, miscAlpha])

  return <primitive object={model} />
}

function NurseJoySprite() {
  const sharedSheet = useTexture('/nursejoy.png')
  const sheet = useMemo(() => {
    const texture = sharedSheet.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.repeat.set(1 / 4, 1 / 4)
    texture.offset.set(0, 3 / 4)
    texture.needsUpdate = true
    return texture
  }, [sharedSheet])

  return (
    <mesh position={[0.52, 0.93, -1.6]}>
      <planeGeometry args={[0.98, 1.05]} />
      <meshBasicMaterial
        map={sheet}
        transparent
        alphaTest={0.12}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Snivy sprite at the south entrance ────────────────────────────────────────
function SnivyPlayer({
  x = 0,
  z = 3.2,
  paused = false,
  onDeskPromptChange,
}: {
  x?: number
  z?: number
  paused?: boolean
  onDeskPromptChange: (near: boolean) => void
}) {
  const keys = useKeyboard()
  const groupRef = useRef<THREE.Group>(null)
  const positionRef = useRef(new THREE.Vector3(x, INTERIOR_PLAYER_Y, z))
  const frame = useRef(0)
  const elapsed = useRef(0)
  const direction = useRef<Dir8>('down')
  const deskPromptRef = useRef(false)

  useEffect(() => {
    return () => onDeskPromptChange(false)
  }, [onDeskPromptChange])

  // Clone the texture so we own a private copy — the exterior AnimatedPlayer
  // mutates the shared texture's UV offset every frame, which would corrupt
  // this sprite's display if we used the shared instance.
  const sharedSheet = useTexture('/snivy_sheet.png')
  const sheet = useMemo(() => {
    const t = sharedSheet.clone()
    t.colorSpace      = THREE.SRGBColorSpace
    t.magFilter       = THREE.NearestFilter
    t.minFilter       = THREE.NearestFilter
    t.generateMipmaps = false
    t.repeat.set(1 / 4, 1 / 8)
    t.offset.set(0, 1 - 1 / 8)
    t.needsUpdate = true
    return t
  }, [sharedSheet])

  useFrame((_, delta) => {
    if (paused) {
      if (deskPromptRef.current) {
        deskPromptRef.current = false
        onDeskPromptChange(false)
      }
      return
    }

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

      if      (vx < 0 && vz < 0) direction.current = 'up-left'
      else if (vx > 0 && vz < 0) direction.current = 'up-right'
      else if (vx < 0 && vz > 0) direction.current = 'down-left'
      else if (vx > 0 && vz > 0) direction.current = 'down-right'
      else if (vx < 0) direction.current = 'left'
      else if (vx > 0) direction.current = 'right'
      else if (vz < 0) direction.current = 'up'
      else direction.current = 'down'

      const current = positionRef.current
      let nx = THREE.MathUtils.clamp(current.x + vx * INTERIOR_PLAYER_SPEED * delta, INTERIOR_BOUNDS.minX, INTERIOR_BOUNDS.maxX)
      let nz = THREE.MathUtils.clamp(current.z + vz * INTERIOR_PLAYER_SPEED * delta, INTERIOR_BOUNDS.minZ, INTERIOR_BOUNDS.maxZ)
      if (collidesWithDesk(nx, current.z)) nx = current.x
      if (collidesWithDesk(nx, nz)) nz = current.z
      current.set(nx, INTERIOR_PLAYER_Y, nz)

      elapsed.current += delta
      frame.current = Math.floor(elapsed.current * 8) % 4
    } else {
      elapsed.current = 0
      frame.current = 0
    }

    const row = ROW[direction.current]
    sheet.offset.x = frame.current / 4
    sheet.offset.y = 1 - (row + 1) / 8

    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
    }

    const deskPrompt = canAskAtDesk(positionRef.current, direction.current)
    if (deskPrompt !== deskPromptRef.current) {
      deskPromptRef.current = deskPrompt
      onDeskPromptChange(deskPrompt)
    }
  })

  return (
    <group ref={groupRef} position={[x, INTERIOR_PLAYER_Y, z]}>
      <mesh position={[0, INTERIOR_PLAYER_SPRITE_SIZE * 0.7, 0]}>
        <planeGeometry args={[INTERIOR_PLAYER_SPRITE_SIZE, INTERIOR_PLAYER_SPRITE_SIZE]} />
        <meshBasicMaterial
          map={sheet}
          transparent
          alphaTest={0.15}
          side={THREE.DoubleSide}
          color="#f0f0f0"
        />
      </mesh>
    </group>
  )
}

// ── Camera ────────────────────────────────────────────────────────────────────
// Low 2.5D angle, closer to the exterior HD-2D camera than a top-down room view.
function IsoCameraRig() {
  return (
    <PerspectiveCamera
      makeDefault
      fov={34}
      position={[0, 5.25, 11.4]}
      near={0.1}
      far={300}
      onUpdate={(cam) => cam.lookAt(0, 0.78, 0.45)}
    />
  )
}

// ── Neutral interior fill ─────────────────────────────────────────────────────
function InteriorLights() {
  return (
    <ambientLight color="#ffffff" intensity={0.86} />
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function InteriorScene({
  paused,
  onDeskPromptChange,
}: {
  paused: boolean
  onDeskPromptChange: (near: boolean) => void
}) {
  return (
    <>
      <IsoCameraRig />
      <color attach="background" args={['#000000']} />
      <InteriorLights />
      <Suspense fallback={<mesh><boxGeometry args={[0,0,0]} /></mesh>}>
        <PCModel />
        <NurseJoySprite />
        <SnivyPlayer x={0} z={4.05} paused={paused} onDeskPromptChange={onDeskPromptChange} />
      </Suspense>
    </>
  )
}

// ── Simple error boundary so a crash in the 3D scene doesn't kill the page ───
class SceneErrorBoundary extends Component<
  { children: ReactNode; onError?: (e: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(e: Error) {
    console.error('[PCInteriorScene] 3D scene error:', e)
    this.props.onError?.(e)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

// ── Public component ──────────────────────────────────────────────────────────
export default function PCInteriorScene({
  onExit,
  onAskExperiences,
  paused = false,
}: {
  onExit: () => void
  onAskExperiences: () => void
  paused?: boolean
}) {
  const [deskPrompt, setDeskPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused) return
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExit, paused])

  useEffect(() => {
    if (!deskPrompt || paused) return
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        onAskExperiences()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [deskPrompt, onAskExperiences, paused])

  return (
    <div className="absolute inset-0 z-50">
      <Canvas
        dpr={INTERIOR_DPR}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        performance={{ min: 0.6 }}
        className="absolute inset-0"
      >
        <SceneErrorBoundary onError={(e) => console.error('[PC interior]', e)}>
          <InteriorScene paused={paused} onDeskPromptChange={setDeskPrompt} />
        </SceneErrorBoundary>
      </Canvas>

      <div
        className="absolute inset-0 pointer-events-none z-[51]"
        style={{
          background:
            'radial-gradient(ellipse 74% 66% at 50% 48%, transparent 0%, transparent 58%, rgba(0,0,0,0.24) 100%), linear-gradient(to bottom, rgba(0,0,0,0.08), transparent 28%, transparent 72%, rgba(0,0,0,0.14))',
          mixBlendMode: 'multiply',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-[52]"
        style={{
          background:
            'rgba(20,22,28,0.08)',
          mixBlendMode: 'multiply',
        }}
      />

      {deskPrompt && !paused && (
        <div
          className="absolute left-1/2 bottom-[18%] z-[54] -translate-x-1/2 pointer-events-none px-4 py-2 rounded-full font-mono text-[10px] tracking-[0.22em] font-bold"
          style={{
            background: 'rgba(0,0,0,0.66)',
            border: '1px solid rgba(0,245,255,0.32)',
            color: 'rgba(0,245,255,0.9)',
            backdropFilter: 'blur(8px)',
          }}
        >
          SPACE TO ASK ABOUT EXPERIENCES
        </div>
      )}

      {/* ◀ EXIT button */}
      <button
        onClick={onExit}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full font-mono text-xs tracking-[0.2em] font-bold"
        style={{
          background: 'rgba(0,0,0,0.65)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        ◀  EXIT BUILDING
      </button>

      {/* Corner badge */}
      <div
        className="absolute top-4 left-4 z-50 pointer-events-none px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[0.3em]"
        style={{
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,155,181,0.3)',
          color: 'rgba(255,155,181,0.8)',
        }}
      >
        POKÉMON CENTER
      </div>

      {/* ESC hint */}
      <div
        className="absolute top-4 right-4 z-50 pointer-events-none px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[0.2em]"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        ESC to exit
      </div>
    </div>
  )
}
