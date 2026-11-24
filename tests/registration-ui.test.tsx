// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { webcrypto } from 'node:crypto'
import { registrationRequestId } from '../src/registrationRetry'
import { Registration } from '../src/components/Registration'
import { copy } from '../src/content'
import { registration, third } from './registration-fixture.mjs'

let root: Root, form: HTMLFormElement
const fetchMock = vi.fn()
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  vi.stubGlobal('fetch', fetchMock.mockReset())
  document.body.innerHTML = '<div id="mount"></div>'
  root = createRoot(document.querySelector('#mount')!)
  await act(async () => root.render(<Registration/>))
  form = document.querySelector('form')!
})
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals() })

function fill(includeThird = false) {
  const { leader, member2 } = registration
  const fields: Record<string, string> = { team: registration.teamName, college: leader.college, department: leader.department, year: leader.year }
  const members = includeThird ? [leader, member2, third] : [leader, member2]
  members.forEach((m, i) => {
    const prefix = 'm' + (i + 1) + '-'
    Object.assign(fields, { [prefix + 'name']: m.fullName, [prefix + 'phone']: m.phone, [prefix + 'email']: m.email })
  })
  for (const [name, value] of Object.entries(fields)) (form.elements.namedItem(name) as HTMLInputElement).value = value
  ;(form.elements.namedItem('confirm') as HTMLInputElement).click()
}
it.each([false, true])('retains entries on failure, prevents double submit and confirms only with a receipt (third=%s)', async includeThird => {
  await act(async () => fill(includeThird))
  expect(form.checkValidity()).toBe(true)
  expect(form.textContent?.includes(copy.warning)).toBe(!includeThird)
  let finish!: (value: unknown) => void
  fetchMock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  await act(async () => {
    form.requestSubmit()
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const button = form.querySelector('button[type=submit]')!
  expect(button.textContent).toBe('Logging your crew...')
  expect(button.hasAttribute('disabled')).toBe(true)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/register')
  const first = JSON.parse(options.body)
  expect(first.registration).toEqual({ ...registration, member3: includeThird ? third : null })
  await act(async () => finish({ ok: true, json: async () => ({ ok: true }) }))
  expect(form.querySelector('[role=alert]')?.textContent).toContain('could not be confirmed')
  expect(document.querySelector('.registration-success')).toBeNull()
  expect(document.querySelector('a[href^="https://chat.whatsapp.com/"]')).toBeNull()
  expect((form.elements.namedItem('m1-phone') as HTMLInputElement).value).toBe('0123456789')
  expect(button.hasAttribute('disabled')).toBe(false)
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, responseId: 'confirmed' }) })
  await act(async () => form.requestSubmit())
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).requestId).toBe(first.requestId)
  expect(document.querySelector('.registration-success [role=status]')?.textContent).toBe(copy.success)
  expect(document.activeElement?.textContent).toBe(copy.success)
  expect(document.querySelector('.registration-success a[href^="https://chat.whatsapp.com/"]')?.textContent).toBe(copy.whatsapp)
})
it('native validation stops an empty registration', async () => {
  await act(async () => form.requestSubmit())
  expect(fetchMock).not.toHaveBeenCalled()
})
it('recovers a retry ID in the same tab after reload and rotates it for edited details', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const payload = JSON.stringify(registration)
  const first = await registrationRequestId(payload)
  expect(await registrationRequestId(payload)).toBe(first)
  expect(sessionStorage.getItem('deepsea.registration.retry')).not.toContain(registration.leader.email)
  expect(await registrationRequestId(JSON.stringify({ ...registration, member3: third }))).not.toBe(first)
})
