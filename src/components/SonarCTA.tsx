import { useEffect, useRef, type ReactNode } from 'react'
import { copy } from '../content'
import { eventConfig } from '../event.config'
import '../styles/sonar.css'

type Control = { href: string; external?: boolean } | { type: 'button' | 'submit'; disabled?: boolean }

export function SonarRings() {
  const rings = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const layer = rings.current
    if (!layer?.parentElement) return
    const observer = new IntersectionObserver(([entry]) => {
      layer.toggleAttribute('data-visible', entry.isIntersecting)
    })
    observer.observe(layer.parentElement)
    return () => observer.disconnect()
  }, [])
  return <span ref={rings} className="sonar-rings" aria-hidden="true"><i/><i/><i/><i/></span>
}

export function SonarCTA(props: Control & { children: ReactNode; ready?: boolean }) {
  const content = <>
    <SonarRings/>
    {props.children}
  </>
  if ('href' in props) return <a className="sonar-cta" href={props.href}
    target={props.external ? '_blank' : undefined} rel={props.external ? 'noopener noreferrer' : undefined}>{content}</a>
  return <button className="sonar-cta" type={props.type} disabled={props.disabled}
    data-ready={props.ready || undefined}>{content}</button>
}

export function GroupLink() {
  return eventConfig.whatsappUrl
    ? <SonarCTA href={eventConfig.whatsappUrl} external>{copy.whatsapp}</SonarCTA>
    : <SonarCTA type="button" disabled>{copy.whatsapp}</SonarCTA>
}
