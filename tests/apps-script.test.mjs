import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { registrationData } from '../shared/registration.ts'
import { registration, requestId, secret, third } from './registration-fixture.mjs'

const source = readFileSync(new URL('../apps-script/RegistrationAPI.gs', import.meta.url), 'utf8')
const choice = 'I confirm that I have read and understood the crew rules, and that the information submitted for my team is accurate.'
const titles = ['Team Name', 'Team Leader — Full Name', 'Team Leader — WhatsApp Number', 'Team Leader — Email Address',
  'Team Leader — College', 'Team Leader — Department', 'Team Leader — Year of Study', 'Member 2 — Full Name',
  'Member 2 — Phone Number', 'Member 2 — Email Address', 'Member 3 — Full Name', 'Member 3 — Phone Number',
  'Member 3 — Email Address', 'Confirmation — I have read the crew rules']

function google() {
  const properties = { REGISTRATION_API_SECRET: secret }
  const responses = []
  const items = titles.map((title, i) => ({
    getId: () => 100 + i, getTitle: () => (i + 1) + '. ' + title, getType: () => i === 13 ? 'CHECKBOX' : 'TEXT',
    asCheckboxItem() { return this }, asTextItem() { return this }, isRequired: () => i < 10 || i === 13,
    getChoices: () => [{ getValue: () => choice }], createResponse: value => [100 + i, value],
  }))
  const form = {
    getItems: () => [{ getType: () => 'SECTION_HEADER' }, ...items.toReversed()],
    getDestinationType: () => 'SPREADSHEET', getDestinationId: () => '1OlbUc33Wf2Cs_ZUs6WneCjv3eeZ1XL5cmyJ9IkzZUto',
    isAcceptingResponses: () => true, getResponses: () => responses,
    createResponse() {
      const answers = new Map()
      return {
        answers, withItemResponse(pair) { answers.set(...pair); return this },
        submit() { responses.push(this); return this }, getId: () => 'confirmed-id',
        getResponseForItem(item) { return answers.has(item.getId()) ? { getResponse: () => answers.get(item.getId()) } : null },
      }
    },
  }
  const lock = { tryLock: vi.fn(() => true), releaseLock: vi.fn() }
  const store = { getProperties: () => ({ ...properties }), getProperty: k => properties[k],
    setProperty(k, v) { properties[k] = v }, deleteProperty(k) { delete properties[k] } }
  const context = vm.createContext({
    FormApp: { openById: id => { expect(id).toBe('1wBwsA9ZTMQt19oQ9lnJzwlitFYMGf3EW6h9PqGvsU0s'); return form },
      DestinationType: { SPREADSHEET: 'SPREADSHEET' } },
    PropertiesService: { getScriptProperties: () => store }, LockService: { getScriptLock: () => lock },
    Utilities: { DigestAlgorithm: {}, Charset: {}, computeDigest: (_, s) => createHash('sha256').update(s).digest(), base64EncodeWebSafe: b => b.toString('base64url') },
    ContentService: { MimeType: {}, createTextOutput: json => ({ setMimeType: () => JSON.parse(json) }) },
  })
  vm.runInContext(source, context)
  function post(data = registration, overrides = {}) {
    return context.doPost({ postData: { contents: JSON.stringify({ registration: data, secret, requestId, ...overrides }) } })
  }
  return { form, items, store, lock, post, responses, context }
}

describe('existing Google Form', () => {
  it.each([false, true])('submits mapped answers including optional third member %s', useThird => {
    const g = google()
    expect(g.post({ ...registration, member3: useThird ? third : null })).toEqual({ ok: true, responseId: 'confirmed-id' })
    const answers = g.responses[0].answers
    expect([...answers.values()]).toEqual([registration.teamName, ...Object.values(registration.leader),
      ...Object.values(registration.member2), ...(useThird ? Object.values(third) : []), [choice]])
  })
  it('recovers the response ID after Google commits but saving the receipt fails', () => {
    const g = google(), save = g.store.setProperty
    g.store.setProperty = (k, v) => { if (JSON.parse(v).id) throw Error(); save(k, v) }
    expect(g.post().ok).toBe(false)
    g.form.isAcceptingResponses = () => false
    g.store.setProperty = save
    expect(g.post().responseId).toBe('confirmed-id')
    expect(g.post().responseId).toBe('confirmed-id')
    expect(g.responses).toHaveLength(1)
    expect(g.lock.releaseLock).toHaveBeenCalledTimes(3)
  })
  it('rejects duplicate names and reuse of a request ID with different data', () => {
    const g = google()
    g.post()
    expect(g.post({ ...registration, teamName: ' test  CREW ' }, { requestId: crypto.randomUUID() }).code).toBe('duplicate_team')
    expect(g.post({ ...registration, member3: third }).code).toBe('request_conflict')
    expect(g.responses).toHaveLength(1)
  })
  it.each(['destination', 'title', 'type', 'choice', 'required'])('refuses schema or destination mismatch: %s', kind => {
    const g = google()
    if (kind === 'destination') g.form.getDestinationId = () => 'other'
    if (kind === 'title') g.items[0].getTitle = () => 'changed'
    if (kind === 'type') g.items[0].getType = () => 'CHECKBOX'
    if (kind === 'choice') g.items[13].getChoices = () => []
    if (kind === 'required') g.items[12].isRequired = () => true
    expect(g.post().code).toBe('configuration')
    expect(g.responses).toHaveLength(0)
  })
  it('rejects unauthenticated, busy and closed registrations', () => {
    const g = google()
    expect(g.post(registration, { secret: 'wrong' }).code).toBe('unauthorized')
    expect(g.lock.tryLock).not.toHaveBeenCalled()
    g.lock.tryLock.mockReturnValueOnce(false)
    expect(g.post().code).toBe('busy')
    g.form.isAcceptingResponses = () => false
    expect(g.post().code).toBe('closed')
    expect(g.responses).toHaveLength(0)
  })
})

describe('validation across client, API and Apps Script', () => {
  it.each([
    ['long name', d => d.teamName = 'a'.repeat(31)], ['blank name', d => d.teamName = ' '],
    ['missing member', d => delete d.member2], ['missing college', d => d.leader.college = ' '],
    ['missing year', d => delete d.leader.year], ['missing department', d => delete d.leader.department],
    ['missing full name', d => d.member2.fullName = ' '], ['numeric phone', d => d.leader.phone = 1234567890],
    ['invalid phone', d => d.member2.phone = '1234'], ['invalid email', d => d.leader.email = 'a@-example.test'],
    ['partial third member', d => d.member3 = { fullName: 'Third' }], ['invalid third email', d => d.member3 = { ...third, email: 'x' }],
    ['invalid third phone', d => d.member3 = { ...third, phone: '+123' }], ['duplicate phone', d => d.member2.phone = d.leader.phone],
    ['duplicate email', d => d.member3 = { ...third, email: d.leader.email.toUpperCase() }],
    ['unchecked confirmation', d => d.acceptedCrewRules = false],
  ])('rejects %s', (_, edit) => {
    const input = structuredClone(registration)
    edit(input)
    expect(() => registrationData(input)).toThrow()
    expect(google().post(input).code).toBe('validation')
  })
})
