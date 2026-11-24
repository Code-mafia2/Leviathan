import { eventConfig } from '../event.config'
import { SonarCTA } from './SonarCTA'
import '../styles/footer-social.css'

export function FooterSocialLinks() {
  return <nav className="footer-social" aria-labelledby="social-heading">
    <h2 id="social-heading">STAY CONNECTED</h2>
    <div className="social-buttons">
      {eventConfig.socialLinks.map(link => <SonarCTA key={link.url} href={link.url} external>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
          {link.platform === 'linkedin'
            ? <path d="M3 2h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm2.5 7v10h3V9Zm1.5-5a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 7 4Zm3.5 5v10h3v-5.4c0-3 3.7-3.1 3.7 0V19h3v-6.1c0-4.5-4.6-5.2-6.7-2.8V9Z" fillRule="evenodd"/>
            : <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="17.5" cy="6.7" r="1.2"/></>}
        </svg>
        {link.label}
        <span className="social-platform"> on {link.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'}</span>
      </SonarCTA>)}
    </div>
  </nav>
}
