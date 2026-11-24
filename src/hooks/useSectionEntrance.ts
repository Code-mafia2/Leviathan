import { useEffect, useRef } from 'react'

export function useSectionEntrance() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const section = ref.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.dataset.entered = ''
        observer.disconnect()
      }
    }, { threshold: .12 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])
  return ref
}
