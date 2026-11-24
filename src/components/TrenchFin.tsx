import { useEffect, useRef } from 'react'

export function TrenchFin() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let timer = 0
    let last = 0
    function draw(time: number) {
      if (!ctx || !canvas) return
      const { width, height } = canvas
      const phase = time * 2 * Math.PI / 21000
      ctx.clearRect(0, 0, width, height)
      // Sample narrow bands of the original surface. The flex decays to zero at its base.
      for (let y = 0; y < height; y += 2) {
        const bend = Math.max(0, 1 - y / (height * .69))
        const dx = time ? width * .026 * bend * bend * Math.sin(phase - bend * 1.6) : 0
        ctx.drawImage(image, 0, y, width, 2, dx, y, width, 2)
      }
    }
    function tick(time: number) {
      if (time - last >= 60) { draw(time); last = time }
      timer = requestAnimationFrame(tick)
    }
    function sync() {
      cancelAnimationFrame(timer)
      if (!image.complete || !image.naturalWidth || !visible || document.hidden) return
      if (motion.matches) draw(0)
      else timer = requestAnimationFrame(tick)
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(canvas)
    image.onload = () => {
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      sync()
    }
    image.src = '/media/leviathan-fin-new.webp'
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(timer)
      image.onload = null
      motion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
  return <canvas ref={ref} className="fin-edge" aria-hidden="true" width="900" height="325"/>
}
