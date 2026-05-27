'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useAudio } from '../AudioEngine'

// ─── Morphing Core Object ──────────────────────────────────────────────────

function MorphingCore({ audioData }: { audioData: Uint8Array | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const geoRef = useRef<THREE.IcosahedronGeometry | null>(null)
  const origPositions = useRef<Float32Array | null>(null)

  useEffect(() => {
    if (meshRef.current) {
      const geo = meshRef.current.geometry as THREE.IcosahedronGeometry
      origPositions.current = new Float32Array(geo.attributes.position.array)
      geoRef.current = geo
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!meshRef.current || !origPositions.current || !geoRef.current) return

    const geo = geoRef.current
    const pos = geo.attributes.position
    const orig = origPositions.current

    // Audio amplitude
    let amp = 0
    if (audioData) {
      let sum = 0
      for (let i = 0; i < audioData.length; i++) sum += audioData[i]
      amp = (sum / audioData.length / 128 - 1) * 0.4
    }

    for (let i = 0; i < pos.count; i++) {
      const ox = orig[i * 3]
      const oy = orig[i * 3 + 1]
      const oz = orig[i * 3 + 2]
      const noise =
        Math.sin(ox * 3 + t * 1.2) * 0.08 +
        Math.sin(oy * 4 + t * 0.8) * 0.06 +
        Math.sin(oz * 3.5 + t * 1.5) * 0.07 +
        amp * 0.3
      const scale = 1 + noise
      pos.setXYZ(i, ox * scale, oy * scale, oz * scale)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    meshRef.current.rotation.y = t * 0.15
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
    if (wireRef.current) {
      wireRef.current.rotation.y = t * 0.15
      wireRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
    }
  })

  return (
    <group>
      {/* Solid inner with emissive */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.4, 4]} />
        <meshStandardMaterial
          color="#000820"
          emissive="#00F5FF"
          emissiveIntensity={0.15}
          transparent
          opacity={0.6}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Wireframe outer */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.45, 4]} />
        <meshStandardMaterial
          color="#00F5FF"
          emissive="#00F5FF"
          emissiveIntensity={0.8}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}

// ─── Orbiting Rings ────────────────────────────────────────────────────────

function OrbitRings() {
  const r1 = useRef<THREE.Mesh>(null)
  const r2 = useRef<THREE.Mesh>(null)
  const r3 = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (r1.current) { r1.current.rotation.z = t * 0.4; r1.current.rotation.x = 0.8 }
    if (r2.current) { r2.current.rotation.z = -t * 0.3; r2.current.rotation.x = 1.4 }
    if (r3.current) { r3.current.rotation.y = t * 0.25; r3.current.rotation.x = 0.2 }
  })

  return (
    <group>
      <mesh ref={r1}>
        <torusGeometry args={[2.2, 0.006, 8, 120]} />
        <meshStandardMaterial color="#00F5FF" emissive="#00F5FF" emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={r2}>
        <torusGeometry args={[2.6, 0.004, 8, 120]} />
        <meshStandardMaterial color="#8B5CF6" emissive="#8B5CF6" emissiveIntensity={1.5} />
      </mesh>
      <mesh ref={r3}>
        <torusGeometry args={[3.1, 0.003, 8, 120]} />
        <meshStandardMaterial color="#FF006E" emissive="#FF006E" emissiveIntensity={1.5} />
      </mesh>
    </group>
  )
}

// ─── Particle Field ────────────────────────────────────────────────────────

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null)
  const COUNT = 2500

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const palette = [
      new THREE.Color('#00F5FF'),
      new THREE.Color('#8B5CF6'),
      new THREE.Color('#FF006E'),
      new THREE.Color('#ffffff'),
    ]
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 4 + Math.random() * 8
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors }
  }, [])

  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.03
    pointsRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.1
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.025} vertexColors sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

// ─── Mouse Parallax Camera ─────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame(() => {
    target.current.x += (mouse.current.x * 0.8 - target.current.x) * 0.05
    target.current.y += (mouse.current.y * 0.5 - target.current.y) * 0.05
    camera.position.x = target.current.x
    camera.position.y = target.current.y
    camera.lookAt(0, 0, 0)
  })

  return null
}

// ─── Main Scene ────────────────────────────────────────────────────────────

function Scene() {
  const { analyserData } = useAudio()

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#00F5FF" />
      <pointLight position={[5, 5, 0]} intensity={0.5} color="#8B5CF6" />
      <pointLight position={[-5, -5, 0]} intensity={0.5} color="#FF006E" />

      <MorphingCore audioData={analyserData} />
      <OrbitRings />
      <ParticleField />
      <CameraRig />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0008, 0.0008)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </>
  )
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 60 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  )
}
