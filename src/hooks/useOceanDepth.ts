import { createContext, useEffect, useState } from 'react'
import { clearOceanLight, paintOceanLight } from './oceanLight'

export const OceanDepth = createContext(0)
export const registrationDepth = 9000

export function useOceanDepthController() {
  const [depth, setDepth] = useState(0)
  useEffect(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLElement>('[data-depth]'))
    const root = document.documentElement
    let points: { top: number; depth: number }[] = []
    let frame = 0
    function update() {
      frame = 0
      const y = window.scrollY
      const next = points.findIndex(point => point.top > y)
      let metres = 0
      if (next < 0 && y > 0) {
        metres = 11000
      } else if (next > 0 && y > 0) {
        const a = points[next - 1], b = points[next]
        metres = Math.round(a.depth + (b.depth - a.depth) * (y - a.top) / (b.top - a.top))
      }
      setDepth(metres)
      paintOceanLight(root.style, metres)
      root.style.setProperty('--dive', (metres / 11000).toFixed(4))
    }
    function measure() {
      const bottom = document.documentElement.scrollHeight - innerHeight
      points = anchors.map(el => ({
        top: Math.max(0, Math.min(bottom, window.scrollY + el.getBoundingClientRect().top - innerHeight * 0.25)),
        depth: Number(el.dataset.depth),
      }))
      points[points.length - 1].top = bottom
      onScroll()
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(document.body)
    anchors.forEach(anchor => observer.observe(anchor))
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll)
      root.style.removeProperty('--dive')
      clearOceanLight(root.style)
    }
  }, [])
  return depth
}
