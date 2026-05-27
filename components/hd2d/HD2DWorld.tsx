// @ts-nocheck
'use client'

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, PerspectiveCamera, useTexture } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

type Zone = 'hub' | 'projects' | 'experience' | 'about' | 'contact'
type PortfolioBuildingId = 'projects' | 'about' | 'experience'
type PortfolioBuilding = {
  id: PortfolioBuildingId
  label: string
  shortLabel: string
  zone: Zone
  prompt: string
  x: number
  z: number
  color: string
}
type ZoneCallback = (zone: Zone) => void
type ItemCallback = (type: 'project' | 'job' | null, index: number) => void
type BattleCallback = () => void

type HD2DWorldProps = {
  paused?: boolean
  aboutCardOpen?: boolean
  introFocus?: boolean
  introOnlyAboutBall?: boolean
  introAboutStage?: AboutBallStage
  playerVisible?: boolean
  onZone: ZoneCallback
  onItem: ItemCallback
  onBattle: BattleCallback
  onAboutCardOpen?: () => void
  onEnterBuilding?: (building: PortfolioBuildingId) => void
  onBuildingNear?: (near: boolean, building?: PortfolioBuilding) => void
}

const MAP_TILES = 32
const VISUAL_W = 62
const VISUAL_D = 72
const RD0 = 14
const RD1 = 18
const SPEED = 4.7
const ZONE_RADIUS = 3.25
const CANVAS_DPR: [number, number] = [1, 1.25]
type AboutBallStage = 'closed' | 'opening' | 'open'

const ABOUT_POKEBALL = {
  x: 0,
  z: 0.22,
  radius: 0.28,
  promptRadius: 1.08,
}

const ABOUT_POKEBALL_TEXTURES: Record<AboutBallStage, string> = {
  closed: '/about-pokeball-closed.png',
  opening: '/about-pokeball-opening.png',
  open: '/about-pokeball-open.png',
}

const WORLD = {
  minX: -21,
  maxX: 21,
  minZ: -4.8,   // extended to allow back promenade
  maxZ: 4.85,
}

const MAIN_PATH = {
  zMin: 0.65,
  zMax: 3.65,
  xMin: -21,
  xMax: 21,
}

const ENTRY_PATH = {
  zMin: -1.55,
  zMax: 0.9,
  halfWidth: 1.18,
}

const BUILDING_X = {
  museum: -14.25,
  gym: -4.75,
  mart: 4.75,
  center: 14.25,
}

const ENTRY_XS = [0]

// Back promenade — east-west strip the player walks along to see all 3 buildings
const BACK_PROMENADE = {
  zMin: -4.4,
  zMax: -3.05,
  xMin: -18,
  xMax:  18,
}
// Corridor that connects the main road's entry path (z=-1.55) to the promenade
const BACK_CORRIDOR = { x: 0, halfWidth: 1.5, zMin: -4.4, zMax: -1.55 }

// 3D building positions (facing south = toward player)
const BLDG3D = {
  stadium:   { x: -12, z: -6.5 },
  deptStore: { x:   0, z: -5.8 },
  theater:   { x:  12, z: -6.5 },
}

const PORTFOLIO_BUILDINGS: PortfolioBuilding[] = [
  {
    id: 'projects',
    label: 'Projects Stadium',
    shortLabel: 'PROJECTS',
    zone: 'projects',
    prompt: 'ENTER PROJECTS STADIUM',
    x: BLDG3D.stadium.x,
    z: -3.72,
    color: '#FF006E',
  },
  {
    id: 'about',
    label: 'Pokemon Center',
    shortLabel: 'CENTER',
    zone: 'about',
    prompt: 'ENTER POKEMON CENTER',
    x: BLDG3D.deptStore.x,
    z: -3.72,
    color: '#00F5FF',
  },
  {
    id: 'experience',
    label: 'Musical Theater',
    shortLabel: 'THEATER',
    zone: 'experience',
    prompt: 'ENTER MUSICAL THEATER',
    x: BLDG3D.theater.x,
    z: -3.72,
    color: '#FFD700',
  },
]

const DEPARTMENT_STORE_ZONE = { x: 0, z: -3.8 }

const BLDG = {
  museum: { x: -999, z: -999 },
  gym:    { x: -999, z: -999 },
  mart:   DEPARTMENT_STORE_ZONE,
  center: { x: -999, z: -999 },
}

const BUILDING_BASES = {
  // Blue Pagoda  91×243 px  → keep it tall, narrow
  museum: {
    x: BUILDING_X.museum,
    z: -0.72,
    texture: '/bldg_museum.png',
    width:  2.24,   // 91/243 * 5.98
    height: 5.98,
    depth:  2.2,
    volumeHeight: 1.35,
    volumeColor: '#35496c',
    roofColor:   '#1f2e50',
  },
  // Golden Temple  149×236 px → wide, imposing
  gym: {
    x: BUILDING_X.gym,
    z: -0.76,
    texture: '/bldg_gym.png',
    width:  3.52,   // 149/236 * 5.58
    height: 5.58,
    depth:  3.0,
    volumeHeight: 1.55,
    volumeColor: '#b07c1a',
    roofColor:   '#7a5010',
  },
  // Red-roof brick tower  101×283 px → tallest, narrow
  center: {
    x: BUILDING_X.center,
    z: -0.70,
    texture: '/bldg_center.png',
    width:  2.26,   // 101/283 * 6.33
    height: 6.33,
    depth:  2.3,
    volumeHeight: 1.48,
    volumeColor: '#7a3520',
    roofColor:   '#3d1a0d',
  },
  // MART tower  115×273 px → modern glass skyscraper
  mart: {
    x: BUILDING_X.mart,
    z: -0.70,
    texture: '/bldg_mart.png',
    width:  2.56,   // 115/273 * 6.08
    height: 6.08,
    depth:  2.6,
    volumeHeight: 1.82,
    volumeColor: '#2a5870',
    roofColor:   '#1a3a50',
  },
}

const TOWN_ASSETS = {
  forestCluster: '/hd2d/town/forest_cluster_tall.png',
  forestSingle: '/hd2d/town/forest_single_tall.png',
  fenceCorner: '/hd2d/town/fence_corner.png',
  stoneRound: '/hd2d/town/stone_round.png',
  flowerA: '/hd2d/town/flower_sprinkle_a.png',
  flowerB: '/hd2d/town/flower_sprinkle_b.png',
  roadCross: '/hd2d/town/road_cross.png',
  cliffBlock: '/hd2d/town/cliff_grass_block.png',
  waterTurn: '/hd2d/town/water_turn.png',
}

const FOLIAGE_MASKS = [
  '/hd2d/kenney-foliage/sprite_0052.png',
  '/hd2d/kenney-foliage/sprite_0061.png',
  '/hd2d/kenney-foliage/sprite_0067.png',
  '/hd2d/kenney-foliage/sprite_0096.png',
  '/hd2d/kenney-foliage/sprite_0101.png',
]

const TALL_GRASS = new Set<string>()

const tileToWorld = (tileX: number, tileY: number, y = 0) => ({
  x: tileX - MAP_TILES / 2 + 0.5,
  y,
  z: tileY - MAP_TILES / 2 + 0.5,
})

const worldToTile = (x: number, z: number) => ({
  c: Math.floor(x + MAP_TILES / 2),
  r: Math.floor(z + MAP_TILES / 2),
})

type Collider =
  | { kind: 'rect'; x: number; z: number; halfW: number; halfD: number }
  | { kind: 'circle'; x: number; z: number; radius: number }

const circleCollider = (x: number, z: number, radius: number): Collider => ({ kind: 'circle', x, z, radius })
const rectCollider = (x: number, z: number, width: number, depth: number): Collider => ({
  kind: 'rect',
  x,
  z,
  halfW: width / 2,
  halfD: depth / 2,
})

const SOLID_COLLIDERS: Collider[] = [
  // Visible 3D buildings and terrain pieces near the playable promenade.
  rectCollider(BLDG3D.stadium.x, BLDG3D.stadium.z, 8.6, 3.8),
  rectCollider(BLDG3D.deptStore.x, BLDG3D.deptStore.z, 4.7, 2.2),
  rectCollider(BLDG3D.theater.x, BLDG3D.theater.z, 7.8, 3.7),
  rectCollider(-10.8, -4.65, 2.2, 1.18),
  rectCollider(10.8, -4.6, 2.2, 1.18),

  // Path-edge bushes and hedges.
  ...[-19.2, -16, -12.8, -9.6, -6.4, -3.2, 3.2, 6.4, 9.6, 12.8, 16, 19.2]
    .flatMap((x, i) => [
      circleCollider(x, 4.2 + (i % 2) * 0.1, 0.34),
      circleCollider(x, 0.14 - (i % 2) * 0.08, 0.30),
    ]),
  ...[-1.25, -0.55, 0.18, 0.82].flatMap((z) => [
    circleCollider(-1.66, z, 0.34),
    circleCollider(1.66, z, 0.34),
  ]),
  ...[-2.45, -1.95, 1.95, 2.45].map((x) => circleCollider(x, -1.38, 0.28)),

  // Planters the player can visibly bump into.
  ...[-17.2, -8.6, 0, 8.6, 17.2].map((x) => rectCollider(x, 4.76, 0.84, 0.34)),
  rectCollider(-2.08, 1.06, 0.62, 0.28),
  rectCollider(2.08, 1.06, 0.62, 0.28),
  circleCollider(ABOUT_POKEBALL.x, ABOUT_POKEBALL.z, ABOUT_POKEBALL.radius),
]

const isBlocked = (x: number, z: number) => {
  const playerRadius = 0.24
  if (
    x < WORLD.minX + playerRadius ||
    x > WORLD.maxX - playerRadius ||
    z < WORLD.minZ + playerRadius ||
    z > WORLD.maxZ - playerRadius
  ) {
    return true
  }

  return SOLID_COLLIDERS.some((collider) => {
    if (collider.kind === 'circle') {
      return Math.hypot(x - collider.x, z - collider.z) <= collider.radius + playerRadius
    }

    return (
      Math.abs(x - collider.x) <= collider.halfW + playerRadius &&
      Math.abs(z - collider.z) <= collider.halfD + playerRadius
    )
  })
}

function prepareTexture(texture: THREE.Texture, repeat?: [number, number]) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  if (repeat) texture.repeat.set(repeat[0], repeat[1])
  if (texture.image) texture.needsUpdate = true
  return texture
}

function usePreparedTexture(path: string) {
  const safePath = path || '/deco_rock.png'
  if (!path && typeof window !== 'undefined') {
    console.warn('[HD2DWorld] Missing texture path; using fallback sprite')
  }
  const texture = useTexture(safePath)
  useMemo(() => prepareTexture(texture), [texture])
  return texture
}

const shadowTextureCache = new Map<string, THREE.CanvasTexture>()

function makeShadowTexture(kind: 'contact' | 'cast') {
  const cached = shadowTextureCache.get(kind)
  if (cached) return cached

  const width = kind === 'cast' ? 192 : 128
  const height = kind === 'cast' ? 96 : 64
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(width, height)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x / width) - 0.5
      const ny = (y / height) - 0.5
      const offsetX = kind === 'cast' ? nx + 0.12 : nx
      const stretchX = kind === 'cast' ? 1.42 : 1.0
      const stretchY = kind === 'cast' ? 0.62 : 0.72
      const d = Math.sqrt((offsetX / stretchX) ** 2 + (ny / stretchY) ** 2)
      const falloff = Math.max(0, 1 - d * (kind === 'cast' ? 1.78 : 1.58))
      const feather = falloff * falloff * (3 - 2 * falloff)
      const core = Math.max(0, 1 - Math.sqrt((offsetX / 0.42) ** 2 + (ny / 0.22) ** 2))
      const alpha = Math.min(255, Math.floor((feather * 150) + (core * (kind === 'cast' ? 18 : 30))))
      const i = (y * width + x) * 4
      pixels.data[i + 0] = 48
      pixels.data[i + 1] = 38
      pixels.data[i + 2] = 16
      pixels.data[i + 3] = alpha
    }
  }

  ctx.putImageData(pixels, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  shadowTextureCache.set(kind, texture)
  return texture
}

function useShadowTexture(kind: 'contact' | 'cast') {
  return useMemo(() => makeShadowTexture(kind), [kind])
}

function HD2DCamera({ target, zoomed = false }: { target: THREE.Vector3; zoomed?: boolean }) {
  const { camera } = useThree()
  const rig = useRef({
    current: new THREE.Vector3(0, 4.35, 11.2),
    look: new THREE.Vector3(),
    desiredCurrent: new THREE.Vector3(),
    desiredLook: new THREE.Vector3(),
  })

  useFrame(() => {
    if (zoomed) {
      rig.current.desiredLook.set(ABOUT_POKEBALL.x, 0.58, ABOUT_POKEBALL.z + 0.06)
      rig.current.desiredCurrent.set(ABOUT_POKEBALL.x, 2.08, ABOUT_POKEBALL.z + 4.35)
    } else {
      rig.current.desiredLook.set(target.x, 0.78, target.z - 1.18)
      rig.current.desiredCurrent.set(target.x, 4.35, target.z + 11.2)
    }

    rig.current.look.lerp(rig.current.desiredLook, zoomed ? 0.075 : 0.085)
    rig.current.current.lerp(rig.current.desiredCurrent, zoomed ? 0.075 : 0.085)
    camera.position.copy(rig.current.current)
    camera.lookAt(rig.current.look.x, rig.current.look.y, rig.current.look.z)
    if ('fov' in camera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, zoomed ? 20 : 31, 0.075)
      camera.updateProjectionMatrix()
    }
  })

  return null
}

function GoldenHourLights() {
  return (
    <>
      <ambientLight color="#56617f" intensity={0.36} />
      <hemisphereLight args={['#ffe0b8', '#071205', 0.96]} />
      <directionalLight
        color="#ffc06f"
        intensity={5.45}
        position={[-8.8, 8.2, 10.8]}
      />
      <pointLight color="#ff8a4c" intensity={6.4} distance={20} decay={2} position={[-5.5, 3.2, 5.8]} />
      <spotLight color="#ffd093" intensity={2.1} distance={18} angle={0.38} penumbra={0.72} position={[2.8, 5.2, 5.2]} target-position={[0, 0, 0.8]} />
    </>
  )
}

function GroundPlane() {
  const grass = useTexture('/grass_tile.png')
  const road = useTexture('/road_tile.png')
  const grassMap    = useMemo(() => prepareTexture(grass, [VISUAL_W, VISUAL_D]), [grass])
  const horizontalRoad = useMemo(() => prepareTexture(road.clone(), [VISUAL_W, 3]), [road])
  const entryRoad   = useMemo(() => prepareTexture(road.clone(), [2.4, 6.3]), [road])
  const promsW      = BACK_PROMENADE.xMax - BACK_PROMENADE.xMin
  const promsD      = BACK_PROMENADE.zMax - BACK_PROMENADE.zMin
  const promRoad    = useMemo(() => prepareTexture(road.clone(), [promsW, promsD * 2]), [road])
  const corrD       = BACK_CORRIDOR.zMax - BACK_CORRIDOR.zMin
  const corrRoad    = useMemo(() => prepareTexture(road.clone(), [BACK_CORRIDOR.halfWidth * 2, corrD * 2.5]), [road])

  return (
    <group>
      <mesh receiveShadow position={[0, -0.32, 0]}>
        <boxGeometry args={[VISUAL_W + 0.2, 0.62, VISUAL_D + 0.2]} />
        <meshStandardMaterial color="#274319" roughness={1} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[VISUAL_W, VISUAL_D]} />
        <meshStandardMaterial map={grassMap} color="#d3e47a" roughness={0.94} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, (MAIN_PATH.zMin + MAIN_PATH.zMax) / 2]}>
        <planeGeometry args={[VISUAL_W, MAIN_PATH.zMax - MAIN_PATH.zMin]} />
        <meshStandardMaterial map={horizontalRoad} color="#ffd4a3" roughness={0.88} />
      </mesh>

      {ENTRY_XS.map((x) => (
        <mesh key={x} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.024, (ENTRY_PATH.zMin + ENTRY_PATH.zMax) / 2]}>
          <planeGeometry args={[ENTRY_PATH.halfWidth * 2.15, ENTRY_PATH.zMax - ENTRY_PATH.zMin]} />
          <meshStandardMaterial map={entryRoad} color="#ffd4a3" roughness={0.88} />
        </mesh>
      ))}

      {/* Back promenade road */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (BACK_PROMENADE.xMin + BACK_PROMENADE.xMax) / 2,
          0.018,
          (BACK_PROMENADE.zMin + BACK_PROMENADE.zMax) / 2,
        ]}>
        <planeGeometry args={[promsW, promsD]} />
        <meshStandardMaterial map={promRoad} color="#ffd4a3" roughness={0.88} />
      </mesh>

      {/* Back corridor connecting main entry path → promenade */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}
        position={[BACK_CORRIDOR.x, 0.018, (BACK_CORRIDOR.zMin + BACK_CORRIDOR.zMax) / 2]}>
        <planeGeometry args={[BACK_CORRIDOR.halfWidth * 2, corrD]} />
        <meshStandardMaterial map={corrRoad} color="#ffd4a3" roughness={0.88} />
      </mesh>

      <PathEdgeLines />

      <GroundGridAccents />
    </group>
  )
}

function GroundGridAccents() {
  return null
}

function RaisedLedge({
  x,
  z,
  width,
  depth,
  height,
}: {
  x: number
  z: number
  width: number
  depth: number
  height: number
}) {
  const grass = useTexture('/grass_tile.png')
  const topMap = useMemo(() => prepareTexture(grass.clone(), [width, depth]), [grass, width, depth])

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#9a6235" roughness={0.92} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, height + 0.018, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={topMap} color="#bed86e" roughness={0.88} />
      </mesh>
      <mesh receiveShadow position={[0, height * 0.52, depth / 2 + 0.022]}>
        <boxGeometry args={[width, height * 0.94, 0.04]} />
        <meshStandardMaterial color="#7a4929" roughness={0.96} />
      </mesh>
    </group>
  )
}

function StoneSteps({ x, z, width = 2.4, count = 5 }: { x: number; z: number; width?: number; count?: number }) {
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, 0.055 + i * 0.09, i * -0.34]}>
          <boxGeometry args={[width - i * 0.08, 0.11, 0.36]} />
          <meshStandardMaterial color={i % 2 ? '#b68a5c' : '#c29768'} roughness={0.82} metalness={0.02} />
        </mesh>
      ))}
    </group>
  )
}

function WaterRibbon() {
  const material = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.opacity = 0.36 + Math.sin(clock.elapsedTime * 1.8) * 0.035
  })

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-16.4, 0.035, -5.45]}>
      <planeGeometry args={[7.8, 1.2, 12, 2]} />
      <meshStandardMaterial
        ref={material}
        color="#6ec5c9"
        emissive="#143d3d"
        emissiveIntensity={0.12}
        roughness={0.24}
        metalness={0.18}
        transparent
        opacity={0.36}
      />
    </mesh>
  )
}

function WorldGeometry() {
  return (
    <>
      <RaisedLedge x={-15.8} z={-6.95} width={9.6} depth={3.6} height={0.72} />
      <RaisedLedge x={15.7} z={-6.85} width={9.2} depth={3.4} height={0.8} />
      <StoneSteps x={-10.8} z={-4.65} width={2.2} count={5} />
      <StoneSteps x={10.8} z={-4.6} width={2.2} count={5} />
      <WaterRibbon />
    </>
  )
}

function PathEdgeLines() {
  const mainEdges = [MAIN_PATH.zMin, MAIN_PATH.zMax]
  const entryEdges = ENTRY_XS.flatMap((x) => ([
    { key: `${x}-l`, x: x - ENTRY_PATH.halfWidth },
    { key: `${x}-r`, x: x + ENTRY_PATH.halfWidth },
  ]))

  return (
    <group>
      {mainEdges.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.03, z]}>
          <planeGeometry args={[0.08, VISUAL_W]} />
          <meshBasicMaterial color="#7e9a4a" transparent opacity={0.34} depthWrite={false} />
        </mesh>
      ))}
      {entryEdges.map((edge) => (
        <mesh key={edge.key} rotation={[-Math.PI / 2, 0, 0]} position={[edge.x, 0.031, (ENTRY_PATH.zMin + ENTRY_PATH.zMax) / 2]}>
          <planeGeometry args={[0.06, ENTRY_PATH.zMax - ENTRY_PATH.zMin]} />
          <meshBasicMaterial color="#7e9a4a" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function ContactShadowBlob({
  x,
  z,
  y = 0.035,
  width,
  depth,
  opacity = 0.34,
  angle = -0.08,
}: {
  x: number
  z: number
  y?: number
  width: number
  depth: number
  opacity?: number
  angle?: number
}) {
  const map = useShadowTexture('contact')

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, angle]}
      position={[x, y, z + depth * 0.12]}
      scale={[width, depth, 1]}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        color="#3c2e13"
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function LongShadow({
  x,
  z,
  width,
  length,
  opacity = 0.24,
}: {
  x: number
  z: number
  width: number
  length: number
  opacity?: number
}) {
  const map = useShadowTexture('cast')

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, -0.18]}
      position={[x + 0.32, 0.032, z + length * 0.38]}
      scale={[width, length, 1]}
      renderOrder={0}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        color="#3a2c12"
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function BillboardSprite({
  texture,
  x,
  z,
  y = 0,
  width,
  height,
  tint = '#ffc37a',
  shadow = true,
  shadowScale = 1,
  opacity = 1,
}: {
  texture: string
  x: number
  z: number
  y?: number
  width: number
  height: number
  tint?: string
  shadow?: boolean
  shadowScale?: number
  opacity?: number
}) {
  const map = usePreparedTexture(texture)

  return (
    <group position={[x, y, z]}>
      {shadow && (
        <>
          <LongShadow
            x={0}
            z={0.18}
            width={width * 0.58 * shadowScale}
            length={height * 0.5 * shadowScale}
            opacity={0.085}
          />
          <ContactShadowBlob
            x={0}
            z={0.08}
            width={width * 0.72 * shadowScale}
            depth={0.42 * shadowScale}
            opacity={0.15}
          />
        </>
      )}
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={map}
          transparent
          alphaTest={0.12}
          opacity={opacity}
          color={tint}
          depthWrite={opacity > 0.72}
          side={THREE.DoubleSide}
          roughness={0.86}
          metalness={0.02}
          emissive="#201005"
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  )
}

function AboutPokeball({
  stage,
  near,
  intro = false,
}: {
  stage: AboutBallStage
  near: boolean
  intro?: boolean
}) {
  const map = usePreparedTexture(ABOUT_POKEBALL_TEXTURES[stage])
  const ballMeshRef = useRef<THREE.Mesh>(null)
  const tiltTargetRef = useRef({ x: 0, y: 0 })
  const introScale = intro ? 1.34 : 1
  const baseSize = stage === 'open'
    ? { width: 0.54, height: 0.72, y: 0.03 }
    : stage === 'opening'
      ? { width: 0.56, height: 0.62, y: 0.03 }
      : { width: 0.5, height: 0.5, y: 0.03 }
  const size = {
    width: baseSize.width * introScale,
    height: baseSize.height * introScale,
    y: baseSize.y,
  }

  useEffect(() => {
    if (!intro) {
      tiltTargetRef.current = { x: 0, y: 0 }
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5
      const ny = event.clientY / window.innerHeight - 0.5
      tiltTargetRef.current = {
        x: THREE.MathUtils.clamp(-ny * 0.32, -0.18, 0.18),
        y: THREE.MathUtils.clamp(nx * 0.46, -0.24, 0.24),
      }
    }

    const handlePointerLeave = () => {
      tiltTargetRef.current = { x: 0, y: 0 }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('blur', handlePointerLeave)
    document.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', handlePointerLeave)
      document.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [intro])

  useFrame(() => {
    if (!ballMeshRef.current) return
    const target = intro ? tiltTargetRef.current : { x: 0, y: 0 }
    ballMeshRef.current.rotation.x = THREE.MathUtils.lerp(ballMeshRef.current.rotation.x, target.x, 0.14)
    ballMeshRef.current.rotation.y = THREE.MathUtils.lerp(ballMeshRef.current.rotation.y, target.y, 0.14)
  })

  return (
    <group position={[ABOUT_POKEBALL.x, size.y, ABOUT_POKEBALL.z]}>
      <LongShadow x={0.03} z={0.12} width={0.3} length={0.42} opacity={0.14} />
      <ContactShadowBlob x={0} z={0.04} width={0.34} depth={0.17} opacity={0.3} />
      <mesh ref={ballMeshRef} position={[0, size.height / 2, 0]}>
        <planeGeometry args={[size.width, size.height]} />
        <meshStandardMaterial
          map={map}
          transparent
          alphaTest={0.08}
          color="#fff3df"
          depthWrite
          side={THREE.DoubleSide}
          roughness={0.72}
          metalness={0}
          emissive={stage === 'closed' ? '#1f0906' : '#2b1604'}
          emissiveIntensity={stage === 'closed' ? 0.12 : 0.2}
        />
      </mesh>

      {near && stage === 'closed' && (
        <Html
          transform
          center
          distanceFactor={8}
          position={[0, 1.18, 0.05]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              padding: '7px 12px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.24)',
              background: 'rgba(8,10,14,0.56)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              color: 'rgba(255,255,255,0.88)',
              fontFamily: 'monospace',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.18em',
              lineHeight: 1,
              textShadow: '0 2px 0 #000',
              whiteSpace: 'nowrap',
            }}
          >
            PRESS SPACE TO OPEN
          </div>
        </Html>
      )}
    </group>
  )
}

// ── Shared material processor for all baked-lightmap OBJ buildings ───────────
//
// patchBakedMaterials mutates `root` in-place.  It swaps each non-shadow mesh
// material to an unlit MeshBasicMaterial ONLY when the diffuse texture has
// already finished loading (map.image is truthy).  If a texture is still in
// flight the original MeshPhongMaterial is left untouched — Three.js will
// automatically populate mat.map.image and mark the texture for re-upload on
// the next render frame, so the building shows up textured once the XHR
// completes even without a React re-render.
//
// Returns true when every non-shadow material has been converted (all textures
// were ready), or false when at least one texture was still loading.
function patchBakedMaterials(root: THREE.Object3D): boolean {
  let allReady = true

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow    = false
    child.receiveShadow = false

    const rawMats = Array.isArray(child.material) ? child.material : [child.material]
    const newMats = rawMats.map((mat: any) => {
      const isShadow = mat.name?.toLowerCase().includes('kage')

      if (isShadow) {
        mat.side        = THREE.DoubleSide
        mat.alphaMap    = null
        mat.transparent = true
        mat.opacity     = 0.30
        mat.depthWrite  = false
        mat.alphaTest   = 0
        mat.needsUpdate = true
        return mat
      }

      // Already converted on a previous pass — skip.
      if (mat instanceof THREE.MeshBasicMaterial) return mat

      const map: THREE.Texture | null = mat.map ?? null

      if (map && map.image) {
        // Texture is fully loaded — upgrade to unlit MeshBasicMaterial so the
        // baked lighting in the texture isn't double-darkened by scene lights.
        map.colorSpace      = THREE.SRGBColorSpace
        map.magFilter       = THREE.NearestFilter
        map.minFilter       = THREE.NearestFilter
        map.generateMipmaps = false
        map.needsUpdate     = true
        return new THREE.MeshBasicMaterial({
          map,
          transparent: false,
          alphaTest:   0.05,
          side:        THREE.DoubleSide,
          color:       new THREE.Color(1.0, 0.97, 0.92),
        })
      }

      // Texture not ready yet — leave the MeshPhongMaterial in place.
      // Three.js will fill map.image and trigger a re-upload automatically.
      allReady = false
      return mat
    })

    child.material = newMats.length === 1 ? newMats[0] : newMats
  })

  return allReady
}

// ── Per-building isolated loader classes ──────────────────────────────────────
// R3F's useLoader caches ONE loader instance per class (WeakMap keyed on the
// constructor).  All three buildings would share a single MTLLoader and a
// single OBJLoader, causing a race where the last call to setResourcePath /
// setPath overwrites the shared state before an earlier building's XHR
// response is parsed — so all textures end up loading from the wrong directory.
//
// Giving each building its own subclass guarantees an isolated instance.
// The class objects are defined at module scope so their identity is stable
// across re-renders (required for the useLoader cache key to be consistent).
class StadiumMTLLoader extends MTLLoader {}
class StadiumOBJLoader extends OBJLoader {}
class PCMTLLoader     extends MTLLoader {}
class PCOBJLoader     extends OBJLoader {}
class TheaterMTLLoader extends MTLLoader {}
class TheaterOBJLoader extends OBJLoader {}

// ── Generic OBJ building renderer ─────────────────────────────────────────────
// MTLClass / OBJClass — per-building loader subclasses (see above).
// assetPath  = URL directory ending in '/'  e.g. '/3d/big-stadium/'
// mtlFile    = just the filename            e.g. 'Big%20Stadium.mtl'
// objFile    = just the filename            e.g. 'Big%20Stadium.obj'
//
// Material patching is deferred to a useEffect with exponential-backoff retries
// so that textures have time to finish loading before patchBakedMaterials runs.
// R3F renders every frame so mutating child.material is picked up automatically
// without a React state update.
function ObjBuilding({
  MTLClass, OBJClass,
  assetPath, mtlFile, objFile, x, z, scale, rotY = 0,
  shadowW = 5, shadowD = 4,
}: {
  MTLClass: typeof MTLLoader; OBJClass: typeof OBJLoader
  assetPath: string; mtlFile: string; objFile: string
  x: number; z: number; scale: number
  rotY?: number; shadowW?: number; shadowD?: number
}) {
  const materials = useLoader(MTLClass, mtlFile, (loader) => {
    loader.setPath(assetPath)          // where to fetch the .mtl file from
    loader.setResourcePath(assetPath)  // where textures listed in .mtl live
    loader.setMaterialOptions({ side: THREE.DoubleSide, invertTrProperty: false })
  })
  const obj = useLoader(OBJClass, objFile, (loader) => {
    loader.setPath(assetPath)          // where to fetch the .obj file from
    materials.preload()
    loader.setMaterials(materials)
  })

  // Centre the geometry once — no texture dependency here.
  const model = useMemo(() => {
    const cloned = obj.clone(true)
    const bounds = new THREE.Box3().setFromObject(cloned)
    const center = bounds.getCenter(new THREE.Vector3())
    cloned.position.set(-center.x, -bounds.min.y, -center.z)
    return cloned
  }, [obj])

  // Defer material patching until textures have loaded, with backoff retries.
  // The retry schedule covers the typical 50–800 ms XHR window for local assets.
  useEffect(() => {
    if (patchBakedMaterials(model)) return // all textures already loaded — done

    let cancelled = false
    // Retry at 150 ms, 500 ms, 1.2 s, 2.5 s — enough even for slow connections.
    const delays = [150, 500, 1200, 2500]
    const timers = delays.map((d) =>
      setTimeout(() => { if (!cancelled) patchBakedMaterials(model) }, d)
    )
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [model])

  return (
    <group position={[x, 0.02, z]}>
      <ContactShadowBlob x={0} z={shadowD * 0.15} width={shadowW} depth={shadowD} opacity={0.20} />
      <group rotation={[0, rotY, 0]} scale={scale}>
        <primitive object={model} />
      </group>
    </group>
  )
}

// ── Three buildings side by side ──────────────────────────────────────────────
function Buildings() {
  return (
    <>
      {/* Big Stadium — west slot */}
      <ObjBuilding
        MTLClass={StadiumMTLLoader} OBJClass={StadiumOBJLoader}
        assetPath="/3d/big-stadium/"
        mtlFile="Big%20Stadium.mtl"
        objFile="Big%20Stadium.obj"
        x={BLDG3D.stadium.x} z={BLDG3D.stadium.z}
        scale={0.026}
        shadowW={9} shadowD={6}
      />

      {/* Pokémon Center — centre slot */}
      <ObjBuilding
        MTLClass={PCMTLLoader} OBJClass={PCOBJLoader}
        assetPath="/3d/pokemon-center/Pokemon%20Center/"
        mtlFile="Pokemon%20Center.mtl"
        objFile="Pokemon%20Center.obj"
        x={BLDG3D.deptStore.x} z={BLDG3D.deptStore.z}
        scale={0.036}
        shadowW={6} shadowD={4}
      />

      {/* Musical Theater — east slot */}
      <ObjBuilding
        MTLClass={TheaterMTLLoader} OBJClass={TheaterOBJLoader}
        assetPath="/3d/musical-theater/"
        mtlFile="Musical%20Theater.mtl"
        objFile="Musical%20Theater.obj"
        x={BLDG3D.theater.x} z={BLDG3D.theater.z}
        scale={0.026}
        shadowW={8} shadowD={6}
      />
    </>
  )
}

function BuildingSprite({
  texture,
  x,
  z,
  width,
  height,
  depth,
  volumeHeight,
  volumeColor,
  roofColor,
}: {
  texture: string
  x: number
  z: number
  width: number
  height: number
  depth: number
  volumeHeight: number
  volumeColor: string
  roofColor: string
}) {
  const map = usePreparedTexture(texture)

  return (
    <group position={[x, 0, z]}>
      <LongShadow x={0.08} z={depth * 0.25} width={width * 0.58} length={height * 0.46} opacity={0.082} />
      <ContactShadowBlob x={0} z={depth * 0.06} width={width * 0.72} depth={depth * 0.34} opacity={0.16} />

      <mesh position={[0, height / 2 + 0.02, -0.04]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={map}
          transparent
          alphaTest={0.12}
          color="#ffd4a4"
          depthWrite
          side={THREE.DoubleSide}
          roughness={0.86}
          emissive="#201005"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  )
}

function PerimeterTrees() {
  const trees: Array<{ x: number; z: number; key: string; scale: number }> = []
  let idx = 0
  const add = (tc: number, tr: number, scale = 1) => {
    const p = tileToWorld(tc, tr)
    trees.push({ x: p.x, z: p.z, scale, key: idx++ % 2 ? '/deco_tree_pine2.png' : '/deco_tree_pine.png' })
  }

  for (let c = 1; c < MAP_TILES - 1; c += 2) {
    if (!(c >= RD0 - 1 && c <= RD1)) add(c, 1)
  }
  for (let c = 1; c < MAP_TILES - 1; c += 2) {
    if (!(c >= RD0 - 1 && c <= RD1)) add(c, MAP_TILES - 2)
  }
  for (let r = 3; r < MAP_TILES - 3; r += 2) {
    if (!(r >= RD0 - 1 && r <= RD1)) add(1, r)
  }
  for (let r = 3; r < MAP_TILES - 3; r += 2) {
    if (!(r >= RD0 - 1 && r <= RD1)) add(MAP_TILES - 2, r)
  }

  // Visual-only apron rows. These live outside the playable collision grid so
  // the low camera always has foreground/background foliage instead of a hard map edge.
  for (let c = -2; c <= MAP_TILES + 1; c += 2) {
    if (!(c >= RD0 - 1 && c <= RD1)) {
      add(c, -8, 1.08)
      add(c, MAP_TILES + 7, 1.12)
    }
  }
  for (let r = -6; r <= MAP_TILES + 5; r += 3) {
    add(-4, r, 1.08)
    add(MAP_TILES + 3, r, 1.08)
  }

  // Dense stage dressing beyond the map. These rows are intentionally visual-only:
  // they close the horizon and foreground like a theater set without changing collision.
  for (let row = 0; row < 5; row++) {
    const tr = -15 + row * 2
    for (let c = -8; c <= MAP_TILES + 7; c += 2) {
      add(c + (row % 2), tr, 1.28 + row * 0.05)
    }
  }
  for (let row = 0; row < 4; row++) {
    const tr = MAP_TILES + 8 + row * 2
    for (let c = -8; c <= MAP_TILES + 7; c += 2) {
      add(c + (row % 2), tr, 1.22 + row * 0.04)
    }
  }
  for (let r = -12; r <= MAP_TILES + 12; r += 2) {
    add(-8, r, 1.22)
    add(-6, r + 1, 1.12)
    add(MAP_TILES + 7, r, 1.22)
    add(MAP_TILES + 5, r + 1, 1.12)
  }

  return (
    <>
      {trees.map((tree, i) => (
        <BillboardSprite
          key={`${tree.x}-${tree.z}-${i}`}
          texture={tree.key}
          x={tree.x}
          z={tree.z}
          width={1.35 * tree.scale}
          height={2.12 * tree.scale}
          tint="#ffbd70"
          shadowScale={1.15 * tree.scale}
        />
      ))}
    </>
  )
}

function ForestBackdrop() {
  const clusters = useMemo(() => {
    const result: Array<{
      x: number
      z: number
      texture: string
      scale: number
      opacity: number
      tint: string
      shadow: boolean
    }> = []

    const addRow = (z: number, scale: number, opacity: number, tint: string, offset = 0) => {
      for (let x = -30; x <= 30; x += 3.6) {
        result.push({
          x: x + offset,
          z,
          texture: TOWN_ASSETS.forestCluster,
          scale,
          opacity,
          tint,
          shadow: false,
        })
      }
    }

    addRow(-17.5, 1.22, 0.66, '#8e744d', 0.7)
    addRow(-14.2, 1.08, 0.86, '#c39558', -0.6)

    for (let z = -13; z <= 9; z += 4.4) {
      result.push({ x: -25.5, z, texture: TOWN_ASSETS.forestCluster, scale: 1.08, opacity: 0.84, tint: '#b8874e', shadow: false })
      result.push({ x: 25.5, z, texture: TOWN_ASSETS.forestCluster, scale: 1.08, opacity: 0.84, tint: '#b8874e', shadow: false })
    }

    return result
  }, [])

  return (
    <>
      <mesh position={[0, 2.8, -18.6]}>
        <planeGeometry args={[72, 9]} />
        <meshBasicMaterial color="#1e2b14" transparent opacity={0.76} depthWrite={false} />
      </mesh>
      {clusters.map((cluster, i) => (
        <BillboardSprite
          key={`${cluster.x}-${cluster.z}-${i}`}
          texture={cluster.texture}
          x={cluster.x}
          z={cluster.z}
          width={cluster.texture === TOWN_ASSETS.forestCluster ? 3.25 * cluster.scale : 0.88 * cluster.scale}
          height={cluster.texture === TOWN_ASSETS.forestCluster ? 5.65 * cluster.scale : 4.6 * cluster.scale}
          tint={cluster.tint}
          opacity={cluster.opacity}
          shadow={cluster.shadow}
          shadowScale={1.35 * cluster.scale}
        />
      ))}
    </>
  )
}

function GroundClutter() {
  const clumps = useMemo(() => {
    const result: Array<{ x: number; z: number; texture: string; width: number; height: number; tint: string; opacity: number }> = []
    const add = (x: number, z: number, i: number, tint = '#67b64d', size = 1, opacity = 0.72) => {
      const textureIndex = ((i % FOLIAGE_MASKS.length) + FOLIAGE_MASKS.length) % FOLIAGE_MASKS.length
      result.push({
        x,
        z,
        texture: FOLIAGE_MASKS[textureIndex],
        width: 0.38 * size,
        height: 0.42 * size,
        tint,
        opacity,
      })
    }

    for (let z = -14; z <= 15; z += 1.45) {
      add(-2.7, z, Math.round(z * 10), '#4f9a3e', 0.58, 0.58)
      add(2.7, z + 0.46, Math.round(z * 12) + 1, '#5da848', 0.54, 0.54)
    }
    for (let x = -14; x <= 14; x += 1.55) {
      add(x, -2.68, Math.round(x * 10) + 2, '#5b9c42', 0.48, 0.5)
      add(x + 0.42, 2.78, Math.round(x * 12) + 4, '#6eaa47', 0.46, 0.48)
    }

    const flowerRows = [
      [-10.5, -10.5], [-9.5, -10.2], [-8.5, -10.55],
      [8.4, -10.8], [9.4, -10.35], [10.4, -10.62],
      [-11.4, 8.2], [-10.4, 8.55], [-9.4, 8.25],
      [8.8, 8.1], [9.8, 8.45], [10.8, 8.15],
    ]
    flowerRows.forEach(([x, z], i) => add(x, z, i + 4, i % 2 ? '#f06eab' : '#f6c35f', 0.46, 0.78))

    return result
  }, [])

  return (
    <>
      {clumps.map((clump, i) => (
        <BillboardSprite
          key={`${clump.x}-${clump.z}-${i}`}
          texture={clump.texture}
          x={clump.x}
          z={clump.z}
          y={0.04}
          width={clump.width}
          height={clump.height}
          tint={clump.tint}
          opacity={clump.opacity}
          shadow={false}
        />
      ))}
    </>
  )
}

function Crate({ x, z, y = 0, scale = 1 }: { x: number; z: number; y?: number; scale?: number }) {
  return (
    <group position={[x, y, z]}>
      <ContactShadowBlob x={0} z={0.05} width={0.66 * scale} depth={0.42 * scale} opacity={0.36} />
      <mesh castShadow receiveShadow position={[0, 0.27 * scale, 0]}>
        <boxGeometry args={[0.55 * scale, 0.54 * scale, 0.55 * scale]} />
        <meshStandardMaterial color="#8b542d" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.55 * scale, 0]}>
        <boxGeometry args={[0.61 * scale, 0.05 * scale, 0.61 * scale]} />
        <meshStandardMaterial color="#c98745" roughness={0.74} />
      </mesh>
    </group>
  )
}

function Barrel({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]}>
      <ContactShadowBlob x={0} z={0.04} width={0.58 * scale} depth={0.4 * scale} opacity={0.32} />
      <mesh castShadow receiveShadow position={[0, 0.35 * scale, 0]} rotation={[0, Math.PI / 8, 0]}>
        <cylinderGeometry args={[0.26 * scale, 0.3 * scale, 0.7 * scale, 10]} />
        <meshStandardMaterial color="#8b4f29" roughness={0.84} />
      </mesh>
    </group>
  )
}

function PlanterBox({
  x,
  z,
  mirror = false,
  scale = 1,
}: {
  x: number
  z: number
  mirror?: boolean
  scale?: number
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, mirror ? Math.PI : 0, 0]}>
      <ContactShadowBlob x={0} z={0.06} width={1.05 * scale} depth={0.45 * scale} opacity={0.28} />
      <mesh receiveShadow position={[0, 0.17 * scale, 0]}>
        <boxGeometry args={[0.98 * scale, 0.34 * scale, 0.34 * scale]} />
        <meshStandardMaterial color="#8f5a2f" roughness={0.88} />
      </mesh>
      <mesh position={[0, 0.38 * scale, 0]}>
        <boxGeometry args={[1.06 * scale, 0.08 * scale, 0.4 * scale]} />
        <meshStandardMaterial color="#c98643" roughness={0.76} />
      </mesh>
      <BillboardSprite
        texture={TOWN_ASSETS.flowerA}
        x={-0.22 * scale}
        z={-0.05 * scale}
        y={0.36 * scale}
        width={0.56 * scale}
        height={0.38 * scale}
        tint="#ffd4a8"
        shadow={false}
      />
      <BillboardSprite
        texture={TOWN_ASSETS.flowerB}
        x={0.24 * scale}
        z={0.02 * scale}
        y={0.36 * scale}
        width={0.62 * scale}
        height={0.38 * scale}
        tint="#ffc5a4"
        shadow={false}
      />
    </group>
  )
}

function Flag({
  x,
  y,
  z,
  color,
  scale = 1,
}: {
  x: number
  y: number
  z: number
  color: string
  scale?: number
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(-0.18 * scale, 0.2 * scale)
    s.lineTo(0.18 * scale, 0.2 * scale)
    s.lineTo(0, -0.24 * scale)
    s.lineTo(-0.18 * scale, 0.2 * scale)
    return s
  }, [scale])

  return (
      <mesh position={[x, y, z]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
  )
}

function PortfolioSign({
  x,
  z,
  label,
  color,
}: {
  x: number
  z: number
  label: string
  color: string
}) {
  return (
    <group position={[x, 0, z]}>
      <ContactShadowBlob x={0} z={0.04} width={1.12} depth={0.34} opacity={0.22} />
      <mesh castShadow receiveShadow position={[-0.42, 0.34, 0]}>
        <boxGeometry args={[0.055, 0.68, 0.055]} />
        <meshStandardMaterial color="#55341f" roughness={0.82} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.42, 0.34, 0]}>
        <boxGeometry args={[0.055, 0.68, 0.055]} />
        <meshStandardMaterial color="#55341f" roughness={0.82} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.78, 0]}>
        <boxGeometry args={[1.25, 0.42, 0.08]} />
        <meshStandardMaterial color="#2b2118" roughness={0.76} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      <Html
        transform
        center
        distanceFactor={8}
        position={[0, 0.79, 0.052]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            minWidth: 84,
            padding: '5px 8px',
            border: `1px solid ${color}88`,
            borderRadius: 4,
            background: 'rgba(11, 10, 8, 0.9)',
            color,
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.16em',
            lineHeight: 1,
            textAlign: 'center',
            textShadow: '0 1px 0 #000',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

function PortfolioSigns() {
  return (
    <>
      {PORTFOLIO_BUILDINGS.map((building) => (
        <PortfolioSign
          key={building.id}
          x={building.x}
          z={building.z + 0.54}
          label={building.shortLabel}
          color={building.color}
        />
      ))}
    </>
  )
}

function Bunting() {
  const colors = ['#ce3146', '#e0a52d', '#2fae67', '#315cc8', '#d73c82']
  const flags = useMemo(() => {
    const result: Array<{ x: number; y: number; z: number; color: string }> = []
    for (let i = 0; i < 19; i++) {
      result.push({
        x: -13.5 + i * 1.5,
        y: 4.05 + Math.sin(i * 0.8) * 0.18,
        z: -8.9 + Math.sin(i * 0.45) * 0.12,
        color: colors[i % colors.length],
      })
    }
    return result
  }, [])

  return (
    <group>
      <mesh position={[0, 4.2, -8.9]} rotation={[0, 0, -0.03]}>
        <boxGeometry args={[28.4, 0.025, 0.025]} />
        <meshBasicMaterial color="#4f2e1f" />
      </mesh>
      {flags.map((flag, i) => <Flag key={i} {...flag} scale={0.72} />)}
    </group>
  )
}

function StageDressing() {
  return (
    <>
      <Bunting />
      <BillboardSprite texture={TOWN_ASSETS.fenceCorner} x={-12.8} z={-11.2} width={2.65} height={1.64} tint="#ffc47b" shadowScale={0.45} />
      <BillboardSprite texture={TOWN_ASSETS.fenceCorner} x={12.8} z={-11.2} width={2.65} height={1.64} tint="#ffc47b" shadowScale={0.45} />
      <BillboardSprite texture={TOWN_ASSETS.stoneRound} x={-11.8} z={5.7} width={1.5} height={1.25} tint="#ffd2a0" shadowScale={0.45} />
      <BillboardSprite texture={TOWN_ASSETS.stoneRound} x={11.8} z={5.7} width={1.5} height={1.25} tint="#ffd2a0" shadowScale={0.45} />

      <Crate x={-4.15} z={-6.4} scale={0.82} />
      <Crate x={-3.55} z={-6.05} scale={0.68} />
      <Barrel x={4.05} z={-6.35} scale={0.86} />
      <Barrel x={4.7} z={-6.08} scale={0.72} />
      <Crate x={-11.6} z={11.2} scale={0.72} />
      <Barrel x={10.6} z={11.1} scale={0.75} />

      <BillboardSprite texture={TOWN_ASSETS.flowerA} x={-6.8} z={-6.8} width={0.88} height={0.62} tint="#ffd6aa" shadow={false} />
      <BillboardSprite texture={TOWN_ASSETS.flowerB} x={6.9} z={-6.7} width={1.04} height={0.62} tint="#ffd6aa" shadow={false} />
      <BillboardSprite texture={TOWN_ASSETS.flowerA} x={-7.6} z={10.1} width={0.88} height={0.62} tint="#ffd6aa" shadow={false} />
      <BillboardSprite texture={TOWN_ASSETS.flowerB} x={7.6} z={10.1} width={1.04} height={0.62} tint="#ffd6aa" shadow={false} />
    </>
  )
}

function StreetDecorations() {
  const entryXs = ENTRY_XS
  const backgroundTrees = [-20.5, -15.3, -10.1, -1.7, 1.7, 10.1, 15.3, 20.5]
  const foregroundTrees = [-18.4, -12.2, -6, 6, 12.2, 18.4]
  const pathRhythm = [-19.2, -16, -12.8, -9.6, -6.4, -3.2, 3.2, 6.4, 9.6, 12.8, 16, 19.2]
  const promenadePlanters = [-17.2, -8.6, 0, 8.6, 17.2]
  const entryHedgeZ = [-1.25, -0.55, 0.18, 0.82]
  const buildingBedOffsets = [-2.45, -1.95, 1.95, 2.45]
  const foregroundCurtain = [-18, -12, -6, 6, 12, 18]

  return (
    <>
      {backgroundTrees.map((x, i) => (
        <BillboardSprite
          key={`back-tree-${x}`}
          texture={i % 2 ? '/deco_tree_pine2.png' : '/deco_tree_pine.png'}
          x={x}
          z={-8.15}
          width={1.18}
          height={1.98}
          tint="#db9b59"
          shadowScale={0.58}
        />
      ))}

      {foregroundTrees.map((x, i) => (
        <BillboardSprite
          key={`front-tree-${x}`}
          texture={i % 2 ? '/deco_tree_pine.png' : '/deco_tree_pine2.png'}
          x={x}
          z={5.76}
          width={1.48}
          height={2.44}
          tint="#f0ad63"
          shadowScale={0.7}
        />
      ))}

      {pathRhythm.map((x, i) => (
        <BillboardSprite
          key={`front-edge-${x}`}
          texture={i % 4 === 0 ? '/deco_bush_sm_light.png' : '/deco_bush_sm_green.png'}
          x={x}
          z={4.2 + (i % 2) * 0.1}
          width={0.48}
          height={0.62}
          tint="#ffc982"
          shadowScale={0.26}
        />
      ))}

      {pathRhythm.map((x, i) => (
        <BillboardSprite
          key={`back-edge-${x}`}
          texture={i % 4 === 1 ? '/deco_bush_sm_light.png' : '/deco_bush_sm_green.png'}
          x={x}
          z={0.14 - (i % 2) * 0.08}
          width={0.42}
          height={0.54}
          tint="#f2b875"
          shadowScale={0.22}
        />
      ))}

      {entryXs.flatMap((x, entryIndex) => {
        return entryHedgeZ.flatMap((z, i) => [
          <BillboardSprite
            key={`entry-${entryIndex}-l-${i}`}
            texture={i % 2 ? '/deco_bush_sm_green.png' : '/deco_bush_md_green.png'}
            x={x - 1.66}
            z={z}
            width={0.5}
            height={0.66}
            tint="#ffc982"
            shadowScale={0.28}
          />,
          <BillboardSprite
            key={`entry-${entryIndex}-r-${i}`}
            texture={i % 2 ? '/deco_bush_sm_green.png' : '/deco_bush_md_green.png'}
            x={x + 1.66}
            z={z}
            width={0.5}
            height={0.66}
            tint="#ffc982"
            shadowScale={0.28}
          />,
        ])
      })}

      {promenadePlanters.map((x, i) => (
        <PlanterBox
          key={`front-planter-${x}`}
          x={x}
          z={4.76}
          mirror={i % 2 === 0}
          scale={0.8}
        />
      ))}

      {entryXs.flatMap((x, entryIndex) => [
        <PlanterBox key={`entry-planter-l-${entryIndex}`} x={x - 2.08} z={1.06} mirror scale={0.58} />,
        <PlanterBox key={`entry-planter-r-${entryIndex}`} x={x + 2.08} z={1.06} scale={0.58} />,
        <BillboardSprite
          key={`entry-flower-l-${entryIndex}`}
          texture={TOWN_ASSETS.flowerA}
          x={x - 2.1}
          z={-1.7}
          width={0.58}
          height={0.4}
          tint="#ffd0a6"
          shadow={false}
        />,
        <BillboardSprite
          key={`entry-flower-r-${entryIndex}`}
          texture={TOWN_ASSETS.flowerB}
          x={x + 2.1}
          z={-1.7}
          width={0.64}
          height={0.4}
          tint="#ffd0a6"
          shadow={false}
        />,
      ])}

      {entryXs.flatMap((x, entryIndex) => (
        buildingBedOffsets.flatMap((offset, i) => [
          <BillboardSprite
            key={`building-bed-bush-${entryIndex}-${i}`}
            texture={i % 2 ? '/deco_bush_sm_light.png' : '/deco_bush_sm_green.png'}
            x={x + offset}
            z={-1.38}
            width={0.42}
            height={0.54}
            tint="#eeb875"
            shadowScale={0.2}
          />,
          <BillboardSprite
            key={`building-bed-flower-${entryIndex}-${i}`}
            texture={i % 2 ? TOWN_ASSETS.flowerB : TOWN_ASSETS.flowerA}
            x={x + offset * 0.96}
            z={-1.72}
            width={0.5}
            height={0.34}
            tint="#ffd0a6"
            shadow={false}
          />,
        ])
      ))}

      {foregroundCurtain.map((x, i) => (
        <BillboardSprite
          key={`foreground-curtain-${x}`}
          texture={i % 2 === 0 ? '/deco_bush_sm_light.png' : '/deco_bush_sm_green.png'}
          x={x}
          z={7.85 + (i % 2) * 0.16}
          width={0.92}
          height={1.08}
          tint="#d3a061"
          opacity={0.5}
          shadow={false}
        />
      ))}
    </>
  )
}

const DECORATIONS = [
  ...Array.from({ length: 5 }, (_, i) => [3 + i * 2, 3, i % 2 ? '/deco_bush_md_green.png' : '/deco_bush_sm_green.png']),
  ...Array.from({ length: 5 }, (_, i) => [18 + i * 2, 3, i % 2 ? '/deco_bush_sm_green.png' : '/deco_bush_md_green.png']),
  ...Array.from({ length: 5 }, (_, i) => [3 + i * 2, 27, i % 2 ? '/deco_bush_md_green.png' : '/deco_bush_sm_green.png']),
  ...Array.from({ length: 5 }, (_, i) => [18 + i * 2, 27, i % 2 ? '/deco_bush_sm_green.png' : '/deco_bush_md_green.png']),
  [13, 3, '/deco_bush_sm_light.png'],
  [18, 3, '/deco_bush_sm_light.png'],
  [13, 27, '/deco_bush_sm_light.png'],
  [18, 27, '/deco_bush_sm_light.png'],
  [3, 13, '/deco_bush_sm_light.png'],
  [3, 18, '/deco_bush_sm_light.png'],
  [27, 13, '/deco_bush_sm_light.png'],
  [27, 18, '/deco_bush_sm_light.png'],
] as const

function Decorations() {
  return (
    <>
      {DECORATIONS.map(([tc, tr, texture], i) => {
        const p = tileToWorld(tc, tr)
        return (
          <BillboardSprite
            key={`${tc}-${tr}-${i}`}
            texture={texture}
            x={p.x}
            z={p.z}
            width={0.62}
            height={0.84}
            tint="#ffc37a"
            shadowScale={0.45}
          />
        )
      })}
      <DenseFoliage />
    </>
  )
}

const PATCH = [
  [-0.28, -0.22, '/deco_flower.png', 0.34, 0.42],
  [0.2, -0.16, '/deco_shrub_round.png', 0.45, 0.55],
  [0.34, 0.2, '/deco_flower.png', 0.3, 0.38],
  [-0.12, 0.26, '/deco_rock.png', 0.32, 0.26],
] as const

function DenseFoliage() {
  const patchTiles = [
    [5, 5], [7, 5], [9, 5], [24, 5], [26, 5],
    [5, 25], [7, 25], [24, 25], [26, 25],
    [21, 21], [23, 21], [25, 21],
  ]

  return (
    <>
      {patchTiles.flatMap(([tc, tr], patchIndex) => {
        const base = tileToWorld(tc, tr, 0.04)
        return PATCH.map(([dx, dz, texture, width, height], i) => (
          <BillboardSprite
            key={`${patchIndex}-${i}`}
            texture={texture}
            x={base.x + dx}
            z={base.z + dz}
            y={base.y}
            width={width}
            height={height}
            tint="#ffd083"
            shadow={false}
          />
        ))
      })}
    </>
  )
}

function Terraces() {
  return (
    <>
      <Terrace origin={[20, 4]} size={[7, 3]} height={0.58} />
      <Terrace origin={[4, 22]} size={[5, 3]} height={0.42} />
    </>
  )
}

function Terrace({
  origin,
  size,
  height,
}: {
  origin: [number, number]
  size: [number, number]
  height: number
}) {
  const center = tileToWorld(origin[0] + size[0] / 2 - 0.5, origin[1] + size[1] / 2 - 0.5, height / 2)
  const top = tileToWorld(origin[0] + size[0] / 2 - 0.5, origin[1] + size[1] / 2 - 0.5, height + 0.018)

  return (
    <group>
      <mesh castShadow receiveShadow position={[center.x, center.y, center.z]}>
        <boxGeometry args={[size[0], height, size[1]]} />
        <meshStandardMaterial color="#9b5f35" roughness={0.96} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[top.x, top.y, top.z]}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial color="#7eb34b" roughness={0.92} />
      </mesh>
      <mesh receiveShadow position={[top.x, height + 0.04, top.z + size[1] / 2 - 0.06]}>
        <boxGeometry args={[1.05, 0.08, 0.12]} />
        <meshStandardMaterial color="#8a4e2b" roughness={0.9} />
      </mesh>
      <BillboardSprite
        texture={TOWN_ASSETS.cliffBlock}
        x={top.x - size[0] * 0.2}
        z={top.z + size[1] / 2 + 0.09}
        y={-0.02}
        width={Math.min(size[0], 4.6)}
        height={height + 1.15}
        tint="#ffd09a"
        opacity={0.92}
        shadow={false}
      />
      <Ladder x={top.x + size[0] * 0.22} z={top.z + size[1] / 2 + 0.18} height={height + 0.76} />
    </group>
  )
}

function Ladder({ x, z, height }: { x: number; z: number; height: number }) {
  const rungCount = 5

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[-0.24, height / 2, 0]}>
        <boxGeometry args={[0.07, height, 0.08]} />
        <meshStandardMaterial color="#8a4e2b" roughness={0.82} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.24, height / 2, 0]}>
        <boxGeometry args={[0.07, height, 0.08]} />
        <meshStandardMaterial color="#8a4e2b" roughness={0.82} />
      </mesh>
      {Array.from({ length: rungCount }, (_, i) => (
        <mesh key={i} castShadow receiveShadow position={[0, 0.22 + i * (height - 0.36) / (rungCount - 1), 0.02]}>
          <boxGeometry args={[0.58, 0.055, 0.07]} />
          <meshStandardMaterial color="#c37a3d" roughness={0.78} />
        </mesh>
      ))}
    </group>
  )
}

function AnimatedPlayer({
  positionRef,
  direction,
  moving,
}: {
  positionRef: React.MutableRefObject<THREE.Vector3>
  direction: Dir8
  moving: boolean
}) {
  const texture = useLoader(THREE.TextureLoader, '/snivy_sheet.png')
  const groupRef = useRef<THREE.Group>(null)
  const frame = useRef(0)
  const elapsed = useRef(0)
  const playerSize = 0.92

  useMemo(() => {
    prepareTexture(texture)
    texture.repeat.set(1 / 4, 1 / 8)
  }, [texture])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(positionRef.current.x, 0.02, positionRef.current.z)
    }

    const row = ROW[direction]
    if (moving) {
      elapsed.current += delta
      frame.current = Math.floor(elapsed.current * 8) % 4
    } else {
      frame.current = 0
      elapsed.current = 0
    }

    texture.offset.x = frame.current / 4
    texture.offset.y = 1 - (row + 1) / 8
  })

  return (
    <group ref={groupRef} position={[positionRef.current.x, 0.02, positionRef.current.z]}>
      <mesh position={[0, playerSize / 2 + 0.02, 0]}>
        <planeGeometry args={[playerSize, playerSize]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.2}
          color="#ffe5b8"
          depthWrite
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0}
          emissive="#271305"
          emissiveIntensity={0.18}
        />
      </mesh>
      <pointLight color="#ffc47a" intensity={0.34} distance={1.65} decay={2} position={[0, 0.74, 0.3]} />
    </group>
  )
}

type Dir8 = 'down'|'down-right'|'right'|'up-right'|'up'|'up-left'|'left'|'down-left'
const ROW: Record<Dir8, number> = {
  down:0,'down-right':1,right:2,'up-right':3,up:4,'up-left':5,left:6,'down-left':7,
}

function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const handledKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'enter'])
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const code = event.code.toLowerCase()
      if (handledKeys.has(key) || code === 'space') event.preventDefault()
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

// Zone in front of the Pokémon Center entrance (centre of back promenade)
const PC_ENTER_ZONE = { x: 0, halfWidth: 1.6, zTrigger: -4.12 }

function WorldController({
  paused,
  aboutCardOpen,
  onZone,
  onItem,
  onBattle,
  onEnterBuilding,
  onBuildingNear,
  onAboutBallNear,
  onAboutBallOpen,
  aboutFocus,
  focusTarget,
  playerVisible = true,
}: HD2DWorldProps & {
  focusTarget: React.MutableRefObject<THREE.Vector3>
  aboutFocus?: boolean
  onAboutBallNear?: (near: boolean) => void
  onAboutBallOpen?: () => void
  playerVisible?: boolean
}) {
  const keys = useKeyboard()
  const playerRef = useRef(new THREE.Vector3(0, 0, (MAIN_PATH.zMin + MAIN_PATH.zMax) / 2))
  const targetRef = useRef(new THREE.Vector3(0, 0, (MAIN_PATH.zMin + MAIN_PATH.zMax) / 2))
  const [direction, setDirection] = useState<Dir8>('up')
  const [moving, setMoving] = useState(false)
  const directionRef = useRef<Dir8>('up')
  const movingRef = useRef(false)
  const zoneRef = useRef<Zone>('hub')
  const lastTileRef = useRef('')
  const grassStepsRef = useRef(0)
  const enteredBuildingRef = useRef(false)   // prevent double-fire
  const buildingNearRef    = useRef<PortfolioBuildingId | null>(null)   // track near state for UI hint
  const aboutBallNearRef = useRef(false)
  const spaceWasDownRef = useRef(false)

  useEffect(() => {
    if (aboutCardOpen) {
      spaceWasDownRef.current = true
      aboutBallNearRef.current = false
      onAboutBallNear?.(false)
    }
  }, [aboutCardOpen, onAboutBallNear])

  useFrame((_, delta) => {
    if (paused) return

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

    const isMoving = vx !== 0 || vz !== 0
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving
      setMoving(isMoving)
    }

    if (isMoving) {
      if (vx && vz) {
        vx *= Math.SQRT1_2
        vz *= Math.SQRT1_2
      }

      const dx = vx * SPEED * delta
      const dz = vz * SPEED * delta
      const current = playerRef.current
      const nx = THREE.MathUtils.clamp(current.x + dx, WORLD.minX + 0.25, WORLD.maxX - 0.25)
      const nz = THREE.MathUtils.clamp(current.z + dz, WORLD.minZ + 0.25, WORLD.maxZ - 0.25)

      if (!isBlocked(nx, nz)) {
        current.set(nx, 0, nz)
      } else if (!isBlocked(nx, current.z)) {
        current.x = nx
      } else if (!isBlocked(current.x, nz)) {
        current.z = nz
      }

      let nextDirection: Dir8
      if      (vx < 0 && vz < 0) nextDirection = 'up-left'
      else if (vx > 0 && vz < 0) nextDirection = 'up-right'
      else if (vx < 0 && vz > 0) nextDirection = 'down-left'
      else if (vx > 0 && vz > 0) nextDirection = 'down-right'
      else if (vx < 0) nextDirection = 'left'
      else if (vx > 0) nextDirection = 'right'
      else if (vz < 0) nextDirection = 'up'
      else nextDirection = 'down'

      if (nextDirection !== directionRef.current) {
        directionRef.current = nextDirection
        setDirection(nextDirection)
      }
    }

    if (aboutFocus) {
      targetRef.current.set(ABOUT_POKEBALL.x, 0, ABOUT_POKEBALL.z)
      focusTarget.current.set(ABOUT_POKEBALL.x, 0.7, ABOUT_POKEBALL.z)
    } else {
      targetRef.current.copy(playerRef.current)
      focusTarget.current.set(playerRef.current.x, 0.76, playerRef.current.z)
    }

    const px = playerRef.current.x
    const pz = playerRef.current.z
    const dist = (b: { x: number; z: number }) => Math.hypot(px - b.x, pz - b.z)
    const spaceDown = !!(k[' '] || k.space || k.spacebar || k.enter)
    const nearAboutBall = Math.hypot(px - ABOUT_POKEBALL.x, pz - ABOUT_POKEBALL.z) < ABOUT_POKEBALL.promptRadius

    let nearestBuilding = PORTFOLIO_BUILDINGS[0]
    let minD = dist(nearestBuilding)
    for (let i = 1; i < PORTFOLIO_BUILDINGS.length; i += 1) {
      const building = PORTFOLIO_BUILDINGS[i]
      const distance = dist(building)
      if (distance < minD) {
        nearestBuilding = building
        minD = distance
      }
    }
    let zone: Zone = 'hub'
    if (minD < ZONE_RADIUS) {
      zone = nearestBuilding.zone
    }
    if (zone !== zoneRef.current) {
      zoneRef.current = zone
      onZone(zone)
    }

    onItem(null, -1)

    if (nearAboutBall !== aboutBallNearRef.current) {
      aboutBallNearRef.current = nearAboutBall
      onAboutBallNear?.(nearAboutBall)
    }

    if (nearAboutBall && spaceDown && !spaceWasDownRef.current && !aboutCardOpen) {
      onAboutBallOpen?.()
    }
    spaceWasDownRef.current = spaceDown

    // ── Portfolio building entrance trigger ────────────────────────────────
    // Show the prompt when the player is on the promenade in front of a signed
    // portfolio building. W / ↑ enters the selected building.
    const nearBuilding = PORTFOLIO_BUILDINGS.find((building) => (
      Math.abs(px - building.x) < 2.35 &&
      pz <= BACK_PROMENADE.zMax + 0.1 &&   // just at / past south edge of promenade
      pz >= BACK_PROMENADE.zMin - 0.3       // not past the north wall
    ))
    const nearBuildingId = nearBuilding?.id ?? null
    if (nearBuildingId !== buildingNearRef.current) {
      buildingNearRef.current = nearBuildingId
      onBuildingNear?.(!!nearBuilding, nearBuilding)
      enteredBuildingRef.current = false  // reset so re-entry works
    }
    // W / ↑ while prompt is showing → enter building
    const wantsNorth = k.arrowup || k.w
    if (nearBuilding && wantsNorth && !enteredBuildingRef.current) {
      enteredBuildingRef.current = true
      onEnterBuilding?.(nearBuilding.id)
    }

    lastTileRef.current = `${Math.round(px * 2) / 2},${Math.round(pz * 2) / 2}`
    grassStepsRef.current = 0
  })

  return (
    <>
      <HD2DCamera target={targetRef.current} zoomed={aboutFocus || !!aboutCardOpen} />
      {playerVisible && <AnimatedPlayer positionRef={playerRef} direction={direction} moving={moving} />}
    </>
  )
}

function GodRays() {
  const rays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      x: -14 + i * 5.2,
      z: -24 + i * 0.7,
      rot: -0.16 + i * 0.018,
      opacity: 0.018 + (i % 3) * 0.006,
      width: 2.4 + (i % 3) * 0.8,
    }))
  }, [])

  return (
    <group position={[0, 0, 0]}>
      {rays.map((ray, i) => (
        <mesh
          key={i}
          position={[ray.x, 4.2 + i * 0.05, ray.z]}
          rotation={[-0.96, 0, ray.rot]}
          renderOrder={-10}
        >
          <planeGeometry args={[ray.width, 26]} />
          <meshBasicMaterial
            color="#ffb16d"
            transparent
            opacity={ray.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function AtmospherePlanes() {
  return (
    <>
      <mesh position={[0, 4, -24]} rotation={[0, 0, 0]}>
        <planeGeometry args={[54, 18]} />
        <meshBasicMaterial color="#ff7f4f" transparent opacity={0.026} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[VISUAL_W + 4, VISUAL_D + 4]} />
        <meshBasicMaterial color="#ffb264" transparent opacity={0.016} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  )
}

function HD2DScene(props: HD2DWorldProps) {
  const { scene, gl } = useThree()
  const focusTarget = useRef(new THREE.Vector3(0, 0.76, (MAIN_PATH.zMin + MAIN_PATH.zMax) / 2))
  const [aboutBallNear, setAboutBallNear] = useState(false)
  const [aboutBallStage, setAboutBallStage] = useState<AboutBallStage>('closed')
  const [aboutFocus, setAboutFocus] = useState(false)
  const openTimerRef = useRef<number | null>(null)
  const wasAboutCardOpenRef = useRef(false)
  const introOnlyAboutBall = !!props.introOnlyAboutBall
  const displayedAboutBallStage = props.introAboutStage ?? aboutBallStage
  const cameraFocus = aboutFocus || !!props.introFocus

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#c79765', 0.0075)
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.08
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.shadowMap.enabled = false
    return () => { scene.fog = null }
  }, [scene, gl])

  const openAboutBall = useCallback(() => {
    if (aboutBallStage !== 'closed' || props.aboutCardOpen) return
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current)

    setAboutBallNear(false)
    setAboutFocus(true)
    setAboutBallStage('opening')
    openTimerRef.current = window.setTimeout(() => {
      setAboutBallStage('open')
      props.onAboutCardOpen?.()
    }, 850)
  }, [aboutBallStage, props])

  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (wasAboutCardOpenRef.current && !props.aboutCardOpen) {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
      setAboutFocus(false)
      setAboutBallStage('closed')
      setAboutBallNear(false)
    }
    wasAboutCardOpenRef.current = !!props.aboutCardOpen
  }, [props.aboutCardOpen])

  return (
    <>
      <PerspectiveCamera makeDefault fov={31} position={[0, 4.35, 11.2]} near={0.1} far={140} />
      <color attach="background" args={[introOnlyAboutBall ? '#000000' : '#2f451a']} />
      {introOnlyAboutBall ? (
        <>
          <ambientLight color="#ffffff" intensity={1.2} />
          <pointLight color="#ffffff" intensity={7.5} distance={8} decay={2} position={[0, 2.6, 4.2]} />
        </>
      ) : (
        <>
          <GoldenHourLights />
          <GodRays />
          <AtmospherePlanes />
          <GroundPlane />
          <WorldGeometry />
          <ForestBackdrop />
          <StreetDecorations />
          <GroundClutter />
        </>
      )}
      <AboutPokeball
        stage={displayedAboutBallStage}
        near={!introOnlyAboutBall && aboutBallNear && !props.aboutCardOpen}
        intro={!!props.introAboutStage}
      />
      {!introOnlyAboutBall && <Buildings />}
      <WorldController
        {...props}
        aboutFocus={cameraFocus}
        onAboutBallNear={setAboutBallNear}
        onAboutBallOpen={openAboutBall}
        focusTarget={focusTarget}
        playerVisible={props.playerVisible !== false}
      />
    </>
  )
}

export default function HD2DWorld(props: HD2DWorldProps) {
  return (
    <Canvas
      dpr={CANVAS_DPR}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      performance={{ min: 0.6 }}
      className="absolute inset-0"
    >
      <Suspense fallback={null}>
        <HD2DScene {...props} />
      </Suspense>
    </Canvas>
  )
}
