import { useEffect, useRef } from 'react'

// Absolute cubic contours traced in the reference image's 700-unit coordinate space.
// The head is at the left. Both trailing membranes disappear into the same flank.
const flank = 'M54 155 C56 146 72 136 90 125 C109 110 125 109 142 96 C155 87 167 79 192 73 C182 80 178 85 176 90 C197 83 199 79 222 76 C209 81 207 86 206 90 C234 85 253 80 271 65 C264 76 262 80 261 86 C286 80 298 56 334 46 C347 42 359 39 378 39 C351 43 344 55 329 77 C353 73 377 51 414 54 C396 58 386 71 380 85 C431 89 466 95 504 118 C532 137 556 155 581 151 C613 148 630 116 665 108 C680 104 687 105 699 106 C663 109 656 121 630 143 C603 167 583 184 550 175 C521 168 492 147 455 139 C390 122 352 126 309 139 C264 155 235 174 187 176 C167 177 145 184 126 180 C106 177 94 166 78 164 C66 162 51 167 54 155 Z'
const membranes = 'M278 136 C285 151 320 150 350 167 C312 156 294 166 262 156 C276 177 305 187 321 198 C282 184 255 183 233 163 Z M187 156 C200 181 221 195 262 209 C226 202 199 194 181 183 C196 202 212 210 234 220 C188 206 164 188 147 164 Z'

function prepareContour(outline: string) {
  const tokens = outline.match(/[MCZ]|-?\d+(?:\.\d+)?/g)!
  const points: { index: number; y: number; amplitude: number; phase: number }[] = []
  for (let i = 0; i < tokens.length; i++) {
    if (/^[MCZ]$/.test(tokens[i])) continue
    const x = Number(tokens[i])
    const y = Number(tokens[++i])
    const s = Math.max(0, (x - 54) / 645)
    const flex = Math.max(0, (y - 170) / 52)
    points.push({
      index: i, y,
      amplitude: 1 + 32 * s ** 1.35 + 5 * flex,
      phase: 2 * Math.PI * 1.24 * s + .45 * flex,
    })
  }
  return (phase: number) => {
    for (const p of points) {
      tokens[p.index] = (p.y + p.amplitude * Math.sin(p.phase - phase)).toFixed(2)
    }
    return tokens.join(' ')
  }
}

export function PassingShadow() {
  const sprite = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const svg = sprite.current
    if (!svg) return
    const paths = Array.from(svg.querySelectorAll('path'))
    const contours = [membranes, flank].map(prepareContour)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let timer = 0
    let crossing: Animation | undefined
    let facesLeft = true

    function swim() {
      if (!svg || motion.matches || document.hidden) return
      const duration = 38000 + Math.random() * 10000
      const period = 6900 + Math.random() * 1800
      // The source faces left. Mirror only between fully off-screen crossings.
      svg.querySelector('g')!.setAttribute('transform', facesLeft ? '' : 'translate(700 0) scale(-1 1)')
      const endpoints = ['translateX(100vw)', 'translateX(-100%)']
      if (!facesLeft) endpoints.reverse()
      crossing = svg.animate({ transform: endpoints }, { duration, easing: 'linear' })
      facesLeft = !facesLeft
      let lastPaint = -Infinity
      function deform(now: number) {
        // Slow, blurred movement needs only 24 contour samples per second.
        if (now - lastPaint >= 1000 / 24) {
          const phase = Number(crossing?.currentTime ?? 0) * 2 * Math.PI / period
          paths.forEach((path, i) => path.setAttribute('d', contours[i](phase)))
          lastPaint = now
        }
        frame = requestAnimationFrame(deform)
      }
      frame = requestAnimationFrame(deform)
      crossing.onfinish = () => {
        cancelAnimationFrame(frame)
        timer = window.setTimeout(swim, 30000 + Math.random() * 30000)
      }
    }
    function stop() {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      if (crossing) { crossing.onfinish = null; crossing.cancel() }
    }
    function restart() { stop(); swim() }
    swim()
    motion.addEventListener('change', restart)
    document.addEventListener('visibilitychange', restart)
    return () => {
      stop()
      motion.removeEventListener('change', restart)
      document.removeEventListener('visibilitychange', restart)
    }
  }, [])

  return <div className="shadow-distance" aria-hidden="true">
    <svg ref={sprite} className="shadow" viewBox="0 0 700 270" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="serpent-water" x2=".12" y2="1">
          <stop stopColor="#122f3b"/><stop offset=".38" stopColor="#020c14"/>
          <stop offset=".76" stopColor="#03101a"/><stop offset="1" stopColor="#193440" stopOpacity=".65"/>
        </linearGradient>
      </defs>
      <g><path d={membranes} fill="#05131d" opacity=".64"/><path d={flank} fill="url(#serpent-water)"/></g>
    </svg>
  </div>
}
