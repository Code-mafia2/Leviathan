import { afterEach, expect, it, vi } from 'vitest'
import { once } from 'node:events'
import { registrationApi } from '../server/registration.mjs'
import { registration, requestId, secret } from './registration-fixture.mjs'

const env = { GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test/exec', REGISTRATION_API_SECRET: secret }
const servers = []
afterEach(async () => {
  for (const server of servers.splice(0)) {
    const closed = once(server, 'close')
    server.close()
    server.closeAllConnections()
    await closed
  }
})

async function endpoint(upstream, config = env) {
  const server = registrationApi(config, upstream).listen(0, '127.0.0.1')
  servers.push(server)
  await once(server, 'listening')
  const url = 'http://127.0.0.1:' + server.address().port + '/api/register'
  return (body = { requestId, registration }, options = {}) => fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...options,
  })
}

it('authenticates the POST and follows the content redirect with a clean GET', async () => {
  const upstream = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/macros/echo?test' } }))
    .mockResolvedValueOnce(Response.json({ ok: true, responseId: 'google-id' }))
  const post = await endpoint(upstream)
  const result = await post()
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ ok: true, responseId: 'google-id' })
  expect(JSON.parse(upstream.mock.calls[0][1].body)).toEqual({ requestId, registration, secret })
  expect(upstream.mock.calls[1][1].method).toBe('GET')
  expect(upstream.mock.calls[1][1].body).toBeUndefined()
})
it.each([
  ['duplicate team', { ok: false, code: 'duplicate_team' }, 409],
  ['closed', { ok: false, code: 'closed' }, 403], ['auth', { ok: false, code: 'unauthorized' }, 502],
  ['validation', { ok: false, code: 'validation' }, 422], ['busy', { ok: false, code: 'busy' }, 503],
  ['missing receipt', { ok: true }, 502], ['blank receipt', { ok: true, responseId: '  ' }, 502],
])('maps %s to a safe HTTP error', async (_, value, status) => {
  const post = await endpoint(async () => Response.json({ ...value, message: 'internal detail' }))
  const result = await post()
  expect(result.status).toBe(status)
  expect((await result.json()).message).not.toContain('internal detail')
})
it.each([
  ['network failure', () => { throw Error() }, 502], ['timeout', () => { throw new DOMException('', 'TimeoutError') }, 504],
  ['invalid JSON', () => new Response('<html>Sign in</html>'), 502],
  ['unexpected redirect', () => Response.redirect('https://example.test'), 502],
  ['service failure', () => new Response('', { status: 503 }), 502],
])('handles %s', async (_, upstream, status) => expect((await (await endpoint(upstream))()).status).toBe(status))
it('validates before forwarding and enforces the request limit', async () => {
  const upstream = vi.fn(), post = await endpoint(upstream)
  expect((await post({ requestId, registration: { ...registration, member2: {} } })).status).toBe(422)
  expect((await post({ requestId, padding: 'a'.repeat(13000) })).status).toBe(413)
  expect((await post({}, { body: '{' })).status).toBe(400)
  for (let n = 0; n < 27; n++) await post({})
  expect((await post({})).status).toBe(429)
  expect(upstream).not.toHaveBeenCalled()
})
it('fails closed without server configuration', async () => {
  const upstream = vi.fn(), post = await endpoint(upstream, {})
  expect((await post()).status).toBe(503)
  expect(upstream).not.toHaveBeenCalled()
})
