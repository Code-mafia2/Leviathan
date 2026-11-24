import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { registrationData, uncertainMessage, validRequestId } from '../shared/registration.ts'

const failures = new Map(Object.entries({
  duplicate_team: [409, 'A team with this name has already registered. Please choose a different team name.'],
  request_conflict: [409, 'These details differ from the previous attempt. Please submit again with the original details.'],
  closed: [403, 'Registration is currently closed.'],
  validation: [422, 'Please check your registration details.'],
  busy: [503, 'Registration is busy. Please retry using the same details.'],
  unauthorized: [502, 'Registration is temporarily unavailable.'],
  configuration: [503, 'Registration is temporarily unavailable.'],
  unavailable: [503, uncertainMessage],
}))

async function forward(url, envelope, fetchImpl) {
  const signal = AbortSignal.timeout(35000)
  let result = await fetchImpl(url, {
    method: 'POST', redirect: 'manual', signal,
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope),
  })
  // ContentService returns a one-time Google content URL. Only the first POST carries credentials.
  if ([301, 302, 303].includes(result.status)) {
    const target = new URL(result.headers.get('location'), url)
    if (target.origin !== 'https://script.googleusercontent.com') throw Error()
    result = await fetchImpl(target, { method: 'GET', redirect: 'error', signal })
  }
  if (!result.ok) throw Error()
  return result.json()
}

export function registrationApi(env, fetchImpl = fetch) {
  const scriptUrl = env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbykH1EJAYmPo58yfeQsVRh9VT9st7OCpLogOECVEFaSTaQ58REb6t_R5L73CszPZB2f/exec'
  const app = express()
  app.disable('x-powered-by')
  if (env.TRUSTED_PROXY_IP) app.set('trust proxy', env.TRUSTED_PROXY_IP)
  const router = express.Router()
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.use(rateLimit({
    windowMs: 600000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { ok: false, message: 'Too many registration attempts. Please try again in ten minutes.' },
  }))
  let active = 0
  router.post('/', (req, res, next) => {
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ ok: false, message: 'Please submit through the registration page.' })
    if (!req.is('application/json')) return res.status(415).json({ ok: false, message: 'Expected a JSON registration.' })
    next()
  }, express.json({ limit: '12kb', inflate: false }), async (req, res) => {
    const requestId = req.body?.requestId
    if (typeof requestId !== 'string' || !validRequestId.test(requestId)) {
      return res.status(400).json({ ok: false, message: 'Invalid registration request ID.' })
    }
    let registration
    try { registration = registrationData(req.body.registration) }
    catch (error) { return res.status(422).json({ ok: false, message: error.message }) }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(scriptUrl)
        || (env.REGISTRATION_API_SECRET || '').length < 32) {
      return res.status(503).json({ ok: false, message: 'Registration is temporarily unavailable.' })
    }
    if (active >= 8) return res.status(503).json({ ok: false, message: failures.get('busy')[1] })
    active++
    try {
      const result = await forward(scriptUrl, { requestId, registration, secret: env.REGISTRATION_API_SECRET }, fetchImpl)
      if (result?.ok === true && typeof result.responseId === 'string' && result.responseId.trim()) {
        return res.json({ ok: true, responseId: result.responseId })
      }
      const [status, message] = (result?.ok === false && failures.get(result.code)) || [502, uncertainMessage]
      return res.status(status).json({ ok: false, message })
    } catch (error) {
      return res.status(error?.name === 'TimeoutError' ? 504 : 502).json({ ok: false, message: uncertainMessage })
    } finally { active-- }
  })
  router.all('/', (_req, res) => res.set('Allow', 'POST').status(405).json({ ok: false, message: 'Use POST for registration.' }))
  router.use((error, _req, res, _next) => {
    const status = [400, 413, 415].includes(error.status) ? error.status : 500
    res.status(status).json({ ok: false, message: status === 413 ? 'Registration is too large.' : 'Invalid registration request.' })
  })
  app.use('/api/register', router)
  return app
}
