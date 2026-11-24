import { createServer } from 'node:http'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import express from 'express'
import { afterEach, expect, it, vi } from 'vitest'
import { registration, requestId, secret } from './registration-fixture.mjs'

const nativeFetch = globalThis.fetch
const servers = []
afterEach(async () => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  for (const server of servers.splice(0)) {
    const closed = once(server, 'close')
    server.close()
    server.closeAllConnections()
    await closed
  }
})

async function endpoint({ url = 'https://script.google.com/macros/s/current-test/exec', key = secret, parsed = false } = {}) {
  vi.resetModules()
  vi.stubEnv('GOOGLE_APPS_SCRIPT_URL', url)
  vi.stubEnv('REGISTRATION_API_SECRET', key)
  vi.stubEnv('VERCEL', '1')
  const upstream = vi.fn(async () => Response.json({ ok: true, responseId: 'verified-response' }))
  vi.stubGlobal('fetch', upstream)
  const { default: handler } = await import('../api/register.mjs')
  const app = express()
  if (parsed) app.use(express.json({ limit: '1mb' }))
  app.use(handler)
  const server = createServer(app).listen(0, '127.0.0.1')
  servers.push(server)
  await once(server, 'listening')
  const base = 'http://127.0.0.1:' + server.address().port
  const post = (body = { requestId, registration }, ip = '192.0.2.1') => nativeFetch(base + '/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-vercel-forwarded-for': ip }, body: JSON.stringify(body),
  })
  return { base, post, upstream }
}

it.each([false, true])('serves the Vercel entry point with a parsed body = %s', async parsed => {
  const { base, post, upstream } = await endpoint({ parsed })
  const result = await post()
  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ ok: true, responseId: 'verified-response' })
  expect(upstream.mock.calls[0][0]).toBe('https://script.google.com/macros/s/current-test/exec')
  expect(JSON.parse(upstream.mock.calls[0][1].body).secret).toBe(secret)
  expect((await nativeFetch(base + '/api/register')).status).toBe(405)
  expect((await post({ requestId, padding: 'x'.repeat(14000) })).status).toBe(413)
})
it.each([{ url: '' }, { key: '' }])('fails safely when a required environment setting is missing: %j', async options => {
  const { post, upstream } = await endpoint(options)
  const response = await post()
  expect(response.status).toBe(503)
  expect((await response.json()).ok).toBe(false)
  expect(upstream).not.toHaveBeenCalled()
})
it('limits a warm instance by the Vercel client IP', async () => {
  const { post } = await endpoint()
  for (let i = 0; i < 30; i++) await post({})
  expect((await post()).status).toBe(429)
  expect((await post(undefined, '192.0.2.2')).status).toBe(200)
})
it('configures the Vite output and a function duration above the Google timeout without a fallback rewrite', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  expect(config.framework).toBe('vite')
  expect(config.outputDirectory).toBe('dist')
  expect(config.functions['api/register.mjs'].maxDuration).toBeGreaterThan(35)
  expect(config.rewrites).toBeUndefined()
})
