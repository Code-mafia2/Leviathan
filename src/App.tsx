import { Registration } from './components/Registration'
import { DepthMeter } from './components/DepthMeter'
import { OceanScene, TrenchPresence } from './components/OceanScene'
import { SonarCTA, SonarRings } from './components/SonarCTA'
import { BriefingIcon } from './components/BriefingIcon'
import { FaqItem } from './components/FaqItem'
import './styles/footer-wreck.css'
import { FooterSocialLinks } from './components/FooterSocialLinks'
import { useSectionEntrance } from './hooks/useSectionEntrance'
import './styles/sections.css'
import { copy } from './content'
import { eventConfig } from './event.config'
import { useRef, useState } from 'react'

function Navigation() {
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  return <nav className="navigation" aria-label="Main navigation" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      toggle.current?.focus()
    }
  }}>
    <a href="#surface" className="brand" onClick={() => setOpen(false)}>{copy.title}</a>
    <button ref={toggle} type="button" className="menu-toggle" aria-label="Navigation menu" aria-expanded={open} aria-controls="nav-links" onClick={() => setOpen(!open)}><SonarRings/><span aria-hidden="true">☰</span></button>
    <div id="nav-links" className={open ? 'open' : ''} onClick={() => setOpen(false)}>
      <a href="#mission">Mission</a><a href="#register">Register</a><a href="#faq">FAQ</a>
    </div>
  </nav>
}

export function App() {
  const mission = useSectionEntrance()
  const rules = useSectionEntrance()
  const { deadline, fee, prizes, coordinator } = eventConfig
  return <OceanScene>
    <Navigation/>
    <DepthMeter/>
    <main>
      <header className="hero" id="surface" data-depth="0">
        <div className="surface-water" aria-hidden="true"/>
        <div className="hero-copy">
          <h1>{copy.title === 'DEEPSEA LEVIATHAN'
            ? <img src="/media/title-mark.png" width="352" height="109" alt={copy.title}/>
            : copy.title}</h1>
          <p>{copy.tagline}</p>
          <p>{copy.subline}{deadline && ` · Registration deadline: ${deadline}`}</p>
          <div className="actions"><SonarCTA href="#register">{copy.register}</SonarCTA></div>
        </div>
      </header>
      <section data-depth="1000" className="descent">
        <div className="sonar-heading"><h2>The Descent</h2><div className="sonar-scope" aria-hidden="true"/></div>
        <p>{copy.descent}</p>
      </section>
      <section ref={mission} id="mission" data-depth="3000">
        <h2>Mission Briefing</h2>
        <dl>{copy.facts.map(([label, value]) => <div key={label}><dt><BriefingIcon label={label}/>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <section data-depth="5000">
        <h2>The Trial</h2>
        <p>{copy.trial}</p>
        <div className="hatch-scene" aria-hidden="true">
          <div className="hatch-bank">
            <img className="hatches" src="/media/sealed-hatches.jpg" alt="" width="647" height="142" loading="lazy"/>
          </div>
          <i className="hatch-silt"/>
        </div>
      </section>
      {prizes && <section><h2>Prizes</h2><p>{prizes}</p></section>}
      <section ref={rules} data-depth="7000" className="crew-rules">
        <h2>Crew Rules</h2>
        <ul>{copy.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      </section>
      <div className="lower-deck">
      <section className="registration" data-depth="9000">
        <h2 id="register" tabIndex={-1}>{copy.register}</h2>
        {deadline && <p>Registration deadline: {deadline}</p>}
        {fee && <p>Registration fee: {fee}</p>}
        <Registration/>
      </section>
      <div className="side-deck">
      <section id="faq">
        <h2>FAQ</h2>
        {copy.faq.filter(([, answer]) => answer).map(([question, answer]) =>
          <FaqItem key={question} question={question} answer={answer}/>
        )}
        {fee && <FaqItem question="Registration fee" answer={fee}/>}
      </section>
      </div>
      </div>
    </main>
    <footer data-depth="11000">
      <div className="footer-wreck" aria-hidden="true"/>
      <TrenchPresence/>
      {(coordinator.name || coordinator.phone || coordinator.email) && <address>
        Contact: {coordinator.name}{coordinator.name && (coordinator.phone || coordinator.email) && ' — '}
        {coordinator.phone && <a href={`tel:${coordinator.phone}`}>{coordinator.phone}</a>}
        {coordinator.phone && coordinator.email && ', '}
        {coordinator.email && <a href={`mailto:${coordinator.email}`}>{coordinator.email}</a>}
      </address>}
      <FooterSocialLinks/>
      <p>{copy.footer}</p>
    </footer>
  </OceanScene>
}
