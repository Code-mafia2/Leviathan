import { useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { registrationData, uncertainMessage, type RegistrationRequest } from '../../shared/registration'
import { registrationRequestId } from '../registrationRetry'
import { copy } from '../content'
import { GroupLink, SonarCTA } from './SonarCTA'
import { OceanDepth, registrationDepth } from '../hooks/useOceanDepth'
import '../styles/registration.css'

function DescentButton({ pending }: { pending: boolean }) {
  const depth = useContext(OceanDepth)
  return <SonarCTA type="submit" disabled={pending} ready={depth >= registrationDepth}>
    {pending ? 'Logging your crew...' : copy.submit}
  </SonarCTA>
}

function RegistrationSuccess() {
  const message = useRef<HTMLParagraphElement>(null)
  useEffect(() => { message.current?.focus() }, [])
  return <div className="registration-success">
    <span className="crew-check" aria-hidden="true">
      <svg viewBox="0 0 32 32"><path d="M7 16l6 6 13-14" pathLength="1"/></svg>
    </span>
    <p ref={message} role="status" tabIndex={-1}>{copy.success}</p>
    <GroupLink/>
  </div>
}

export function Registration() {
  const [responseId, setResponseId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const sending = useRef(false)
  const retry = useRef<{ body: string; id: string } | null>(null)
  const [thirdStarted, setThirdStarted] = useState(false)
  const [twoComplete, setTwoComplete] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  function updateFeedback(input: HTMLInputElement, visited: boolean) {
    const message = input.validationMessage
    setFeedback(previous => {
      if ((!visited && !(input.name in previous)) || previous[input.name] === message) return previous
      return { ...previous, [input.name]: message }
    })
  }
  function fieldFeedback(name: string) {
    return feedback[name] && <small className="field-error" id={name + '-error'}>{feedback[name]}</small>
  }
  function description(name: string) {
    return feedback[name] ? name + '-error' : undefined
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current || responseId) return
    const fields = new FormData(event.currentTarget)
    const member = (prefix: string) => ({
      fullName: fields.get(prefix + 'name'), phone: fields.get(prefix + 'phone'), email: fields.get(prefix + 'email'),
    })
    let registration
    try {
      registration = registrationData({
        teamName: fields.get('team'),
        leader: { ...member('m1-'), college: fields.get('college'), department: fields.get('department'), year: fields.get('year') },
        member2: member('m2-'), member3: member('m3-'), acceptedCrewRules: fields.has('confirm'),
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Please check your registration details.')
      return
    }
    sending.current = true
    setPending(true)
    setError('')
    try {
      const body = JSON.stringify(registration)
      if (retry.current?.body !== body) retry.current = { body, id: await registrationRequestId(body) }
      const payload: RegistrationRequest = { requestId: retry.current.id, registration }
      const response = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(45000),
      })
      const result = await response.json()
      if (response.ok && result?.ok === true && typeof result.responseId === 'string' && result.responseId.trim()) {
        setResponseId(result.responseId)
      } else {
        setError(result?.ok === false && typeof result.message === 'string' ? result.message : uncertainMessage)
      }
    } catch {
      setError(uncertainMessage)
    } finally {
      sending.current = false
      setPending(false)
    }
  }
  if (responseId) return <RegistrationSuccess/>
  return <form aria-labelledby="register" aria-busy={pending} onSubmit={submit} onBlur={event => {
    if (event.target instanceof HTMLInputElement && ['tel', 'email'].includes(event.target.type)) {
      updateFeedback(event.target, true)
    }
  }} onChange={event => {
    const form = event.currentTarget
    const changed = event.target
    if (changed instanceof HTMLInputElement && changed.type === 'tel') changed.value = changed.value.trim()
    const data = new FormData(form)
    const hasValue = (name: string) => Boolean(String(data.get(name) ?? '').trim())
    const hasThirdMember = ['name', 'phone', 'email'].some(key => hasValue('m3-' + key))
    setThirdStarted(hasThirdMember)
    for (const key of ['phone', 'email']) {
      const seen = new Set<string>()
      for (const member of [1, 2, 3]) {
        const input = form.elements.namedItem('m' + member + '-' + key) as HTMLInputElement
        const value = input.value.trim().toLowerCase()
        input.setCustomValidity(value && seen.has(value) ? 'Each crew member needs a different ' + key + '.' : '')
        // Read native validity against the new optional-group state before React commits it.
        if (member === 3) input.required = hasThirdMember
        updateFeedback(input, false)
        seen.add(value)
      }
    }
    setTwoComplete(['m1-name', 'm1-phone', 'm1-email', 'college', 'department', 'year',
      'm2-name', 'm2-phone', 'm2-email'].every(name =>
        hasValue(name) && (form.elements.namedItem(name) as HTMLInputElement).validity.valid))
  }}>
    <label>Team name<input name="team" disabled={pending} required maxLength={30}/></label>
    {['Leader', 'Member 2', 'Member 3'].map((label, i) => {
      const required = i < 2 || thirdStarted
      const prefix = 'm' + (i + 1) + '-'
      return <fieldset key={label} disabled={pending}>
        <legend>{label}{i === 2 && ' (optional)'}</legend>
        <label>{i === 0 ? 'Full name' : 'Name'}<input name={prefix + 'name'} required={required}/></label>
        <label>{i === 0 ? 'Phone (WhatsApp)' : 'Phone'}<input name={prefix + 'phone'} type="tel" inputMode="numeric" pattern="[0-9]{10}" title="Enter a 10-digit phone number" required={required}
          aria-invalid={feedback[prefix + 'phone'] ? true : undefined} aria-describedby={description(prefix + 'phone')}/></label>
        {fieldFeedback(prefix + 'phone')}
        <label>Email<input type="email" name={prefix + 'email'} required={required}
          aria-invalid={feedback[prefix + 'email'] ? true : undefined} aria-describedby={description(prefix + 'email')}/></label>
        {fieldFeedback(prefix + 'email')}
        {i === 0 && <>
          <label>College<input name="college" required/></label>
          <label>Department<input name="department" required/></label>
          <label>Year of study<input name="year" required/></label>
        </>}
      </fieldset>
    })}
    <p className="crew-status" role="status">{twoComplete && !thirdStarted ? copy.warning : ''}</p>
    <label><input name="confirm" type="checkbox" disabled={pending} required/> {copy.confirm}</label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <DescentButton pending={pending}/>
  </form>
}
