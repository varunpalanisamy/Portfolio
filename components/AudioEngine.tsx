'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface AudioContextValue {
  isPlaying: boolean
  toggle: () => void
  volume: number
  setVolume: (v: number) => void
  analyserData: Uint8Array | null
  currentSection: string
  setCurrentSection: (s: string) => void
}

const AudioCtx = createContext<AudioContextValue>({
  isPlaying: false,
  toggle: () => {},
  volume: 0.7,
  setVolume: () => {},
  analyserData: null,
  currentSection: 'hero',
  setCurrentSection: () => {},
})

export function useAudio() {
  return useContext(AudioCtx)
}

// Generates a fake waveform when no real audio file is loaded
function generateFakeWaveform(analyserData: Uint8Array, time: number) {
  for (let i = 0; i < analyserData.length; i++) {
    const freq = i / analyserData.length
    analyserData[i] = Math.floor(
      128 +
      60 * Math.sin(time * 2.1 + freq * 12) *
      Math.sin(time * 0.7 + freq * 5) *
      Math.cos(time * 1.3 + freq * 8)
    )
  }
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null)
  const [currentSection, setCurrentSection] = useState('hero')
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const fakeDataRef = useRef(new Uint8Array(128))

  // Drive fake waveform animation when "playing"
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }
    startTimeRef.current = performance.now()

    function tick() {
      const t = (performance.now() - startTimeRef.current) / 1000
      generateFakeWaveform(fakeDataRef.current, t)
      setAnalyserData(new Uint8Array(fakeDataRef.current))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying])

  const toggle = useCallback(() => setIsPlaying(p => !p), [])

  return (
    <AudioCtx.Provider value={{ isPlaying, toggle, volume, setVolume, analyserData, currentSection, setCurrentSection }}>
      {children}
    </AudioCtx.Provider>
  )
}
