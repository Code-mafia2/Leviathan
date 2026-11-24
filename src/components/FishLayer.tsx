import { useEffect, useRef, type CSSProperties } from 'react'
import '../styles/fish.css'

// Figures are in CSS pixels and seconds, from distant water to the near plane.
const schools = [
  { count: 8, width: 17, crossing: 92, opacity: .46 },
  { count: 6, width: 25, crossing: 72, opacity: .60 },
  { count: 4, width: 34, crossing: 55, opacity: .71 },
]

// Prebuild stable instances. Depth affects the water's opacity through CSS.
const schoolsMarkup = schools.map((school, layer) =>
  <div className="fish-plane" key={layer}>
    {Array.from({ length: school.count }, (_, i) => {
      const id = i * 3 + layer + 1
      const crossing = school.crossing + id * 7 % 19
      const style = {
        top: (5 + (id * 37.7) % 86) + '%',
        '--fish-width': (school.width + id * 5 % 9) + 'px',
        '--fish-opacity': school.opacity + (id % 4) * .035,
        '--crossing': crossing + 's',
        '--start': -(crossing * ((id * .618034) % 1)) + 's',
        '--stroke': (1.24 + (id * .37 % 1.22)) + 's',
        '--stroke-delay': -(id * .23) + 's',
        '--rise': (id % 2 ? -1 : 1) * (4 + id % 11) + 'px',
        '--row': layer * 50 + '%',
        '--sway': (.6 + id * .27 % 1.5) + 'deg',
      } as CSSProperties
      return <i key={id} className={'fish-track' + (id % 2 ? ' westbound' : '')} style={style}>
        <i className="fish-swimmer"><i className="fish-sprite"/></i>
      </i>
    })}
  </div>
)

export function FishLayer() {
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const update = () => layer.current?.toggleAttribute('data-paused', document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return <div className="fish-water" ref={layer} aria-hidden="true">{schoolsMarkup}</div>
}
