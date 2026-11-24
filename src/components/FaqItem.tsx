import { useId, useState } from 'react'

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  const panel = useId()
  const [expanded, setExpanded] = useState(false)
  return <details onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary aria-expanded={expanded} aria-controls={panel}>{question}</summary>
    <p id={panel}>{answer}</p>
  </details>
}
