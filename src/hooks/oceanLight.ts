// Opacities of the three photographic planes and sunlight at each depth.
const channels = ['--surface-light', '--canyon-light', '--trench-light', '--sunlight'] as const
const stages = [
  { depth: 0, light: [.80, 0, 0, 1] },
  { depth: 1000, light: [.38, .18, .04, .51] },
  { depth: 3000, light: [.02, .38, .14, .14] },
  { depth: 5000, light: [0, .54, .30, .05] },
  { depth: 7000, light: [0, .16, .34, .012] },
  { depth: 9000, light: [0, .02, .12, 0] },
  { depth: 10500, light: [0, 0, .055, 0] },
  { depth: 11000, light: [0, 0, .018, 0] },
]

export function paintOceanLight(style: CSSStyleDeclaration, metres: number) {
  const end = stages.findIndex(stage => stage.depth >= metres)
  const next = stages[end < 0 ? stages.length - 1 : end]
  const previous = stages[Math.max(0, stages.indexOf(next) - 1)]
  const t = next === previous ? 0 : Math.min(1, (metres - previous.depth) / (next.depth - previous.depth))
  const blend = t * t * (3 - 2 * t)
  channels.forEach((name, index) => {
    const opacity = previous.light[index] + (next.light[index] - previous.light[index]) * blend
    style.setProperty(name, opacity.toFixed(4))
  })
}

export function clearOceanLight(style: CSSStyleDeclaration) {
  channels.forEach(name => style.removeProperty(name))
}
