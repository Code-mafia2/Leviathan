import { useEffect, useRef, type ReactNode } from 'react'
import { OceanDepth, useOceanDepthController } from '../hooks/useOceanDepth'
import { waterAtmosphere } from './WaterAtmosphere'

import { PassingShadow } from './PassingShadow'
import { FishLayer } from './FishLayer'
import { TrenchFin } from './TrenchFin'

export function OceanScene({ children }: { children: ReactNode }) {
  const depth = useOceanDepthController()
  return <OceanDepth.Provider value={depth}>
    <div className="deep-water" aria-hidden="true">
      <i className="ocean-plane sunlit-water"/>
      <i className="ocean-plane canyon-walls"/>
      <i className="ocean-plane trench-walls"/>
      {depth > 500 && <PassingShadow/>}
      <FishLayer/>
      {waterAtmosphere}
    </div>
    {children}
  </OceanDepth.Provider>
}

export function TrenchPresence() {
  const eye = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const footer = eye.current?.closest('footer')
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        eye.current?.classList.add('eye-open')
        observer.disconnect()
      }
    })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])
  return <>
    <TrenchFin/>
    <svg ref={eye} className="eye" viewBox="255 0 195 150" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="lid-feather">
          <stop offset="40%" stopColor="white"/><stop offset="100%" stopColor="black"/>
        </radialGradient>
        <mask id="trench-lids" maskUnits="userSpaceOnUse" x="255" y="0" width="195" height="150">
          <g transform="translate(350 39) rotate(-24)"><ellipse className="eyelid" rx="59" ry="27" fill="url(#lid-feather)"/></g>
          <g transform="translate(332 106) rotate(-24)"><ellipse className="eyelid lower" rx="56" ry="26" fill="url(#lid-feather)"/></g>
        </mask>
      </defs>
      <image href="/media/leviathan-eyes-new.webp" width="450" height="150" mask="url(#trench-lids)"/>
    </svg>
  </>
}
