'use client'

import { useRef, useEffect } from 'react'
import { useAudio } from './AudioEngine'

interface WaveformBarProps {
  className?: string
  color?: string
  barCount?: number
  height?: number
}

export default function WaveformBar({
  className = '',
  color = '#00F5FF',
  barCount = 64,
  height = 60,
}: WaveformBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { analyserData, isPlaying } = useAudio()
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      if (!canvas || !ctx) return
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const data = analyserData
      const barW = w / barCount - 1

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * (data ? data.length : barCount))
        const value = data ? data[idx] / 255 : 0.05
        const barH = value * h

        const grad = ctx.createLinearGradient(0, h - barH, 0, h)
        grad.addColorStop(0, color)
        grad.addColorStop(1, color + '40')
        ctx.fillStyle = grad

        const x = i * (barW + 1)
        ctx.fillRect(x, h - barH, barW, barH)

        // Mirror
        const mirrorGrad = ctx.createLinearGradient(0, 0, 0, barH * 0.5)
        mirrorGrad.addColorStop(0, color + '20')
        mirrorGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = mirrorGrad
        ctx.fillRect(x, h, barW, barH * 0.4)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, barCount, color])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className={`w-full ${className}`}
      style={{ opacity: isPlaying ? 1 : 0.3, transition: 'opacity 0.5s' }}
    />
  )
}
