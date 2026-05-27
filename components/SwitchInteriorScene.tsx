'use client'

import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { PerspectiveCamera, useTexture } from '@react-three/drei'
import { Component, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

type SideDir = 'right' | 'left'
type StemName = 'bass' | 'drums' | 'music' | 'vocals'
type PipeMode = 'stem-mix' | 'pitch-speed'
type PitchSpeedSettings = {
  pitch: number
  speed: number
}
type PipeRoom = {
  id: string
  z: number
  pipeLabel: string
  title: string
  color: string
  accent: string
  mode: PipeMode
}
type PipeConfig = {
  id: string
  z: number
  pipeLabel: string
  title: string
  color: string
  accent: string
  mode: PipeMode | 'locked'
  minZ: number
  maxZ: number
  topX: number
  room?: PipeRoom
}

const SWITCH_BASE = '/3d/Nintendo%20switch%202'
const SWITCH_SCALE = 9.8
const SWITCH_DPR: [number, number] = [1, 1.25]

const SCREEN = {
  y: 0.61,
  minX: -1.72,
  maxX: 1.72,
  minZ: -3.12,
  maxZ: 3.12,
  groundX: -1.9,
}

const PLAYER = {
  width: 0.66,
  height: 0.66,
  bodyWidth: 0.28,
  feetOffset: 0.23,
  speed: 3.05,
  gravity: 8.6,
  jumpVelocity: 4.12,
}

const PIPE = {
  width: 0.58,
  height: 0.9,
  xLift: 0.04,
  yOffset: 0.06,
}

const DOOR = {
  z: -2.78,
  width: 0.56,
  height: 0.92,
  promptRadius: 0.55,
  yOffset: 0.035,
}

const DOOR_SHEET_SIZE = 350
const DOOR_FRAMES = {
  closed: { x: 77, y: 115, width: 81, height: 130 },
  open: { x: 165, y: 110, width: 108, height: 144 },
}

const PIPE_ROOMS: PipeRoom[] = [
  {
    id: 'bass-drums',
    z: -0.2,
    pipeLabel: 'PIPE 01',
    title: 'HEADLOCK STEMS',
    color: '#76ff03',
    accent: '#ffd166',
    mode: 'stem-mix',
  },
  {
    id: 'pitch-speed',
    z: 1.05,
    pipeLabel: 'PIPE 02',
    title: 'PITCH / SPEED',
    color: '#00f5ff',
    accent: '#ff5c8a',
    mode: 'pitch-speed',
  },
]

const PIPE_SPECS: Array<{ z: number; room?: PipeRoom }> = [
  { z: -0.2, room: PIPE_ROOMS[0] },
  { z: 1.05, room: PIPE_ROOMS[1] },
  { z: 2.25 },
]

const PIPES: PipeConfig[] = PIPE_SPECS.map((pipe, index) => ({
  id: pipe.room?.id ?? `pipe-${index + 1}`,
  pipeLabel: pipe.room?.pipeLabel ?? `PIPE 0${index + 1}`,
  title: pipe.room?.title ?? 'LOCKED',
  color: pipe.room?.color ?? '#76ff03',
  accent: pipe.room?.accent ?? '#9aa58f',
  mode: pipe.room?.mode ?? 'locked',
  room: pipe.room,
  ...pipe,
  minZ: pipe.z - PIPE.width / 2,
  maxZ: pipe.z + PIPE.width / 2,
  topX: SCREEN.groundX + PIPE.xLift + PIPE.height,
}))

const ROW: Record<SideDir, number> = {
  right: 2,
  left: 6,
}

const DEFAULT_STEM_POINT = { x: 50, y: 50 }
const ALL_STEMS_MIX: Record<StemName, number> = {
  bass: 0.82,
  drums: 0.82,
  music: 0.82,
  vocals: 0.82,
}
const STEM_URLS: Record<StemName, string> = {
  bass: '/audio/Headlock%20-%2020th%20Anniversary%20Remaster%20%5Bbass%5D.mp3',
  drums: '/audio/Headlock%20-%2020th%20Anniversary%20Remaster%20%5Bdrums%5D.mp3',
  music: '/audio/Headlock%20-%2020th%20Anniversary%20Remaster%20%5Bmusic%5D.mp3',
  vocals: '/audio/Headlock%20-%2020th%20Anniversary%20Remaster%20%5Bvocals%5D.mp3',
}
const STEM_LABELS: Record<StemName, string> = {
  bass: 'BASS',
  drums: 'DRUMS',
  music: 'MUSIC',
  vocals: 'VOCALS',
}
const DEFAULT_PITCH_SPEED_POINT = { x: 50, y: 50 }
const DEFAULT_PITCH_SPEED: PitchSpeedSettings = {
  pitch: 0,
  speed: 1,
}

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const handled = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'space'])
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const code = event.code.toLowerCase()
      if (handled.has(key) || handled.has(code)) event.preventDefault()
      keys.current[key] = true
      keys.current[code] = true
    }
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false
      keys.current[event.code.toLowerCase()] = false
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

function pointToStemMix(point: { x: number; y: number }): Record<StemName, number> {
  const dx = THREE.MathUtils.clamp((point.x - 50) / 50, -1, 1)
  const dy = THREE.MathUtils.clamp((point.y - 50) / 50, -1, 1)
  const soloAmount = THREE.MathUtils.clamp(Math.hypot(dx, dy), 0, 1) ** 1.15
  const intent: Record<StemName, number> = {
    bass: Math.max(0, dy),
    drums: Math.max(0, -dy),
    music: Math.max(0, -dx),
    vocals: Math.max(0, dx),
  }
  const intentTotal = Object.values(intent).reduce((sum, value) => sum + value, 0)

  return (Object.keys(intent) as StemName[]).reduce((mix, stem) => {
    const directionWeight = intentTotal > 0 ? intent[stem] / intentTotal : 0.25
    const isolatedVolume = 0.04 + directionWeight * 0.96
    mix[stem] = THREE.MathUtils.lerp(ALL_STEMS_MIX[stem], isolatedVolume, soloAmount)
    return mix
  }, {} as Record<StemName, number>)
}

function pointToPitchSpeed(point: { x: number; y: number }): PitchSpeedSettings {
  const pitch = THREE.MathUtils.mapLinear(point.y, 100, 0, -7, 7)
  const speed = THREE.MathUtils.mapLinear(point.x, 0, 100, 0.65, 1.6)
  return {
    pitch: Math.round(pitch * 10) / 10,
    speed: Math.round(speed * 100) / 100,
  }
}

type ToneStemGraph = {
  Tone: typeof import('tone')
  players: Partial<Record<StemName, import('tone').GrainPlayer>>
  gains: Partial<Record<StemName, import('tone').Gain>>
}

function useHeadlockStems(mix: Record<StemName, number>, pitchSpeed: PitchSpeedSettings) {
  const graphRef = useRef<ToneStemGraph | null>(null)
  const setupRef = useRef<Promise<ToneStemGraph | null> | null>(null)
  const startedRef = useRef(false)
  const startingRef = useRef(false)

  useEffect(() => {
    let disposed = false
    const stems = Object.keys(STEM_URLS) as StemName[]

    const setup = async () => {
      const Tone = await import('tone')
      const players: ToneStemGraph['players'] = {}
      const gains: ToneStemGraph['gains'] = {}

      await Promise.all(stems.map((stem) => new Promise<void>((resolve, reject) => {
        const gain = new Tone.Gain(ALL_STEMS_MIX[stem] * 0.94).toDestination()
        const player = new Tone.GrainPlayer({
          url: STEM_URLS[stem],
          loop: true,
          grainSize: 0.16,
          overlap: 0.08,
          playbackRate: 1,
          detune: 0,
          onload: resolve,
          onerror: reject,
        }).connect(gain)
        players[stem] = player
        gains[stem] = gain
      })))

      if (disposed) {
        stems.forEach((stem) => {
          players[stem]?.dispose()
          gains[stem]?.dispose()
        })
        return null
      }

      graphRef.current = { Tone, players, gains }
      return graphRef.current
    }

    setupRef.current = setup()

    const applySettings = (graph: ToneStemGraph) => {
      stems.forEach((stem) => {
        const player = graph.players[stem]
        const gain = graph.gains[stem]
        if (!player || !gain) return
        player.playbackRate = pitchSpeed.speed
        player.detune = pitchSpeed.pitch * 100
        gain.gain.rampTo(THREE.MathUtils.clamp(mix[stem], 0, 1) * 0.94, 0.05)
      })
    }

    const start = async () => {
      if (startedRef.current || startingRef.current) return
      startingRef.current = true
      const graph = await setupRef.current
      if (!graph || disposed) {
        startingRef.current = false
        return
      }
      try {
        await graph.Tone.start()
      } catch {
        startingRef.current = false
        return
      }
      applySettings(graph)
      const when = graph.Tone.now() + 0.08
      stems.forEach((stem) => graph.players[stem]?.start(when, 0))
      startedRef.current = true
      startingRef.current = false
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }

    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    start()

    return () => {
      disposed = true
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      setupRef.current?.then((graph) => {
        if (!graph) return
        stems.forEach((stem) => {
          graph.players[stem]?.stop()
          graph.players[stem]?.dispose()
          graph.gains[stem]?.dispose()
        })
      })
      graphRef.current = null
      startedRef.current = false
      startingRef.current = false
    }
  // Build the Tone graph once on scene mount; live controls are handled below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const stems = Object.keys(STEM_URLS) as StemName[]
    const apply = (graph: ToneStemGraph | null) => {
      if (!graph) return
      stems.forEach((stem) => {
        const player = graph.players[stem]
        const gain = graph.gains[stem]
        if (!player || !gain) return
        player.playbackRate = pitchSpeed.speed
        player.detune = pitchSpeed.pitch * 100
        gain.gain.rampTo(THREE.MathUtils.clamp(mix[stem], 0, 1) * 0.94, 0.05)
      })
    }

    apply(graphRef.current)
    setupRef.current?.then(apply)
  }, [mix, pitchSpeed])
}

function switchMaterial(name: string) {
  const key = name.toLowerCase()

  const base = {
    side: THREE.DoubleSide,
    flatShading: true,
    roughness: 0.86,
    metalness: 0,
  }

  if (key.includes('pantalla')) {
    return new THREE.MeshBasicMaterial({
      color: '#050607',
      side: THREE.DoubleSide,
    })
  }

  if (key.includes('blue')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#42d8ff',
      emissive: '#063848',
      emissiveIntensity: 0.12,
    })
  }

  if (key.includes('red')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#ff4b57',
      emissive: '#3f0808',
      emissiveIntensity: 0.12,
    })
  }

  if (key.includes('botones') || key.includes('joystick')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#25282a',
      roughness: 0.74,
    })
  }

  if (key.includes('material.001') || key === 'material') {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#d7d8d5',
      roughness: 0.58,
    })
  }

  if (key.includes('cobre') || key.includes('brushed')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#2b292d',
      roughness: 0.78,
      metalness: 0.08,
    })
  }

  if (key.includes('base_switch.001')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#242628',
    })
  }

  if (key.includes('base_switch.002') || key.includes('base_switch.003')) {
    return new THREE.MeshStandardMaterial({
      ...base,
      color: '#111315',
    })
  }

  return new THREE.MeshStandardMaterial({
    ...base,
    color: '#17191b',
  })
}

function SwitchModel() {
  const obj = useLoader(OBJLoader, `${SWITCH_BASE}/Nintendo%20switch%202.obj`)

  const model = useMemo(() => {
    const root = obj.clone(true)

    root.traverse((child: THREE.Object3D) => {
      if (!(child instanceof THREE.Mesh)) return
      child.castShadow = false
      child.receiveShadow = false

      const rawMaterials = Array.isArray(child.material) ? child.material : [child.material]
      const patched = rawMaterials.map((mat: any) => {
        const materialName = String(mat?.name || child.name || '')
        return switchMaterial(materialName)
      })
      child.material = patched.length === 1 ? patched[0] : patched
    })

    root.scale.setScalar(SWITCH_SCALE)
    return root
  }, [obj])

  return <primitive object={model} />
}

function makeScreenGeometry(widthZ: number, heightX: number) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([
        -heightX / 2, 0, -widthZ / 2,
        -heightX / 2, 0,  widthZ / 2,
         heightX / 2, 0,  widthZ / 2,
         heightX / 2, 0, -widthZ / 2,
      ]),
      3,
    ),
  )
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]),
      2,
    ),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  return geometry
}

function ScreenRect({
  x,
  z,
  y = SCREEN.y,
  widthZ,
  heightX,
  color,
  opacity = 1,
}: {
  x: number
  z: number
  y?: number
  widthZ: number
  heightX: number
  color: string
  opacity?: number
}) {
  const geometry = useMemo(() => makeScreenGeometry(widthZ, heightX), [widthZ, heightX])

  return (
    <mesh position={[x, y, z]} geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function platformAt(z: number) {
  const pipe = PIPES.find((item) => z >= item.minZ && z <= item.maxZ)
  return (pipe?.topX ?? SCREEN.groundX) + PLAYER.feetOffset
}

function pipeAtTop(z: number, playerX: number) {
  const playerFeetX = playerX - PLAYER.feetOffset
  return PIPES.find((pipe) => (
    pipe.room &&
    z >= pipe.minZ &&
    z <= pipe.maxZ &&
    Math.abs(playerFeetX - pipe.topX) < 0.08
  )) ?? null
}

function collidesWithPipeSide(nextZ: number, playerX: number) {
  const halfBody = PLAYER.bodyWidth / 2
  const playerFeetX = playerX - PLAYER.feetOffset
  return PIPES.find((pipe) => (
    nextZ + halfBody > pipe.minZ &&
    nextZ - halfBody < pipe.maxZ &&
    playerFeetX < pipe.topX - 0.04
  ))
}

function PipeSprite({ z }: { z: number }) {
  const sharedTexture = useTexture('/pipe.png')
  const texture = useMemo(() => {
    const map = sharedTexture.clone()
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = THREE.ClampToEdgeWrapping
    map.wrapT = THREE.ClampToEdgeWrapping
    map.magFilter = THREE.NearestFilter
    map.minFilter = THREE.NearestFilter
    map.generateMipmaps = false
    map.needsUpdate = true
    return map
  }, [sharedTexture])
  const geometry = useMemo(() => makeScreenGeometry(PIPE.width, PIPE.height), [])

  return (
    <mesh
      position={[SCREEN.groundX + PIPE.xLift + PIPE.height / 2, SCREEN.y + PIPE.yOffset, z]}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.12}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function DoorSprite({ open }: { open: boolean }) {
  const sharedTexture = useTexture('/door.png')
  const texture = useMemo(() => {
    const frame = open ? DOOR_FRAMES.open : DOOR_FRAMES.closed
    const map = sharedTexture.clone()
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = THREE.ClampToEdgeWrapping
    map.wrapT = THREE.ClampToEdgeWrapping
    map.magFilter = THREE.NearestFilter
    map.minFilter = THREE.NearestFilter
    map.generateMipmaps = false
    map.repeat.set(frame.width / DOOR_SHEET_SIZE, frame.height / DOOR_SHEET_SIZE)
    map.offset.set(frame.x / DOOR_SHEET_SIZE, 1 - (frame.y + frame.height) / DOOR_SHEET_SIZE)
    map.needsUpdate = true
    return map
  }, [sharedTexture, open])
  const geometry = useMemo(() => makeScreenGeometry(DOOR.width, DOOR.height), [])

  return (
    <mesh
      position={[SCREEN.groundX + DOOR.height / 2, SCREEN.y + DOOR.yOffset, DOOR.z]}
      geometry={geometry}
    >
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function SnivySideScroller({
  paused,
  onPipePromptChange,
  onPipeEnter,
  onDoorNearChange,
  onExit,
}: {
  paused: boolean
  onPipePromptChange: (pipe: PipeConfig | null) => void
  onPipeEnter: (pipe: PipeConfig) => void
  onDoorNearChange: (near: boolean) => void
  onExit: () => void
}) {
  const keys = useKeyboard()
  const groupRef = useRef<THREE.Group>(null)
  const positionRef = useRef({ x: SCREEN.groundX + PLAYER.feetOffset, z: DOOR.z })
  const velocityXRef = useRef(0)
  const directionRef = useRef<SideDir>('right')
  const jumpWasDownRef = useRef(false)
  const downWasDownRef = useRef(false)
  const spaceWasDownRef = useRef(false)
  const doorNearRef = useRef(true)
  const pipePromptRef = useRef<string | null>(null)
  const pipeDiveRef = useRef<{ pipe: PipeConfig; elapsed: number; startX: number } | null>(null)
  const frameRef = useRef(0)
  const elapsedRef = useRef(0)

  const sharedSheet = useTexture('/snivy_sheet.png')
  const sheet = useMemo(() => {
    const texture = sharedSheet.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.repeat.set(1 / 4, 1 / 8)
    texture.offset.set(0, 1 - (ROW.right + 1) / 8)
    texture.needsUpdate = true
    return texture
  }, [sharedSheet])
  const geometry = useMemo(() => makeScreenGeometry(PLAYER.width, PLAYER.height), [])

  useFrame((_, delta) => {
    if (paused) return

    const dt = Math.min(delta, 0.04)
    const k = keys.current
    const left = k.arrowleft || k.a
    const right = k.arrowright || k.d
    const down = k.arrowdown || k.s
    const jump = k.arrowup || k.w || k[' '] || k.space
    const spaceDown = Boolean(k[' '] || k.space)
    const position = positionRef.current

    const publishPipePrompt = (pipe: PipeConfig | null) => {
      const nextId = pipe?.id ?? null
      if (nextId !== pipePromptRef.current) {
        pipePromptRef.current = nextId
        onPipePromptChange(pipe)
      }
    }

    if (pipeDiveRef.current) {
      const dive = pipeDiveRef.current
      dive.elapsed += dt
      const t = THREE.MathUtils.clamp(dive.elapsed / 0.64, 0, 1)
      position.z = dive.pipe.z
      position.x = THREE.MathUtils.lerp(dive.startX, SCREEN.groundX - 0.2, t)

      const row = ROW[directionRef.current]
      sheet.offset.x = 1 / 4
      sheet.offset.y = 1 - (row + 1) / 8

      if (groupRef.current) {
        const squash = 1 - t * 0.35
        groupRef.current.position.set(position.x, SCREEN.y + 0.045, position.z)
        groupRef.current.scale.setScalar(squash)
      }

      if (t >= 1) {
        pipeDiveRef.current = null
        onPipeEnter(dive.pipe)
      }
      return
    }

    if (groupRef.current && groupRef.current.scale.x !== 1) {
      groupRef.current.scale.setScalar(1)
    }

    let move = 0
    if (left) move -= 1
    if (right) move += 1

    const nearDoor = Math.abs(position.z - DOOR.z) < DOOR.promptRadius
    if (nearDoor !== doorNearRef.current) {
      doorNearRef.current = nearDoor
      onDoorNearChange(nearDoor)
    }
    if (nearDoor && spaceDown && !spaceWasDownRef.current) {
      onExit()
      spaceWasDownRef.current = spaceDown
      return
    }
    spaceWasDownRef.current = spaceDown

    const currentPlatform = platformAt(position.z)
    const grounded = position.x <= currentPlatform + 0.001
    const currentPipe = grounded ? pipeAtTop(position.z, position.x) : null
    publishPipePrompt(currentPipe)

    if (currentPipe && down && !downWasDownRef.current) {
      pipeDiveRef.current = { pipe: currentPipe, elapsed: 0, startX: position.x }
      publishPipePrompt(null)
      downWasDownRef.current = true
      velocityXRef.current = 0
      return
    }
    downWasDownRef.current = Boolean(down)

    if (jump && !jumpWasDownRef.current && grounded) {
      velocityXRef.current = PLAYER.jumpVelocity
    }
    jumpWasDownRef.current = Boolean(jump)

    if (move < 0) directionRef.current = 'left'
    if (move > 0) directionRef.current = 'right'

    let nextZ = THREE.MathUtils.clamp(
      position.z + move * PLAYER.speed * dt,
      SCREEN.minZ + PLAYER.width * 0.55,
      SCREEN.maxZ - PLAYER.width * 0.55,
    )

    const blockingPipe = collidesWithPipeSide(nextZ, position.x)
    if (blockingPipe) {
      const halfBody = PLAYER.bodyWidth / 2
      nextZ = move > 0
        ? blockingPipe.minZ - halfBody
        : blockingPipe.maxZ + halfBody
    }
    position.z = THREE.MathUtils.clamp(
      nextZ,
      SCREEN.minZ + PLAYER.width * 0.55,
      SCREEN.maxZ - PLAYER.width * 0.55,
    )

    velocityXRef.current -= PLAYER.gravity * dt
    const activePlatform = platformAt(position.z)
    position.x = Math.min(SCREEN.maxX - PLAYER.height * 0.58, position.x + velocityXRef.current * dt)
    if (position.x <= activePlatform) {
      position.x = activePlatform
      velocityXRef.current = 0
    }

    const moving = move !== 0
    const inAir = !grounded || velocityXRef.current !== 0
    if (moving && !inAir) {
      elapsedRef.current += dt
      frameRef.current = Math.floor(elapsedRef.current * 10) % 4
    } else if (inAir) {
      frameRef.current = directionRef.current === 'right' ? 1 : 2
      elapsedRef.current = 0
    } else {
      frameRef.current = 0
      elapsedRef.current = 0
    }

    const row = ROW[directionRef.current]
    sheet.offset.x = frameRef.current / 4
    sheet.offset.y = 1 - (row + 1) / 8

    if (groupRef.current) {
      groupRef.current.position.set(position.x, SCREEN.y + 0.045, position.z)
    }
  })

  return (
    <group ref={groupRef} position={[positionRef.current.x, SCREEN.y + 0.045, positionRef.current.z]}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          map={sheet}
          transparent
          alphaTest={0.18}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function SwitchCamera() {
  return (
    <PerspectiveCamera
      makeDefault
      fov={42}
      position={[0, 8.1, 0.001]}
      near={0.1}
      far={60}
      onUpdate={(camera) => {
        camera.up.set(1, 0, 0)
        camera.lookAt(0, 0.1, 0)
      }}
    />
  )
}

function SwitchScene({
  paused,
  onPipePromptChange,
  onPipeEnter,
  doorOpen,
  onDoorNearChange,
  onExit,
}: {
  paused: boolean
  onPipePromptChange: (pipe: PipeConfig | null) => void
  onPipeEnter: (pipe: PipeConfig) => void
  doorOpen: boolean
  onDoorNearChange: (near: boolean) => void
  onExit: () => void
}) {
  return (
    <>
      <SwitchCamera />
      <color attach="background" args={['#000000']} />
      <ambientLight color="#ffffff" intensity={2.35} />
      <directionalLight color="#ffffff" intensity={1.35} position={[0, 6, 0.2]} />
      <Suspense fallback={null}>
        <group position={[0, 0, 0]}>
          <SwitchModel />
          <ScreenRect
            x={0}
            z={0}
            y={SCREEN.y}
            widthZ={SCREEN.maxZ - SCREEN.minZ + 0.22}
            heightX={SCREEN.maxX - SCREEN.minX + 0.08}
            color="#050706"
            opacity={0.98}
          />
          <DoorSprite open={doorOpen} />
          {PIPES.map((pipe) => <PipeSprite key={pipe.z} z={pipe.z} />)}
          <SnivySideScroller
            paused={paused}
            onPipePromptChange={onPipePromptChange}
            onPipeEnter={onPipeEnter}
            onDoorNearChange={onDoorNearChange}
            onExit={onExit}
          />
        </group>
      </Suspense>
    </>
  )
}

function PipeEntryPrompt({ pipe }: { pipe: PipeConfig }) {
  return (
    <div
      className="absolute left-1/2 bottom-[21%] z-[54] -translate-x-1/2 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    >
      <div
        className="px-3 py-2 font-mono text-[10px] tracking-[0.2em] font-bold text-center"
        style={{
          background: 'rgba(3,8,6,0.88)',
          border: `2px solid ${pipe.color}`,
          boxShadow: `0 0 0 2px rgba(0,0,0,0.9), 0 0 18px ${pipe.color}44`,
          color: pipe.color,
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8, marginBottom: 2 }}>
          {pipe.pipeLabel} / {pipe.title}
        </div>
        PRESS S TO GO DOWN
      </div>
    </div>
  )
}

function PipeMusicRoom({
  room,
  value,
  onChange,
  onClose,
}: {
  room: PipeRoom
  value: { x: number; y: number }
  onChange: (next: { x: number; y: number }) => void
  onClose: () => void
}) {
  const keys = useKeyboard()
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const onCloseRef = useRef(onClose)
  const [spriteFrame, setSpriteFrame] = useState(0)
  const [spriteDirection, setSpriteDirection] = useState<'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'>('up')

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpriteFrame((frame) => (frame + 1) % 4)
    }, 110)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isMove = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)
      if (isMove || key === 'escape' || key === 'backspace') event.preventDefault()

      if (key === 'escape' || key === 'backspace') {
        onCloseRef.current()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    let frameId = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const k = keys.current
      const left = k.arrowleft || k.a
      const right = k.arrowright || k.d
      const up = k.arrowup || k.w
      const down = k.arrowdown || k.s
      let dx = 0
      let dy = 0
      if (left) dx -= 1
      if (right) dx += 1
      if (up) dy -= 1
      if (down) dy += 1

      if (dx || dy) {
        if      (dx < 0 && dy < 0) setSpriteDirection('up-left')
        else if (dx > 0 && dy < 0) setSpriteDirection('up-right')
        else if (dx < 0 && dy > 0) setSpriteDirection('down-left')
        else if (dx > 0 && dy > 0) setSpriteDirection('down-right')
        else if (dx < 0) setSpriteDirection('left')
        else if (dx > 0) setSpriteDirection('right')
        else if (dy < 0) setSpriteDirection('up')
        else setSpriteDirection('down')

        const speed = (k.shift || k.shiftleft || k.shiftright ? 88 : 52) * dt
        const length = Math.hypot(dx, dy) || 1
        const current = valueRef.current
        const next = {
          x: THREE.MathUtils.clamp(current.x + (dx / length) * speed, 0, 100),
          y: THREE.MathUtils.clamp(current.y + (dy / length) * speed, 0, 100),
        }
        valueRef.current = next
        onChangeRef.current(next)
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [keys])

  const stemMix = pointToStemMix(value)
  const stemOrder: StemName[] = ['drums', 'music', 'vocals', 'bass']
  const gridColor = `${room.color}26`
  const frame = [1, 0, 2, 0][spriteFrame]
  const markerTransform = {
    up: 'translate(-50%, -50%) rotate(0deg)',
    right: 'translate(-50%, -50%) rotate(90deg)',
    left: 'translate(-50%, -50%) rotate(-90deg)',
    down: 'translate(-50%, -50%) scaleY(-1)',
    'up-left': 'translate(-50%, -50%) rotate(-45deg)',
    'up-right': 'translate(-50%, -50%) rotate(45deg)',
    'down-left': 'translate(-50%, -50%) rotate(-135deg)',
    'down-right': 'translate(-50%, -50%) rotate(135deg)',
  }[spriteDirection]

  return (
    <div
      className="absolute z-[58] flex items-center justify-center"
      style={{
        left: '14.3%',
        right: '14.3%',
        top: '10.5%',
        bottom: '15.2%',
        background:
          'linear-gradient(180deg, rgba(2,5,4,0.96), rgba(0,0,0,0.94))',
        border: `2px solid ${room.color}`,
        boxShadow: `0 0 0 3px rgba(0,0,0,0.92), inset 0 0 32px ${room.color}18, 0 0 24px ${room.color}30`,
        imageRendering: 'pixelated',
      }}
    >
      <div className="w-full max-w-[720px] px-6 py-5 text-white font-mono">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div
              className="text-[9px] tracking-[0.32em] mb-1"
              style={{ color: room.accent }}
            >
              HEADLOCK STEM ISOLATOR / {room.pipeLabel}
            </div>
            <div className="text-2xl tracking-[0.18em] font-black" style={{ color: room.color }}>
              {room.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 text-[10px] tracking-[0.18em] font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '2px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            ESC BACK
          </button>
        </div>

        <div className="grid grid-cols-[1fr_180px] gap-5 items-center">
          <div
            className="relative aspect-square min-h-[250px]"
            style={{
              background: `
                linear-gradient(${gridColor} 2px, transparent 2px),
                linear-gradient(90deg, ${gridColor} 2px, transparent 2px),
                radial-gradient(circle at ${value.x}% ${value.y}%, ${room.color}1f, transparent 28%),
                rgba(6,12,10,0.92)
              `,
              backgroundSize: '28px 28px, 28px 28px, 100% 100%, 100% 100%',
              border: `3px solid ${room.color}`,
              boxShadow: `inset 0 0 0 3px rgba(0,0,0,0.75)`,
            }}
          >
            <div className="absolute top-2 left-3 text-[9px] tracking-[0.25em]" style={{ color: room.accent }}>
              DRUMS
            </div>
            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-[9px] tracking-[0.25em]" style={{ color: '#00f5ff' }}>
              MUSIC
            </div>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 text-[9px] tracking-[0.25em]" style={{ color: '#ff5c8a' }}>
              VOCALS
            </div>
            <div className="absolute bottom-3 left-3 text-[9px] tracking-[0.25em]" style={{ color: room.color }}>
              BASS
            </div>
            <div
              className="absolute"
              style={{
                left: `${value.x}%`,
                top: `${value.y}%`,
                width: 48,
                height: 48,
                transform: markerTransform,
                transformOrigin: 'center',
                backgroundImage: 'url(/snivy_sheet.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `${-frame * 48}px ${-4 * 48}px`,
                filter: `drop-shadow(0 0 10px ${room.color})`,
                imageRendering: 'pixelated',
              }}
            />
          </div>

          <div className="space-y-4">
            {stemOrder.map((stem) => {
              const color = stem === 'drums' ? room.accent
                : stem === 'bass' ? room.color
                : stem === 'music' ? '#00f5ff'
                : '#ff5c8a'
              const stemValue = Math.round(stemMix[stem] * 100)
              return (
                <div key={stem}>
                  <div className="flex justify-between text-[10px] tracking-[0.2em] mb-2">
                    <span style={{ color }}>{STEM_LABELS[stem]}</span>
                    <span style={{ color: 'rgba(255,255,255,0.64)' }}>{stemValue}%</span>
                  </div>
                  <div
                    className="h-7 p-1"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '2px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${stemValue}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}88)`,
                        boxShadow: `0 0 14px ${color}55`,
                      }}
                    />
                  </div>
                </div>
              )
            })}

            <div
              className="p-3 text-[9px] leading-relaxed tracking-[0.18em]"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              MOVE SNIVY: UP DRUMS / LEFT MUSIC / RIGHT VOCALS / DOWN BASS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipePitchSpeedRoom({
  room,
  value,
  onPointChange,
  onClose,
}: {
  room: PipeRoom
  value: { x: number; y: number }
  onPointChange: (next: { x: number; y: number }) => void
  onClose: () => void
}) {
  const keys = useKeyboard()
  const valueRef = useRef(value)
  const onPointChangeRef = useRef(onPointChange)
  const onCloseRef = useRef(onClose)
  const [spriteFrame, setSpriteFrame] = useState(0)
  const [spriteDirection, setSpriteDirection] = useState<'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right'>('up')

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onPointChangeRef.current = onPointChange
  }, [onPointChange])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpriteFrame((frame) => (frame + 1) % 4)
    }, 110)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isMove = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)
      if (isMove || key === 'escape' || key === 'backspace') event.preventDefault()
      if (key === 'escape' || key === 'backspace') onCloseRef.current()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    let frameId = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      const k = keys.current
      const left = k.arrowleft || k.a
      const right = k.arrowright || k.d
      const up = k.arrowup || k.w
      const down = k.arrowdown || k.s
      let dx = 0
      let dy = 0
      if (left) dx -= 1
      if (right) dx += 1
      if (up) dy -= 1
      if (down) dy += 1

      if (dx || dy) {
        if      (dx < 0 && dy < 0) setSpriteDirection('up-left')
        else if (dx > 0 && dy < 0) setSpriteDirection('up-right')
        else if (dx < 0 && dy > 0) setSpriteDirection('down-left')
        else if (dx > 0 && dy > 0) setSpriteDirection('down-right')
        else if (dx < 0) setSpriteDirection('left')
        else if (dx > 0) setSpriteDirection('right')
        else if (dy < 0) setSpriteDirection('up')
        else setSpriteDirection('down')

        const speed = (k.shift || k.shiftleft || k.shiftright ? 95 : 58) * dt
        const length = Math.hypot(dx, dy) || 1
        const current = valueRef.current
        const next = {
          x: THREE.MathUtils.clamp(current.x + (dx / length) * speed, 2, 98),
          y: THREE.MathUtils.clamp(current.y + (dy / length) * speed, 2, 98),
        }
        valueRef.current = next
        onPointChangeRef.current(next)
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [keys])

  const settings = pointToPitchSpeed(value)
  const frame = [1, 0, 2, 0][spriteFrame]
  const markerTransform = {
    up: 'translate(-50%, -50%) rotate(0deg)',
    right: 'translate(-50%, -50%) rotate(90deg)',
    left: 'translate(-50%, -50%) rotate(-90deg)',
    down: 'translate(-50%, -50%) scaleY(-1)',
    'up-left': 'translate(-50%, -50%) rotate(-45deg)',
    'up-right': 'translate(-50%, -50%) rotate(45deg)',
    'down-left': 'translate(-50%, -50%) rotate(-135deg)',
    'down-right': 'translate(-50%, -50%) rotate(135deg)',
  }[spriteDirection]

  return (
    <div
      className="absolute z-[58] flex items-center justify-center"
      style={{
        left: '14.3%',
        right: '14.3%',
        top: '10.5%',
        bottom: '15.2%',
        background:
          'linear-gradient(180deg, rgba(1,7,9,0.97), rgba(0,0,0,0.94))',
        border: `2px solid ${room.color}`,
        boxShadow: `0 0 0 3px rgba(0,0,0,0.92), inset 0 0 36px ${room.color}18, 0 0 24px ${room.color}30`,
        imageRendering: 'pixelated',
      }}
    >
      <div className="w-full max-w-[780px] px-6 py-5 text-white font-mono">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-[9px] tracking-[0.32em] mb-1" style={{ color: room.accent }}>
              HEADLOCK PITCH / SPEED / {room.pipeLabel}
            </div>
            <div className="text-2xl tracking-[0.18em] font-black" style={{ color: room.color }}>
              {room.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 text-[10px] tracking-[0.18em] font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '2px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            ESC BACK
          </button>
        </div>

        <div className="grid grid-cols-[1fr_210px] gap-5 items-center">
          <div
            className="relative aspect-square min-h-[272px]"
            style={{
              background: `
                linear-gradient(${room.color}22 2px, transparent 2px),
                linear-gradient(90deg, ${room.color}22 2px, transparent 2px),
                radial-gradient(circle at ${value.x}% ${value.y}%, ${room.color}20, transparent 30%),
                rgba(4,11,13,0.93)
              `,
              backgroundSize: '28px 28px, 28px 28px, 100% 100%, 100% 100%',
              border: `3px solid ${room.color}`,
              boxShadow: `inset 0 0 0 3px rgba(0,0,0,0.74), inset 0 0 34px ${room.color}18`,
            }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.25em]" style={{ color: room.accent }}>
              PITCH +
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] tracking-[0.25em]" style={{ color: room.accent }}>
              PITCH -
            </div>
            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-[9px] tracking-[0.25em]" style={{ color: '#76ff03' }}>
              SPEED -
            </div>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 text-[9px] tracking-[0.25em]" style={{ color: room.color }}>
              SPEED +
            </div>
            <div
              className="absolute left-1/2 top-1/2 h-[2px] w-[82%] -translate-x-1/2 bg-white/10"
              aria-hidden
            />
            <div
              className="absolute left-1/2 top-1/2 h-[82%] w-[2px] -translate-y-1/2 bg-white/10"
              aria-hidden
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-2 text-center text-[9px] tracking-[0.18em]"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '2px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              NORMAL
            </div>

            <div
              className="absolute"
              style={{
                left: `${value.x}%`,
                top: `${value.y}%`,
                width: 48,
                height: 48,
                transform: markerTransform,
                transformOrigin: 'center',
                backgroundImage: 'url(/snivy_sheet.png)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `${-frame * 48}px ${-4 * 48}px`,
                filter: `drop-shadow(0 0 10px ${room.color})`,
                imageRendering: 'pixelated',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div className="space-y-3">
            <div
              className="p-3"
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: `2px solid ${room.accent}55`,
              }}
            >
              <div className="text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                PITCH
              </div>
              <div className="mt-1 text-sm tracking-[0.16em] font-black" style={{ color: room.accent }}>
                {settings.pitch > 0 ? '+' : ''}{settings.pitch.toFixed(1)} ST
              </div>
            </div>

            <div
              className="p-3"
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: `2px solid ${room.color}55`,
              }}
            >
              <div className="text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                SPEED
              </div>
              <div className="mt-1 text-sm tracking-[0.16em] font-black" style={{ color: room.color }}>
                {settings.speed.toFixed(2)}X
              </div>
            </div>

            <div
              className="p-3"
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '2px solid rgba(118,255,3,0.32)',
              }}
            >
              <div className="text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                CENTER
              </div>
              <div className="mt-1 text-xs tracking-[0.16em] font-black" style={{ color: '#76ff03' }}>
                ORIGINAL SONG
              </div>
            </div>

            <div
              className="p-3 text-[9px] leading-relaxed tracking-[0.18em]"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.48)',
              }}
            >
              UP / DOWN CHANGES PITCH. LEFT / RIGHT CHANGES SPEED.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
    console.error('[SwitchInteriorScene] 3D scene error:', e)
    this.props.onError?.(e)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function SwitchInteriorScene({ onExit }: { onExit: () => void }) {
  const [doorOpen, setDoorOpen] = useState(true)
  const [pipePrompt, setPipePrompt] = useState<PipeConfig | null>(null)
  const [activePipeRoom, setActivePipeRoom] = useState<PipeRoom | null>(null)
  const [stemPoints, setStemPoints] = useState<Record<string, { x: number; y: number }>>(() => (
    Object.fromEntries(PIPE_ROOMS.map((room) => [room.id, DEFAULT_STEM_POINT]))
  ))
  const [pitchSpeedPoint, setPitchSpeedPoint] = useState(DEFAULT_PITCH_SPEED_POINT)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (activePipeRoom) {
        event.preventDefault()
        setActivePipeRoom(null)
        setPipePrompt(null)
        return
      }
      onExit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activePipeRoom, onExit])

  const activeStemPoint = activePipeRoom
    ? stemPoints[activePipeRoom.id] ?? DEFAULT_STEM_POINT
    : DEFAULT_STEM_POINT
  const activeStemMix = useMemo(
    () => (activePipeRoom?.mode === 'stem-mix' ? pointToStemMix(activeStemPoint) : ALL_STEMS_MIX),
    [activePipeRoom, activeStemPoint.x, activeStemPoint.y],
  )
  const activePitchSpeed = activePipeRoom?.mode === 'pitch-speed'
    ? pointToPitchSpeed(pitchSpeedPoint)
    : DEFAULT_PITCH_SPEED

  useHeadlockStems(activeStemMix, activePitchSpeed)

  return (
    <div className="absolute inset-0 z-50 bg-black">
      <Canvas
        dpr={SWITCH_DPR}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        performance={{ min: 0.65 }}
        className="absolute inset-0"
      >
        <SceneErrorBoundary onError={(e) => console.error('[Switch interior]', e)}>
          <SwitchScene
            paused={!!activePipeRoom}
            onPipePromptChange={setPipePrompt}
            onPipeEnter={(pipe) => {
              setPipePrompt(null)
              if (pipe.room) setActivePipeRoom(pipe.room)
            }}
            doorOpen={doorOpen}
            onDoorNearChange={setDoorOpen}
            onExit={onExit}
          />
        </SceneErrorBoundary>
      </Canvas>

      {pipePrompt && !activePipeRoom && <PipeEntryPrompt pipe={pipePrompt} />}

      {activePipeRoom?.mode === 'stem-mix' && (
        <PipeMusicRoom
          room={activePipeRoom}
          value={activeStemPoint}
          onChange={(next) => {
            setStemPoints((current) => ({
              ...current,
              [activePipeRoom.id]: next,
            }))
          }}
          onClose={() => {
            setActivePipeRoom(null)
            setPipePrompt(null)
          }}
        />
      )}

      {activePipeRoom?.mode === 'pitch-speed' && (
        <PipePitchSpeedRoom
          room={activePipeRoom}
          value={pitchSpeedPoint}
          onPointChange={setPitchSpeedPoint}
          onClose={() => {
            setActivePipeRoom(null)
            setPipePrompt(null)
          }}
        />
      )}

      {doorOpen && !activePipeRoom && !pipePrompt && (
        <div
          className="absolute left-[15.5%] bottom-[20%] z-50 pointer-events-none px-4 py-2 rounded-full font-mono text-[10px] tracking-[0.22em] font-bold"
          style={{
            background: 'rgba(0,0,0,0.62)',
            border: '1px solid rgba(255,215,0,0.28)',
            color: 'rgba(255,215,0,0.86)',
            backdropFilter: 'blur(8px)',
          }}
        >
          SPACE TO EXIT
        </div>
      )}

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

      <div
        className="absolute top-4 left-4 z-50 pointer-events-none px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[0.3em]"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,215,0,0.28)',
          color: 'rgba(255,215,0,0.82)',
        }}
      >
        MUSICAL THEATER
      </div>

      <div
        className="absolute top-4 right-4 z-50 pointer-events-none px-3 py-1.5 rounded-full font-mono text-[9px] tracking-[0.2em]"
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.36)',
        }}
      >
        ← → MOVE / SPACE JUMP / ESC EXIT
      </div>
    </div>
  )
}
