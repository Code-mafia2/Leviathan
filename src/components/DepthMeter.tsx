import { useContext, type CSSProperties } from 'react'
import { OceanDepth, registrationDepth } from '../hooks/useOceanDepth'

const thresholds = [1000, 3000, 5000, 7000, registrationDepth]
const rulerMarks = [0, ...thresholds, 10500, 11000]
const format = new Intl.NumberFormat('en-US')

export function DepthMeter() {
  const depth = useContext(OceanDepth)
  const reading = format.format(depth)
  return <div className="meter" role="meter" aria-label="Current ocean depth"
    aria-valuemin={0} aria-valuemax={11000} aria-valuenow={depth}
    aria-valuetext={reading + ' metres'} aria-live="off"
    style={{ '--meter-level': depth / 11000 } as CSSProperties}>
    <span className="reading" aria-hidden="true">{reading} m</span>
    <span className="ruler" aria-hidden="true">
      {rulerMarks.map(value =>
        <b key={value} data-short={value ? value / 1000 + 'k' : '0'} style={{top: (value / 110) + '%'}}>{format.format(value)} m</b>
      )}
      <i/>
    </span>
    <span aria-hidden="true" className={'cells' + (depth >= thresholds[4] ? ' ready' : '')}>
      {thresholds.map(value => <i key={value} className={depth >= value ? 'lit' : ''}/>)}
    </span>
  </div>
}
