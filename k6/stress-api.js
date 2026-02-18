import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const apiChecks = new Rate('api_checks')

const baseUrl = (__ENV.K6_BASE_URL || 'http://localhost:8000/pubblica').replace(/\/+$/, '')
const requestTimeout = `${readInt('K6_TIMEOUT_MS', 15000)}ms`
const listLimit = readInt('K6_PREVENTIVI_LIMIT', 10)

const sleepSeconds = readFloat('K6_SLEEP_SECONDS', 0.5)
const failedRateThreshold = readFloat('K6_THRESHOLD_FAILED_RATE', 0.05)
const p95MsThreshold = readInt('K6_THRESHOLD_P95_MS', 1500)
const checksRateThreshold = readFloat('K6_THRESHOLD_CHECKS_RATE', 0.99)

export const options = {
  scenarios: {
    api_stress: {
      executor: 'ramping-vus',
      startVUs: readInt('K6_START_VUS', 1),
      gracefulRampDown: __ENV.K6_GRACEFUL_RAMP_DOWN || '30s',
      stages: [
        { duration: __ENV.K6_STAGE_1_DURATION || '30s', target: readInt('K6_STAGE_1_TARGET', 10) },
        { duration: __ENV.K6_STAGE_2_DURATION || '1m', target: readInt('K6_STAGE_2_TARGET', 30) },
        { duration: __ENV.K6_STAGE_3_DURATION || '1m', target: readInt('K6_STAGE_3_TARGET', 60) },
        { duration: __ENV.K6_STAGE_4_DURATION || '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: [`rate<${failedRateThreshold}`],
    http_req_duration: [`p(95)<${p95MsThreshold}`],
    api_checks: [`rate>${checksRateThreshold}`],
  },
}

export function setup() {
  const identifier = (__ENV.K6_LOGIN_IDENTIFIER || '').trim()
  const password = (__ENV.K6_LOGIN_PASSWORD || '').trim()
  if (!identifier || !password) {
    throw new Error('K6_LOGIN_IDENTIFIER e K6_LOGIN_PASSWORD sono obbligatori.')
  }

  const loginPayload = JSON.stringify({ identifier, password })
  const loginRes = http.post(`${baseUrl}/login.php`, loginPayload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: requestTimeout,
    tags: { endpoint: 'login' },
  })

  const loginBody = safeJson(loginRes)
  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login token presente': () => typeof loginBody?.token === 'string' && loginBody.token.length > 20,
    'login senza MFA required': () => loginBody?.mfa_required !== true,
  })
  apiChecks.add(loginOk)

  if (!loginOk) {
    throw new Error(`Login fallito: status=${loginRes.status}, body=${loginRes.body}`)
  }

  return { token: loginBody.token }
}

export default function (setupData) {
  const headers = buildAuthHeaders(setupData?.token)
  const commonParams = { headers, timeout: requestTimeout }

  group('preventivi', function () {
    const listRes = http.get(`${baseUrl}/preventiviList.php?limit=${listLimit}`, {
      ...commonParams,
      tags: { endpoint: 'preventiviList' },
    })
    const listBody = safeJson(listRes)
    const listOk = check(listRes, {
      'preventiviList status 200': (r) => r.status === 200,
      'preventiviList payload valido': () => listBody !== null && typeof listBody === 'object',
    })
    apiChecks.add(listOk)

    const selectedId = pickPreventivoId(listBody)
    if (!selectedId) {
      return
    }

    const detailRes = http.get(`${baseUrl}/preventiviDetail.php?id=${selectedId}`, {
      ...commonParams,
      tags: { endpoint: 'preventiviDetail' },
    })
    const detailBody = safeJson(detailRes)
    const detailOk = check(detailRes, {
      'preventiviDetail status 200': (r) => r.status === 200,
      'preventiviDetail payload valido': () => detailBody !== null && typeof detailBody === 'object',
    })
    apiChecks.add(detailOk)
  })

  group('acquisti-richieste', function () {
    const acquistiRes = http.get(`${baseUrl}/acquistiRichiesteList.php`, {
      ...commonParams,
      tags: { endpoint: 'acquistiRichiesteList' },
    })
    const acquistiBody = safeJson(acquistiRes)
    const acquistiOk = check(acquistiRes, {
      'acquistiRichiesteList status 200': (r) => r.status === 200,
      'acquistiRichiesteList payload valido': () => acquistiBody !== null && typeof acquistiBody === 'object',
    })
    apiChecks.add(acquistiOk)
  })

  sleep(sleepSeconds)
}

function buildAuthHeaders(token) {
  if (!token) {
    return { Accept: 'application/json' }
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Authorization': `Bearer ${token}`,
    'X-Access-Token': token,
  }
}

function pickPreventivoId(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : []
  if (rows.length === 0) {
    return null
  }

  const candidate = rows[Math.floor(Math.random() * rows.length)]
  const rawId = candidate?.id_preventivo ?? candidate?.id ?? null
  const id = Number(rawId)
  return Number.isFinite(id) && id > 0 ? id : null
}

function safeJson(response) {
  if (!response || typeof response.json !== 'function') {
    return null
  }
  try {
    return response.json()
  } catch (_error) {
    return null
  }
}

function readInt(name, fallback) {
  const value = Number.parseInt(__ENV[name], 10)
  return Number.isFinite(value) ? value : fallback
}

function readFloat(name, fallback) {
  const value = Number.parseFloat(__ENV[name])
  return Number.isFinite(value) ? value : fallback
}
