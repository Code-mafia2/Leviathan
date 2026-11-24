const outlines: Record<string, string> = {
  DATE: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5 M8 14h2 M14 14h2 M8 17h2',
  LOCATION: 'M12 22s8-9 8-14a8 8 0 1 0-16 0c0 5 8 14 8 14z M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  CREW: 'M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M5 21v-2a7 7 0 0 1 14 0v2z M18 5a3 3 0 0 1 0 6 M20 14a5 5 0 0 1 3 5 M6 5a3 3 0 0 0 0 6 M4 14a5 5 0 0 0-3 5',
}

export function BriefingIcon({ label }: { label: string }) {
  return <svg className="briefing-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={outlines[label]}/>
  </svg>
}
