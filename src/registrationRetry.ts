import { validRequestId } from '../shared/registration'

const storageKey = 'deepsea.registration.retry'

// Bind a tab's retry ID to its normalized payload without storing the student's details.
export async function registrationRequestId(body: string): Promise<string> {
  const newId = crypto.randomUUID()
  try {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
    const digest = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
    if (saved?.digest === digest && validRequestId.test(saved.id) && Date.now() - saved.at < 48 * 3600000) return saved.id
    sessionStorage.setItem(storageKey, JSON.stringify({ digest, id: newId, at: Date.now() }))
  } catch {
    // Storage can be unavailable in private browsing. The form keeps the active ID in memory.
  }
  return newId
}
