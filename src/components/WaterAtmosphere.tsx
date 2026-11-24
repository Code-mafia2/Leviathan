import type { CSSProperties } from 'react'

// Stable positions and phases keep the current continuous when the depth changes.
function motes(count: number, luminous: boolean) {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + (luminous ? 31 : 1)
    const style = {
      left: ((seed * 61.8) % 100) + '%',
      top: ((seed * seed * 7.13 + seed * 23) % 100) + '%',
      '--size': (luminous ? 2 + i % 3 : 1.5 + i % 4) + 'px',
      '--slide': ((i % 2 ? -1 : 1) * (8 + seed % 15)) + 'px',
      '--period': (27 + seed * 7 % 23) + 's',
      '--phase': -(seed * 11 % 38) + 's',
      '--softness': (.25 + seed % 4 * .29) + 'px',
      '--strength': .35 + seed % 5 * .12,
    } as CSSProperties
    return <i key={i} style={style}/>
  })
}

export const waterAtmosphere = <>
  <div className="light-shafts"/>
  <div className="marine-snow">{motes(24, false)}</div>
  <div className="living-light">{motes(7, true)}</div>
</>
