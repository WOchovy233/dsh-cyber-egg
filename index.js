import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { catalog, accessLabels, relayProtocols } from './catalog.js'

const NAME = 'cyber-egg'
const API_PREFIX = '/cyber-egg/api'
// Keep in sync with package.json; the update check falls back to this when the
// loader gives us an entry URL that does not sit next to package.json.
const PLUGIN_VERSION = '1.5.6'

/**
 * Release signing key (Ed25519, public half). The private half lives outside the
 * repository at D:\python\鸡蛋私钥.pem and is only used by publish-github.ps1.
 * Replacing this constant means replacing the trust root: ships a new key and every
 * installed copy must be updated manually once, so treat the private key as precious.
 */
const UPDATE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEANg2VG31PFiDspqYP4Jsv2tri0jZNtnUZluNf2LYKJ1o=
-----END PUBLIC KEY-----`

export const inject = ['webServer']

/* ------------------------------------------------------------------ state */

function stateFile() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  const profile = String(process.env.DSH_PROFILE || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(home, NAME, `${profile}.json`)
}

function legacyStateFile() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  return path.join(home, NAME, 'state.json')
}

function emptyState() {
  return {
    version: 1,
    installed: {},
    relays: [],
    claims: { enabled: false, hour: 9, minute: 0, catchUp: true, userSet: false },
    today: {},
    history: [],
    lastRun: null,
    radar: { at: null, freeCount: 0, ids: [], newIds: [], items: [], source: null, warning: null, error: null },
    kilo: { at: null, items: [], error: null },
    pollinations: { at: null, items: [], error: null },
    llm7: { at: null, items: [], error: null },
    anonBlocked: [],
    anonHealth: null,
    feeds: [],
    feedSources: [],
    feedNewIds: [],
    feedSeenIds: [],
    officialCatalog: {
      at: null,
      version: null,
      updatedAt: null,
      sources: [],
      accessLabels: {},
      source: null,
      error: null,
      lastAttemptAt: null,
    },
    officialNewIds: [],
    officialSeenIds: catalog.map(source => source.id),
  }
}

function loadState() {
  const base = emptyState()
  for (const file of [stateFile(), legacyStateFile()]) {
    try {
      const raw = fs.readFileSync(file, 'utf8')
      const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''))
      return {
        ...base,
        ...parsed,
        claims: { ...base.claims, ...(parsed.claims || {}) },
        installed: parsed.installed && typeof parsed.installed === 'object' ? parsed.installed : {},
        relays: Array.isArray(parsed.relays) ? parsed.relays : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        today: parsed.today && typeof parsed.today === 'object' ? parsed.today : {},
        radar: { ...base.radar, ...(parsed.radar || {}) },
        kilo: { ...base.kilo, ...(parsed.kilo || {}) },
        pollinations: { ...base.pollinations, ...(parsed.pollinations || {}) },
        llm7: { ...base.llm7, ...(parsed.llm7 || {}) },
        anonBlocked: Array.isArray(parsed.anonBlocked) ? parsed.anonBlocked : [],
        anonHealth: parsed.anonHealth && typeof parsed.anonHealth === 'object' ? parsed.anonHealth : null,
        feeds: Array.isArray(parsed.feeds) ? parsed.feeds : [],
        feedSources: Array.isArray(parsed.feedSources) ? parsed.feedSources : [],
        feedNewIds: Array.isArray(parsed.feedNewIds) ? parsed.feedNewIds : [],
        feedSeenIds: Array.isArray(parsed.feedSeenIds) ? parsed.feedSeenIds : [],
        officialCatalog: {
          ...base.officialCatalog,
          ...(parsed.officialCatalog && typeof parsed.officialCatalog === 'object' ? parsed.officialCatalog : {}),
          sources: Array.isArray(parsed.officialCatalog?.sources) ? parsed.officialCatalog.sources : [],
          accessLabels:
            parsed.officialCatalog && typeof parsed.officialCatalog.accessLabels === 'object'
              ? parsed.officialCatalog.accessLabels
              : {},
        },
        officialNewIds: Array.isArray(parsed.officialNewIds) ? parsed.officialNewIds : [],
        officialSeenIds: Array.isArray(parsed.officialSeenIds)
          ? parsed.officialSeenIds
          : catalog.map(source => source.id),
      }
    } catch {
      /* try the next location */
    }
  }
  return base
}

function saveState(state) {
  const file = stateFile()
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
    fs.renameSync(tmp, file)
  } catch (error) {
    console.error(`[${NAME}] failed to persist state:`, error)
  }
}

/* ----------------------------------------------------------------- utils */

const pad = n => String(n).padStart(2, '0')
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** One claim round at a time: a manual click and the scheduler must not both
 *  hit the same upstream twice, and history must not gain duplicate rows. */
let claimChain = Promise.resolve()
function withClaimLock(task) {
  const run = claimChain.then(task, task)
  claimChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function json(res, status, body) {  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

function localOriginAllowed(req) {
  const origin = req.headers.origin
  if (!origin) return true
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(origin))
}

async function readBody(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > 512 * 1024) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  const text = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function cleanBase(url) {
  if (typeof url !== 'string' || !url.trim()) throw new Error('地址不能为空')
  const trimmed = url.trim().replace(/\/+$/, '')
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('地址格式不正确，需要以 http:// 或 https:// 开头')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('只支持 http/https 地址')
  return trimmed
}

const ROUTE_REF = id =>
  `EGG_${String(id)
    .replace(/^egg-/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
const RELAY_REF = id => `CYBER_EGG_RELAY_${id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`

function textOf(value) {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/* ----------------------------------------------------------------- radar */

const OPENROUTER_MODELS = 'https://openrouter.ai/api/v1/models'
const UA = 'dsh-cyber-egg/1.1 (local DSH plugin; free-token panel)'

async function getJson(url, timeoutMs, extraHeaders) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': UA, ...(extraHeaders || {}) },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

async function getText(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json, text/plain, */*', 'user-agent': UA, 'cache-control': 'no-cache' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

const NETWORK_HINTS = {
  ENOTFOUND: '域名解析失败',
  EAI_AGAIN: '域名解析失败（临时）',
  ECONNREFUSED: '连接被拒绝',
  ECONNRESET: '连接被重置',
  ETIMEDOUT: '连接超时',
  UND_ERR_CONNECT_TIMEOUT: '连接超时',
  UND_ERR_SOCKET: '连接被中断',
  CERT_HAS_EXPIRED: '证书已过期',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: '证书校验失败',
}

function describeNetworkError(error, timeoutMs) {
  if (error?.name === 'AbortError') return `请求超时（${Math.round(timeoutMs / 1000)} 秒）`
  const message = String(error?.message || '')
  if (/^HTTP \d{3}$/.test(message)) return `服务返回 ${message}`
  const cause = error?.cause
  const code = cause?.code || cause?.cause?.code || ''
  const hint = NETWORK_HINTS[code] || (code ? String(code) : '')
  const reason = hint || (cause?.message ? String(cause.message).slice(0, 80) : '')
  return reason ? `网络不可达（${reason}）` : '网络不可达'
}

async function radarFromKilo(state, previous) {
  if (!Array.isArray(state.kilo?.items) || !state.kilo.items.length) {
    const outcome = await refreshKilo(state, false)
    if (!outcome.ok && !state.kilo?.items?.length) return null
  }
  const items = (state.kilo?.items || []).map(item => ({
    id: item.id,
    name: item.name,
    vendor: item.vendor,
    context: item.context || 0,
    created: 0,
  }))
  if (!items.length) return null
  const ids = items.map(item => item.id)
  return {
    at: new Date().toISOString(),
    freeCount: items.length,
    ids,
    newIds: previous.size ? ids.filter(id => !previous.has(id)) : [],
    items,
    source: 'kilo',
    error: null,
  }
}

async function refreshRadar(state) {
  const previous = new Set(Array.isArray(state.radar?.ids) ? state.radar.ids : [])
  try {
    const payload = await getJson(OPENROUTER_MODELS, 20000)
    const rows = Array.isArray(payload?.data) ? payload.data : []
    const items = rows
      .filter(model => {
        const pricing = model?.pricing
        if (!pricing) return false
        if (Number(pricing.prompt) !== 0 || Number(pricing.completion) !== 0) return false
        const outputs = model?.architecture?.output_modalities
        if (Array.isArray(outputs) && outputs.length) {
          if (!outputs.includes('text')) return false
          if (outputs.includes('audio')) return false
        }
        return true
      })
      .map(model => ({
        id: String(model.id || ''),
        name: String(model.name || model.id || ''),
        vendor: String(model.id || '').split('/')[0] || '',
        context: Number(model.context_length) || 0,
        created: Number(model.created) || 0,
      }))
      .filter(item => item.id)
      .sort((left, right) => right.created - left.created)
      .slice(0, 80)
    const ids = items.map(item => item.id)
    const newIds = previous.size ? ids.filter(id => !previous.has(id)) : []
    state.radar = {
      at: new Date().toISOString(),
      freeCount: items.length,
      ids,
      newIds,
      items,
      source: 'openrouter',
      warning: null,
      error: null,
    }
    return { ok: true, source: 'openrouter', freeCount: items.length, newCount: newIds.length }
  } catch (error) {
    const message = describeNetworkError(error, 20000)
    const fallback = await radarFromKilo(state, previous).catch(() => null)
    if (fallback) {
      state.radar = { ...fallback, warning: message }
      return {
        ok: true,
        source: 'kilo',
        warning: message,
        freeCount: fallback.freeCount,
        newCount: fallback.newIds.length,
      }
    }
    state.radar = { ...state.radar, at: new Date().toISOString(), error: message }
    return { ok: false, error: message }
  }
}

const SOURCE_TIERS = new Set(['hot', 'pick', 'more'])
const SOURCE_APIS = new Set(['openai-completions', 'openai-responses', 'anthropic-messages', 'google-generative-ai'])
const SOURCE_ACCESS = new Set(['cn-direct', 'cn-vpn', 'cn-card'])

function fieldText(value, limit) {
  return (typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)).trim().slice(0, limit)
}

function fieldUrl(value, limit = 300) {
  const text = fieldText(value, limit)
  if (!text) return ''
  try {
    return cleanBase(text).slice(0, limit)
  } catch {
    return ''
  }
}

function sanitiseSource(raw, { official = false } = {}) {
  if (!raw || typeof raw !== 'object') return null
  const id = fieldText(raw.id, 80)
  const baseURL = fieldUrl(raw.baseURL)
  if (!id || !baseURL) return null
  const tier = official && SOURCE_TIERS.has(raw.tier) ? raw.tier : official ? 'more' : 'feed'
  const name = fieldText(raw.name, 80) || id
  const blurb = fieldText(raw.blurb, 200)
  return {
    id: /^[a-z0-9][a-z0-9-]{1,40}$/.test(id) ? id : `feed-${Buffer.from(id).toString('hex').slice(0, 10)}`,
    tier,
    name,
    vendor: fieldText(raw.vendor, 80) || name,
    region: raw.region === 'cn' ? 'cn' : 'global',
    tag: fieldText(raw.tag, 40) || (official ? '官方精选' : '订阅源'),
    daily: fieldText(raw.daily, 80),
    dailyNote: fieldText(raw.dailyNote, 160),
    access: SOURCE_ACCESS.has(raw.access) ? raw.access : 'cn-vpn',
    quota: fieldText(raw.quota, 80),
    blurb,
    detail: fieldText(raw.detail, 400) || blurb,
    signupUrl: fieldUrl(raw.signupUrl, 300),
    api: SOURCE_APIS.has(raw.api) ? raw.api : 'openai-completions',
    baseURL,
    keyHint: fieldText(raw.keyHint, 60),
  }
}

function sanitiseFeedSource(raw) {
  return sanitiseSource(raw, { official: false })
}

/* ------------------------------------------------ official source catalogue */

const CATALOG_SCHEMA = 1
const OFFICIAL_CATALOG_TTL = 3 * 24 * 60 * 60 * 1000

/** Canonical source fields covered by the official-catalogue signature. */
function catalogSourcePayload(raw) {
  return {
    id: fieldText(raw?.id, 80),
    tier: fieldText(raw?.tier, 20),
    name: fieldText(raw?.name, 80),
    vendor: fieldText(raw?.vendor, 80),
    region: fieldText(raw?.region, 20),
    tag: fieldText(raw?.tag, 40),
    daily: fieldText(raw?.daily, 80),
    dailyNote: fieldText(raw?.dailyNote, 160),
    access: fieldText(raw?.access, 20),
    quota: fieldText(raw?.quota, 80),
    blurb: fieldText(raw?.blurb, 200),
    detail: fieldText(raw?.detail, 400),
    signupUrl: fieldText(raw?.signupUrl, 300),
    api: fieldText(raw?.api, 60),
    baseURL: fieldText(raw?.baseURL, 300),
    keyHint: fieldText(raw?.keyHint, 60),
  }
}

function catalogPayload(doc) {
  const labels = doc?.accessLabels && typeof doc.accessLabels === 'object' ? doc.accessLabels : {}
  return Buffer.from(
    JSON.stringify({
      schema: Number(doc?.schema || CATALOG_SCHEMA),
      version: String(doc?.version || ''),
      updatedAt: String(doc?.updatedAt || ''),
      sources: (Array.isArray(doc?.sources) ? doc.sources : []).map(catalogSourcePayload),
      accessLabels: Object.keys(labels)
        .sort()
        .map(key => [String(key), String(labels[key] ?? '')]),
    }),
    'utf8',
  )
}

function catalogFields(doc) {
  if (Number(doc?.schema || CATALOG_SCHEMA) !== CATALOG_SCHEMA) throw new Error('官方源清单版本不受支持')
  const version = String(doc?.version || '').trim()
  const updatedAt = String(doc?.updatedAt || '').trim()
  if (!version) throw new Error('官方源清单缺少 version')
  if (!updatedAt) throw new Error('官方源清单缺少 updatedAt')
  const rows = Array.isArray(doc?.sources) ? doc.sources.slice(0, 200) : []
  const sources = rows.map(row => sanitiseSource(row, { official: true })).filter(Boolean)
  if (!sources.length) throw new Error('官方源清单没有有效来源')
  const accessLabels = {}
  if (doc?.accessLabels && typeof doc.accessLabels === 'object') {
    for (const [key, value] of Object.entries(doc.accessLabels).slice(0, 30)) {
      accessLabels[String(key).slice(0, 40)] = String(value ?? '').slice(0, 80)
    }
  }
  return { version, updatedAt, sources, accessLabels }
}

function verifyOfficialCatalog(doc) {
  const signature = String(doc?.signature || '').trim()
  if (!signature) throw new Error('官方源清单缺少签名')
  let verified = false
  try {
    verified = crypto.verify(
      null,
      catalogPayload(doc),
      crypto.createPublicKey(UPDATE_PUBLIC_KEY),
      Buffer.from(signature, 'base64'),
    )
  } catch (error) {
    throw new Error(`官方源清单签名校验失败：${error?.message || error}`)
  }
  if (!verified) throw new Error('官方源清单签名校验失败（可能被篡改或镜像投毒）')
  return catalogFields(doc)
}

async function refreshOfficialCatalog(state, config, fetchText = getText, options = {}) {
  const channel = updateChannel(config, state)
  const cachedSources = Array.isArray(state.officialCatalog?.sources) ? state.officialCatalog.sources : []
  const cachedAt = state.officialCatalog?.at ? Date.parse(state.officialCatalog.at) : 0
  const now = Date.now()
  const age = cachedAt ? now - cachedAt : -1
  if (!options.force && !state.officialCatalog?.error && cachedSources.length && age >= 0 && age < OFFICIAL_CATALOG_TTL) {
    state.officialCatalog.nextCheckAt = new Date(cachedAt + OFFICIAL_CATALOG_TTL).toISOString()
    return {
      ok: true,
      cached: true,
      skipped: true,
      version: state.officialCatalog.version || null,
      updatedAt: state.officialCatalog.updatedAt || null,
      count: cachedSources.length,
      newCount: 0,
      source: state.officialCatalog.source || null,
      lane: state.officialCatalog.lane || null,
      label: state.officialCatalog.label || null,
      nextCheckAt: new Date(cachedAt + OFFICIAL_CATALOG_TTL).toISOString(),
    }
  }

  const rows = officialCatalogSources(channel).map(source => ({
    ...source,
    target: withCacheBust(source.url),
  }))
  // Race direct GitHub and mirror lanes. A VPN usually lets the direct lane win;
  // without VPN, jsDelivr/ghproxy can win. All payloads are signature-checked.
  const tasks = rows.map(async source => {
    const text = await fetchText(source.target, 12000)
    let doc = null
    try {
      doc = JSON.parse(text)
    } catch {
      throw new Error('官方源清单不是合法 JSON')
    }
    return { ...source, fields: verifyOfficialCatalog(doc) }
  })
  let settled = await settleWithin(tasks, 3500)
  let valid = settled
    .filter(item => item && item.status === 'fulfilled')
    .map(item => item.value)
    .sort((left, right) => {
      const leftTime = Date.parse(left.fields.updatedAt) || 0
      const rightTime = Date.parse(right.fields.updatedAt) || 0
      if (leftTime !== rightTime) return rightTime - leftTime
      return String(right.fields.version).localeCompare(String(left.fields.version))
    })
  if (!valid.length) {
    settled = await Promise.allSettled(tasks)
    valid = settled.filter(item => item.status === 'fulfilled').map(item => item.value)
  }
  if (!valid.length) {
    const reasons = settled
      .filter(item => item.status === 'rejected')
      .map(item => String(item.reason?.message || item.reason || '未知错误'))
    const message = reasons.find(item => /签名|JSON|版本|缺少/.test(item)) || reasons[0] || '没有可用的官方源清单'
    state.officialCatalog = {
      ...(state.officialCatalog || {}),
      error: message,
      lastAttemptAt: new Date().toISOString(),
    }
    return { ok: false, error: message, fromCache: Boolean(cachedSources.length) }
  }

  const chosen = valid[0]
  const fields = chosen.fields
  const seen = new Set(
    state.officialSeenIds?.length ? state.officialSeenIds : sourcePool(state).map(source => source.id),
  )
  const newIds = fields.sources.map(source => source.id).filter(id => !seen.has(id))
  const fetchedAt = new Date().toISOString()
  state.officialCatalog = {
    at: fetchedAt,
    version: fields.version,
    updatedAt: fields.updatedAt,
    sources: fields.sources,
    accessLabels: fields.accessLabels,
    source: chosen.url,
    lane: chosen.lane,
    label: chosen.label,
    error: null,
    lastAttemptAt: fetchedAt,
    nextCheckAt: new Date(Date.parse(fetchedAt) + OFFICIAL_CATALOG_TTL).toISOString(),
  }
  state.officialNewIds = newIds
  state.officialSeenIds = [...new Set([...seen, ...fields.sources.map(source => source.id)])]
  return {
    ok: true,
    cached: false,
    skipped: false,
    version: fields.version,
    updatedAt: fields.updatedAt,
    count: fields.sources.length,
    newCount: newIds.length,
    source: state.officialCatalog.source,
    lane: chosen.lane,
    label: chosen.label,
    nextCheckAt: state.officialCatalog.nextCheckAt,
    fromCache: false,
  }
}

async function refreshFeeds(state) {
  const previousSources = state.feedSources || []
  const merged = new Map()
  const results = []
  const okOrigins = new Set()
  for (const feed of state.feeds) {
    try {
      const payload = await getJson(feed.url, 15000)
      const rows = Array.isArray(payload?.sources) ? payload.sources : []
      let added = 0
      for (const row of rows) {
        const source = sanitiseFeedSource(row)
        if (!source) continue
        source.origin = feed.url
        merged.set(source.id, source)
        added += 1
      }
      okOrigins.add(feed.url)
      feed.at = new Date().toISOString()
      feed.ok = true
      feed.error = null
      feed.count = added
      results.push({ url: feed.url, ok: true, count: added })
    } catch (error) {
      const message = error?.name === 'AbortError' ? '请求超时（15 秒）' : error?.message || String(error)
      feed.at = new Date().toISOString()
      feed.ok = false
      feed.error = message
      results.push({ url: feed.url, ok: false, error: message })
    }
  }
  for (const source of previousSources) {
    if (source?.origin && !okOrigins.has(source.origin) && !merged.has(source.id)) merged.set(source.id, source)
  }
  state.feedSources = [...merged.values()]
  const seen = new Set(state.feedSeenIds || [])
  state.feedNewIds = [...merged.keys()].filter(id => !seen.has(id))
  state.feedSeenIds = [...new Set([...seen, ...merged.keys()])]
  saveState(state)
  return results
}

async function refreshAll(ctx, state, force = true, config = {}, options = {}) {
  const [radar, feeds, officialCatalog] = await Promise.all([
    refreshRadar(state),
    refreshFeeds(state),
    refreshOfficialCatalog(state, config, getText, { force: options.forceCatalog === true }).catch(error => ({
      ok: false,
      error: error?.message || String(error),
    })),
  ])
  await refreshKilo(state, force)
  await refreshPollinations(state, force)
  await refreshLlm7(state, force)
  const installedRoutes = await syncInstalledSources(ctx, state)
  saveState(state)
  return {
    radar,
    feeds,
    officialCatalog,
    installedRoutes,
    kilo: { ok: !state.kilo?.error, count: state.kilo?.items?.length || 0 },
    pollinations: { ok: !state.pollinations?.error, count: state.pollinations?.items?.length || 0 },
    llm7: { ok: !state.llm7?.error, count: state.llm7?.items?.length || 0 },
  }
}

/* ------------------------------------------------------- kilo anonymous */

const KILO_BASE = 'https://ai-gateway.kilo.ai/api/v1'
const KILO_ROUTE = 'kilo-free'
const KILO_REF = 'KILO_FREE_NOAUTH'
const KILO_LISTING_HEADERS = { 'http-referer': 'https://kilo.ai/', 'x-title': 'dsh-cyber-egg' }
const KILO_PROXY_PORT = 18878
// 18878–20877: 2000 ports, so two thousand devices can each keep their own room
// without colliding. Ephemeral ranges on Windows/Linux start much higher.
const KILO_PROXY_SPAN = 2000
const KILO_PROXY_TRIES = 200
const KILO_PROXY_PATHS = new Set(['/v1/models', '/v1/chat/completions', '/v1/completions'])

/**
 * Kilo's free pool answers only when the request carries NO Authorization header,
 * while DSH's OpenAI-compatible adapter always sends one. This loopback proxy
 * forwards the wire body unchanged and drops that header, so the route stays a
 * plain openai-completions provider with full streaming and tool-call support.
 *
 * Every device is its own "local machine room": the listen port is picked at
 * random inside the configured range and remembered per install, so two phones/PCs do
 * not fight over the same number. A busy port falls through to the next one and
 * the provider route is rewritten to the port that actually bound.
 */
function kiloProxyUrl(port) {
  return `http://127.0.0.1:${port}/v1`
}

function pickProxyStartPort(preferred) {
  const value = Number(preferred)
  if (value >= KILO_PROXY_PORT && value < KILO_PROXY_PORT + KILO_PROXY_SPAN) return value
  // Keep 18878 out of the first random pick: it is the old fixed value, so every
  // upgraded install would otherwise land on the same "machine room" again.
  return KILO_PROXY_PORT + 1 + Math.floor(Math.random() * (KILO_PROXY_SPAN - 1))
}

function nextProxyPort(port) {
  const next = port + 1
  return next < KILO_PROXY_PORT + KILO_PROXY_SPAN ? next : KILO_PROXY_PORT
}

function startKiloProxy(preferredPort) {
  return new Promise(resolve => {
    let port = pickProxyStartPort(preferredPort)
    let attempt = 0
    const listen = () => {
      const server = http.createServer(async (req, res) => {
        const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname
        if (!KILO_PROXY_PATHS.has(pathname)) {
          res.writeHead(404, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: { message: 'not found' } }))
          return
        }
        const headers = {}
        for (const [key, value] of Object.entries(req.headers)) {
          const name = key.toLowerCase()
          if (name === 'host' || name === 'authorization' || name === 'content-length' || name === 'connection') continue
          if (name === 'accept-encoding') continue
          if (typeof value === 'string') headers[name] = value
        }
        headers['accept-encoding'] = 'identity'
        headers['user-agent'] = 'dsh-cyber-egg'
        Object.assign(headers, KILO_LISTING_HEADERS)
        const init = { method: req.method, headers, redirect: 'error' }
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          init.body = Readable.toWeb(req)
          init.duplex = 'half'
        }
        try {
          const upstream = await fetch(`${KILO_BASE}${pathname.replace(/^\/v1/, '')}${new URL(req.url || '/', 'http://127.0.0.1').search}`, init)
          const responseHeaders = {}
          for (const [key, value] of upstream.headers.entries()) {
            if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') continue
            responseHeaders[key] = value
          }
          res.writeHead(upstream.status, responseHeaders)
          if (!upstream.body) {
            res.end()
            return
          }
          Readable.fromWeb(upstream.body).pipe(res)
        } catch (error) {
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'application/json' })
            res.end(JSON.stringify({ error: { message: `kilo proxy failed: ${error?.message || error}` } }))
          } else {
            res.end()
          }
        }
      })
      server.once('error', error => {
        if (error?.code === 'EADDRINUSE' && attempt < KILO_PROXY_TRIES) {
          attempt += 1
          port = nextProxyPort(port)
          listen()
          return
        }
        resolve({ error })
      })
      server.listen(port, '127.0.0.1', () => resolve({ server, port }))
    }
    listen()
  })
}


function kiloPrettyName(id) {
  const stem = String(id).replace(/:free$/, '').split('/').pop() || String(id)
  return stem
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(' ')
}

async function fetchKiloFree() {
  const payload = await getJson(`${KILO_BASE}/models`, 20000, KILO_LISTING_HEADERS)
  const rows = Array.isArray(payload?.data) ? payload.data : []
  const items = rows
    .filter(row => row && row.isFree === true)
    .map(row => {
      const architecture = row.architecture || {}
      const outputs = architecture.output_modalities
      return {
        id: String(row.id || ''),
        name: String(row.name || '') || kiloPrettyName(row.id),
        vendor: String(row.id || '').split('/')[0] || 'kilo',
        context: Number(row.context_length) || 0,
        mayTrain: row.mayTrainOnYourPrompts === true,
        audioOnly: Array.isArray(outputs) && outputs.length > 0 && !outputs.includes('text'),
      }
    })
    .filter(item => item.id && !item.audioOnly)
    .sort((left, right) => (left.id === 'kilo-auto/free' ? -1 : right.id === 'kilo-auto/free' ? 1 : left.id.localeCompare(right.id)))
  return items
}

async function refreshKilo(state, force) {
  const cacheAt = state.kilo?.at ? Date.parse(state.kilo.at) : 0
  const fresh = cacheAt && Date.now() - cacheAt < 10 * 60 * 1000
  if (!force && fresh && Array.isArray(state.kilo.items) && state.kilo.items.length) {
    return { ok: true, cached: true, count: state.kilo.items.length }
  }
  try {
    const blocked = new Set(state.anonBlocked || [])
    const items = (await fetchKiloFree()).filter(item => !blocked.has(item.id))
    state.kilo = { at: new Date().toISOString(), items, error: null }
    return { ok: true, count: items.length }
  } catch (error) {
    const message = describeNetworkError(error, 20000)
    state.kilo = { ...(state.kilo || { items: [] }), at: new Date().toISOString(), error: message }
    return { ok: false, error: message }
  }
}

function kiloInstalledModels(descriptor) {
  const providers = descriptor?.value?.providers
  const profile = providers && providers[KILO_ROUTE]
  const models = Array.isArray(profile?.models) ? profile.models : []
  return models.map(model => (typeof model === 'string' ? model : model?.id)).filter(Boolean)
}

async function installKilo(ctx, state, body, proxyPort) {
  const settings = ctx.get('settings')
  if (!settings) throw new Error('settings 服务不可用')
  if (!proxyPort) throw new Error('本地转发没有启动，无法启用 Kilo 免鉴权通道')
  const descriptor = providerDescriptor(settings)
  if (!Array.isArray(state.kilo?.items) || !state.kilo.items.length) await refreshKilo(state, true)
  const available = new Map((state.kilo?.items || []).map(item => [item.id, item]))
  const existingEntries = (() => {
    const providers = descriptor.value && descriptor.value.providers
    const profile = providers && providers[KILO_ROUTE]
    const models = Array.isArray(profile?.models) ? profile.models : []
    return models.map(model => (typeof model === 'string' ? { id: model } : model)).filter(model => model && model.id)
  })()
  const requested = Array.isArray(body.models) && body.models.length
    ? body.models.map(id => String(id))
    : body.all
      ? [...available.keys()]
      : []
  if (!requested.length) throw new Error('没有选择要启用的模型')
  const merged = new Map(body.prune === true ? [] : existingEntries.map(entry => [entry.id, entry]))
  for (const id of requested) {
    if (!available.has(id)) throw new Error(`Kilo 免费池里没有这个模型：${id}`)
    const item = available.get(id)
    if (!merged.has(id)) {
      merged.set(id, {
        id: item.id,
        ...(item.name && item.name !== item.id ? { name: item.name } : {}),
        ...(item.context ? { contextWindow: item.context } : {}),
      })
    }
  }
  const models = [...merged.values()].slice(0, 40)
  const profile = {
    displayName: 'Kilo 免费池 · 赛博鸡蛋',
    api: 'openai-completions',
    baseURL: kiloProxyUrl(proxyPort),
    apiKeyEnv: KILO_REF,
    models,
    headers: { 'http-referer': 'https://kilo.ai/', 'x-title': 'dsh-cyber-egg' },
  }
  const credentials = ctx.get('credentials')
  if (credentials) await credentials.set(KILO_REF, 'kilo-free-noauth')
  await settings.mutate(descriptor.ns, [{ op: 'set', path: ['providers', KILO_ROUTE], value: profile }], descriptor.revision)
  state.kiloProxy = { ...(state.kiloProxy || {}), port: proxyPort, random: true, at: new Date().toISOString() }
  saveState(state)
  let registered = false
  try {
    registered = (ctx.get('llm')?.listProviders?.() || []).some(item => item.id === KILO_ROUTE)
  } catch {
    registered = false
  }
  return { ok: true, routeId: KILO_ROUTE, installed: models.map(model => model.id), registered }
}

async function testKilo(ctx) {
  const llm = ctx.get('llm')
  if (!llm) throw new Error('llm 服务不可用')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)
  let text = ''
  let reasoning = ''
  let failure = null
  let finish = null
  const seen = new Set()
  try {
    const stream = llm.stream({
      provider: KILO_ROUTE,
      model: 'kilo-auto/free',
      messages: [{ role: 'user', content: [{ type: 'text', text: '只回答两个字：在的' }] }],
      maxTokens: 200,
      signal: controller.signal,
    })
    for await (const chunk of stream) {
      seen.add(chunk.type)
      if (chunk.type === 'text-delta') text += chunk.text
      if (chunk.type === 'reasoning-delta') reasoning += chunk.text
      if (chunk.type === 'finish') {
        finish = chunk.reason.kind
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          failure = chunk.reason.failure?.message || chunk.reason.kind
        }
        break
      }
      if (text.length > 400) break
    }
  } catch (error) {
    failure = error?.message || String(error)
  } finally {
    clearTimeout(timer)
  }
  return {
    ok: !failure,
    text: text.slice(0, 200),
    reasoning: reasoning.slice(0, 120),
    finish,
    chunkTypes: [...seen],
    error: failure || undefined,
  }
}


/* ------------------------------------------- anonymous free (Pollinations) */

const POLLINATIONS_BASE = 'https://text.pollinations.ai'
const POLLINATIONS_ROUTE = 'pollinations-free'
const POLLINATIONS_REF = 'POLLINATIONS_FREE_NOAUTH'
const POLLINATIONS_DISPLAY = 'Pollinations 免注册 · 赛博鸡蛋'

async function fetchPollinationsFree() {
  const payload = await getJson(`${POLLINATIONS_BASE}/models`, 20000)
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
  return rows
    .filter(row => row && String(row.tier || '').toLowerCase() === 'anonymous')
    .filter(row => {
      const outputs = row.output_modalities
      return !Array.isArray(outputs) || outputs.length === 0 || outputs.includes('text')
    })
    .map(row => {
      const id = String(row.name || row.id || '')
      return {
        id,
        name: String(row.description || row.name || id),
        vendor: 'pollinations',
        context: Number(row.context_length) || 0,
        mayTrain: false,
        audioOnly: false,
        note: '每个 IP 每 45 秒 1 次',
      }
    })
    .filter(item => item.id)
}

async function refreshPollinations(state, force) {
  const cacheAt = state.pollinations?.at ? Date.parse(state.pollinations.at) : 0
  const fresh = cacheAt && Date.now() - cacheAt < 10 * 60 * 1000
  if (!force && fresh && Array.isArray(state.pollinations.items) && state.pollinations.items.length) {
    return { ok: true, cached: true, count: state.pollinations.items.length }
  }
  try {
    const blocked = new Set(state.anonBlocked || [])
    const items = (await fetchPollinationsFree()).filter(item => !blocked.has(item.id))
    state.pollinations = { at: new Date().toISOString(), items, error: null }
    return { ok: true, count: items.length }
  } catch (error) {
    const message = describeNetworkError(error, 20000)
    state.pollinations = { ...(state.pollinations || { items: [] }), at: new Date().toISOString(), error: message }
    return { ok: false, error: message }
  }
}

function anonInstalledModels(descriptor, routeId) {
  const providers = descriptor?.value?.providers
  const profile = providers && providers[routeId]
  const models = Array.isArray(profile?.models) ? profile.models : []
  return models.map(model => (typeof model === 'string' ? model : model?.id)).filter(Boolean)
}

async function installPollinations(ctx, state, body) {
  const settings = ctx.get('settings')
  if (!settings) throw new Error('settings 服务不可用')
  const descriptor = providerDescriptor(settings)
  if (!Array.isArray(state.pollinations?.items) || !state.pollinations.items.length) await refreshPollinations(state, true)
  const blocked = new Set(state.anonBlocked || [])
  const available = new Map((state.pollinations?.items || []).filter(item => !blocked.has(item.id)).map(item => [item.id, item]))
  const providers = descriptor.value && descriptor.value.providers
  const profile = providers && providers[POLLINATIONS_ROUTE]
  const existingEntries = (Array.isArray(profile?.models) ? profile.models : [])
    .map(model => (typeof model === 'string' ? { id: model } : model))
    .filter(model => model && model.id)
  const requested = Array.isArray(body.models) && body.models.length
    ? body.models.map(id => String(id))
    : body.all
      ? [...available.keys()]
      : []
  if (!requested.length) throw new Error('没有选择要启用的模型')
  const merged = new Map(body.prune === true ? [] : existingEntries.map(entry => [entry.id, entry]))
  for (const id of requested) {
    if (!available.has(id)) throw new Error(`Pollinations 免费池里没有这个模型：${id}`)
    const item = available.get(id)
    if (!merged.has(id)) merged.set(id, { id: item.id, ...(item.name && item.name !== item.id ? { name: item.name } : {}) })
  }
  const value = {
    displayName: POLLINATIONS_DISPLAY,
    api: 'openai-completions',
    baseURL: `${POLLINATIONS_BASE}/openai`,
    apiKeyEnv: POLLINATIONS_REF,
    models: [...merged.values()].slice(0, 12),
  }
  const credentials = ctx.get('credentials')
  if (credentials) await credentials.set(POLLINATIONS_REF, 'pollinations-free-noauth')
  await settings.mutate(descriptor.ns, [{ op: 'set', path: ['providers', POLLINATIONS_ROUTE], value }], descriptor.revision)
  saveState(state)
  let registered = false
  try {
    registered = (ctx.get('llm')?.listProviders?.() || []).some(item => item.id === POLLINATIONS_ROUTE)
  } catch {
    registered = false
  }
  return { ok: true, routeId: POLLINATIONS_ROUTE, installed: value.models.map(model => model.id), registered }
}

/* ----------------------------------------------- anonymous free (LLM7 pool) */

const LLM7_BASE = 'https://api.llm7.io/v1'
const LLM7_ROUTE = 'llm7-free'
const LLM7_REF = 'LLM7_FREE_NOAUTH'
const LLM7_DISPLAY = 'LLM7 免注册 · 赛博鸡蛋'

async function fetchLlm7Free() {
  const payload = await getJson(`${LLM7_BASE}/models`, 20000)
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  return rows
    .filter(row => row && String(row.tier || '').toLowerCase() !== 'pro')
    .filter(row => !row.model_type || String(row.model_type).toLowerCase() === 'chat')
    .map(row => {
      const id = String(row.id || '')
      return {
        id,
        name: id,
        vendor: 'llm7',
        context: 0,
        mayTrain: false,
        audioOnly: false,
        note: '免费额度很少',
      }
    })
    .filter(item => item.id)
}

async function refreshLlm7(state, force) {
  const cacheAt = state.llm7?.at ? Date.parse(state.llm7.at) : 0
  const fresh = cacheAt && Date.now() - cacheAt < 10 * 60 * 1000
  if (!force && fresh && Array.isArray(state.llm7.items) && state.llm7.items.length) {
    return { ok: true, cached: true, count: state.llm7.items.length }
  }
  try {
    const blocked = new Set(state.anonBlocked || [])
    const items = (await fetchLlm7Free()).filter(item => !blocked.has(item.id))
    state.llm7 = { at: new Date().toISOString(), items, error: null }
    return { ok: true, count: items.length }
  } catch (error) {
    const message = describeNetworkError(error, 20000)
    state.llm7 = { ...(state.llm7 || { items: [] }), at: new Date().toISOString(), error: message }
    return { ok: false, error: message }
  }
}

async function installLlm7(ctx, state, body) {
  const settings = ctx.get('settings')
  if (!settings) throw new Error('settings 服务不可用')
  const descriptor = providerDescriptor(settings)
  if (!Array.isArray(state.llm7?.items) || !state.llm7.items.length) await refreshLlm7(state, true)
  const blocked = new Set(state.anonBlocked || [])
  const available = new Map((state.llm7?.items || []).filter(item => !blocked.has(item.id)).map(item => [item.id, item]))
  const providers = descriptor.value && descriptor.value.providers
  const profile = providers && providers[LLM7_ROUTE]
  const existingEntries = (Array.isArray(profile?.models) ? profile.models : [])
    .map(model => (typeof model === 'string' ? { id: model } : model))
    .filter(model => model && model.id)
  const requested = Array.isArray(body.models) && body.models.length
    ? body.models.map(id => String(id))
    : body.all
      ? [...available.keys()]
      : []
  if (!requested.length) throw new Error('没有选择要启用的模型')
  const merged = new Map(body.prune === true ? [] : existingEntries.map(entry => [entry.id, entry]))
  for (const id of requested) {
    if (!available.has(id)) throw new Error(`LLM7 免费池里没有这个模型：${id}`)
    const item = available.get(id)
    if (!merged.has(id)) merged.set(id, { id: item.id, ...(item.name && item.name !== item.id ? { name: item.name } : {}) })
  }
  const value = {
    displayName: LLM7_DISPLAY,
    api: 'openai-completions',
    baseURL: LLM7_BASE,
    apiKeyEnv: LLM7_REF,
    models: [...merged.values()].slice(0, 12),
  }
  const credentials = ctx.get('credentials')
  if (credentials) await credentials.set(LLM7_REF, 'llm7-free-noauth')
  await settings.mutate(descriptor.ns, [{ op: 'set', path: ['providers', LLM7_ROUTE], value }], descriptor.revision)
  saveState(state)
  let registered = false
  try {
    registered = (ctx.get('llm')?.listProviders?.() || []).some(item => item.id === LLM7_ROUTE)
  } catch {
    registered = false
  }
  return { ok: true, routeId: LLM7_ROUTE, installed: value.models.map(model => model.id), registered }
}

/* ------------------------------------------------------- anonymous health */

const ANON_ROUTES = {
  [KILO_ROUTE]: {
    label: 'Kilo 免费池',
    url: `${KILO_BASE}/chat/completions`,
    headers: KILO_LISTING_HEADERS,
    timeoutMs: 90000,
  },
  [POLLINATIONS_ROUTE]: {
    label: 'Pollinations',
    url: `${POLLINATIONS_BASE}/openai/chat/completions`,
    headers: {},
    timeoutMs: 60000,
  },
  [LLM7_ROUTE]: {
    label: 'LLM7',
    url: `${LLM7_BASE}/chat/completions`,
    headers: {},
    timeoutMs: 60000,
  },
}

const RATE_LIMIT_HINT = /sign up for free|rate.?limit|too many requests|free limit|come back later|quota/i

async function probeAnonModel(routeId, modelId) {
  const route = ANON_ROUTES[routeId]
  if (!route) return { route: routeId, id: modelId, ok: false, error: '未知的匿名路由' }
  let last = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    last = await probeAnonOnce(routeId, route, modelId)
    if (last.ok || last.rateLimited) return last
    // Only retry genuine transport failures: a throttled model is kept anyway,
    // so retrying it would just make a full-pool scan slow.
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 3000))
  }
  return last
}

async function probeAnonOnce(routeId, route, modelId) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), route.timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(route.url, {
      method: 'POST',
      headers: { ...route.headers, 'content-type': 'application/json', 'user-agent': 'dsh-cyber-egg' },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 1400,
        stream: false,
      }),
    })
    const text = await res.text()
    let payload = {}
    try {
      payload = JSON.parse(text)
    } catch {
      payload = {}
    }
    const choice = payload?.choices?.[0]
    const content = String(choice?.message?.content ?? '').trim()
    const reasoning = String(choice?.message?.reasoning_content ?? choice?.message?.reasoning ?? '').trim()
    const upstream = String(payload?.error?.message ?? '').replace(/\s+/g, ' ')
    const ok = res.ok && Boolean(content || reasoning)
    const rateLimited = !ok && (res.status === 429 || res.status === 402 || RATE_LIMIT_HINT.test(upstream))
    return {
      route: routeId,
      id: modelId,
      ok,
      rateLimited,
      status: res.status,
      ms: Date.now() - started,
      reply: content.slice(0, 40) || (reasoning ? '（只出思维链）' : ''),
      finish: choice?.finish_reason ?? null,
      error: ok
        ? undefined
        : String(upstream || `HTTP ${res.status}${choice?.finish_reason ? ` · finish=${choice.finish_reason}` : ''}`).slice(0, 160),
    }
  } catch (error) {
    return {
      route: routeId,
      id: modelId,
      ok: false,
      rateLimited: false,
      status: 0,
      ms: Date.now() - started,
      error: error?.name === 'AbortError' ? `超时（${Math.round(route.timeoutMs / 1000)} 秒）` : String(error?.message || error),
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Send "你好" to every enabled anonymous model and (by default) drop the ones that
 * cannot answer. Probes run one at a time: the free pools throttle concurrent
 * requests, and a 429/402/quota answer means "slow down", not "dead model" — those
 * stay enabled and only hard failures (timeouts, missing models, repeated empty
 * replies) are removed and remembered in `state.anonBlocked`.
 */
async function healthCheckAnon(ctx, state, options) {
  const prune = options?.prune !== false
  const scope = options?.scope === 'pool' ? 'pool' : 'installed'
  const settings = ctx.get('settings')
  if (!settings) throw new Error('settings 服务不可用')
  const descriptor = providerDescriptor(settings)
  const targets = []
  const seen = new Set()
  const add = (routeId, id) => {
    if (!id) return
    const key = `${routeId}:${id}`
    if (seen.has(key)) return
    seen.add(key)
    targets.push({ routeId, id })
  }
  for (const routeId of Object.keys(ANON_ROUTES)) {
    for (const id of anonInstalledModels(descriptor, routeId)) add(routeId, id)
  }
  if (scope === 'pool') {
    for (const [routeId, items] of [
      [KILO_ROUTE, state.kilo?.items],
      [POLLINATIONS_ROUTE, state.pollinations?.items],
      [LLM7_ROUTE, state.llm7?.items],
    ]) {
      for (const item of items || []) add(routeId, item.id)
    }
  }
  if (!targets.length) {
    return { ok: true, scope, checked: 0, kept: [], failed: [], removed: 0, rateLimited: 0, note: '还没有启用任何匿名免费模型' }
  }
  const results = []
  for (const target of targets) {
    results.push(await probeAnonModel(target.routeId, target.id))
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  results.sort((left, right) => `${left.route}:${left.id}`.localeCompare(`${right.route}:${right.id}`))
  const rateLimited = results.filter(item => !item.ok && item.rateLimited)
  const failed = results.filter(item => !item.ok && !item.rateLimited)
  let removed = 0
  if (prune && failed.length) {
    const drop = new Set(failed.map(item => item.id))
    const providers = descriptor.value?.providers || {}
    const ops = []
    for (const routeId of Object.keys(ANON_ROUTES)) {
      const profile = providers[routeId]
      if (!profile) continue
      const previous = Array.isArray(profile.models) ? profile.models : []
      const models = previous.filter(model => !drop.has(typeof model === 'string' ? model : model?.id))
      if (models.length === previous.length) continue
      ops.push({ op: 'set', path: ['providers', routeId], value: { ...profile, models } })
    }
    if (ops.length) await settings.mutate(descriptor.ns, ops, descriptor.revision)
    state.anonBlocked = [...new Set([...(state.anonBlocked || []), ...drop])]
    if (Array.isArray(state.kilo?.items)) state.kilo.items = state.kilo.items.filter(item => !drop.has(item.id))
    if (Array.isArray(state.pollinations?.items)) {
      state.pollinations.items = state.pollinations.items.filter(item => !drop.has(item.id))
    }
    if (Array.isArray(state.llm7?.items)) state.llm7.items = state.llm7.items.filter(item => !drop.has(item.id))
    removed = failed.length
  }
  state.anonHealth = {
    at: new Date().toISOString(),
    scope,
    checked: results.length,
    kept: results.filter(item => item.ok).length,
    rateLimited: rateLimited.length,
    removed,
  }
  saveState(state)
  return {
    ok: true,
    scope,
    checked: results.length,
    kept: results.filter(item => item.ok).map(item => item.id),
    failed: failed.map(item => ({ route: item.route, id: item.id, error: item.error })),
    rateLimited: rateLimited.map(item => ({ route: item.route, id: item.id, error: item.error })),
    results,
    removed,
    prune,
  }
}



function officialSources(state) {
  const remote = state.officialCatalog?.sources
  return Array.isArray(remote) && remote.length ? remote : catalog
}

function sourcePool(state) {
  const official = officialSources(state)
  const ids = new Set(official.map(source => source.id))
  return [...official, ...(state.feedSources || []).filter(source => !ids.has(source.id))]
}

function findSource(state, id) {
  return sourcePool(state).find(source => source.id === id) || null
}


function providerDescriptor(settings) {
  let list = []
  try {
    list = settings.describe({ redactSecrets: true })
  } catch (error) {
    throw new Error(`读取设置失败：${error?.message || error}`)
  }
  if (!Array.isArray(list)) throw new Error('设置服务返回异常')
  const withProviders = list.filter(entry => {
    const value = entry?.value
    if (value && typeof value === 'object' && value.providers && typeof value.providers === 'object') return true
    const props = entry?.schema?.properties
    if (props && props.providers) return true
    const anyOf = entry?.schema?.anyOf?.[0]?.properties
    return !!(anyOf && anyOf.providers)
  })
  const match = withProviders.find(entry => String(entry.ns).toLowerCase().includes('pi-ai')) || withProviders[0]
  if (!match) throw new Error('没有找到可写的模型 Provider 配置（llm-pi-ai 插件未启用）')
  return match
}

function pickModels(discovered, limit = 40) {
  const blocked = /embed|whisper|tts|speech|rerank|moderation|image|stable-diffusion|dall|flux|audio|vision-only/i
  const seen = new Set()
  const out = []
  for (const model of discovered) {
    const id = String(model?.id || '').trim()
    if (!id || seen.has(id) || blocked.test(id)) continue
    const modalities = model.inputModalities
    if (Array.isArray(modalities) && modalities.length && !modalities.includes('text')) continue
    seen.add(id)
    const entry = { id }
    if (model.name && model.name !== id) entry.name = String(model.name)
    if (Number.isFinite(model.contextWindow) && model.contextWindow > 0) entry.contextWindow = model.contextWindow
    if (Number.isFinite(model.maxTokens) && model.maxTokens > 0) entry.maxTokens = model.maxTokens
    out.push(entry)
    if (out.length >= limit) break
  }
  return out
}

async function discover(ctx, source, apiKey, manualModels) {
  const settings = ctx.get('settings')
  const llm = ctx.get('llm')
  if (!settings) throw new Error('settings 服务不可用')
  if (!llm) throw new Error('llm 服务不可用')
  const descriptor = providerDescriptor(settings)
  let discovered = []
  let discoveryError = null
  try {
    discovered = await llm.discoverModels(descriptor.ns, {
      baseURL: source.baseURL,
      api: source.api,
      apiKey,
    })
  } catch (error) {
    discoveryError = error?.message || String(error)
  }
  let models = pickModels(discovered)
  if (!models.length && manualModels?.length) {
    models = manualModels
      .map(id => String(id).trim())
      .filter(Boolean)
      .slice(0, 40)
      .map(id => ({ id }))
  }
  return { descriptor, models, discoveryError, discoveredCount: discovered.length }
}

function profileFor(source, routeId, models) {
  const ref = ROUTE_REF(routeId)
  return {
    displayName: `${source.name} · 赛博鸡蛋`,
    api: source.api,
    baseURL: source.baseURL,
    apiKeyEnv: ref,
    models,
  }
}

async function installSource(ctx, state, body) {
  const source = findSource(state, body.sourceId)
  if (!source) throw new Error('未知的鸡蛋来源')
  const apiKey = String(body.apiKey || '').trim()
  if (!apiKey) throw new Error('需要先填 API Key')
  const routeId = `egg-${source.id}`
  const manual = Array.isArray(body.models)
    ? body.models
    : String(body.models || '')
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean)
  const { descriptor, models, discoveryError, discoveredCount } = await discover(ctx, source, apiKey, manual)
  if (!models.length) {
    throw new Error(
      `没能从 ${source.baseURL} 取到模型列表${discoveryError ? `（${discoveryError}）` : ''}。请手动填写至少一个模型 ID。`,
    )
  }
  const credentials = ctx.get('credentials')
  const settings = ctx.get('settings')
  if (!credentials) throw new Error('credentials 服务不可用')
  const ref = ROUTE_REF(routeId)
  await credentials.set(ref, apiKey)
  try {
    await settings.mutate(
      descriptor.ns,
      [{ op: 'set', path: ['providers', routeId], value: profileFor(source, routeId, models) }],
      descriptor.revision,
    )
  } catch (error) {
    await credentials.unset(ref).catch(() => {})
    throw new Error(`写入模型配置失败：${error?.message || error}`)
  }
  state.installed[source.id] = {
    name: source.name,
    routeId,
    baseURL: source.baseURL,
    api: source.api,
    models: models.map(model => model.id),
    at: new Date().toISOString(),
    syncedAt: null,
    syncError: null,
  }
  saveState(state)
  let registered = false
  try {
    registered = (ctx.get('llm')?.listProviders?.() || []).some(item => item.id === routeId)
  } catch {
    registered = false
  }
  return {
    ok: true,
    routeId,
    modelCount: models.length,
    models: models.slice(0, 6),
    discoveredCount,
    registered,
    discoveryError: discoveryError || undefined,
  }
}

async function uninstallSource(ctx, state, body) {
  const sourceId = String(body.sourceId || '')
  const record = state.installed[sourceId]
  if (!record) throw new Error('这个来源还没有安装')
  const settings = ctx.get('settings')
  const credentials = ctx.get('credentials')
  if (!settings) throw new Error('settings 服务不可用')
  const descriptor = providerDescriptor(settings)
  await settings.mutate(descriptor.ns, [{ op: 'unset', path: ['providers', record.routeId] }], descriptor.revision)
  if (credentials) await credentials.unset(ROUTE_REF(record.routeId)).catch(() => {})
  delete state.installed[sourceId]
  saveState(state)
  return { ok: true }
}

/* ---------------------------------------------- installed route refresh */

/**
 * Re-discover models for every installed egg route. A successful upstream model
 * list replaces the route model array, so delisted models disappear; a failed
 * discovery keeps the last known-good route untouched.
 */
async function syncInstalledSources(ctx, state) {
  const entries = Object.entries(state.installed || {})
  const summary = { checked: entries.length, updated: 0, unchanged: 0, removedModels: 0, failed: [] }
  if (!entries.length) return summary

  const settings = ctx.get('settings')
  const llm = ctx.get('llm')
  const credentials = ctx.get('credentials')
  if (!settings || !llm) {
    const error = !settings ? 'settings 服务不可用' : 'llm 服务不可用'
    for (const [sourceId, record] of entries) {
      record.syncError = error
      summary.failed.push({ sourceId, error })
    }
    return summary
  }

  let descriptor
  try {
    descriptor = providerDescriptor(settings)
  } catch (error) {
    const message = error?.message || String(error)
    for (const [sourceId, record] of entries) {
      record.syncError = message
      summary.failed.push({ sourceId, error: message })
    }
    return summary
  }

  const sources = sourcePool(state)
  const providers = descriptor.value?.providers || {}
  const pendingChanges = []
  const cleanRecords = []

  for (const [sourceId, record] of entries) {
    const source = sources.find(item => item.id === sourceId) || null
    const routeId = String(record.routeId || `egg-${sourceId}`)
    const baseURL = source?.baseURL || record.baseURL
    const api = source?.api || record.api || 'openai-completions'
    const sourceName = source?.name || record.name || routeId
    const existing = providers[routeId] || {}
    const credentialRef = existing.apiKeyEnv || ROUTE_REF(routeId)
    if (!baseURL) {
      record.syncError = '来源没有可用的 baseURL'
      summary.failed.push({ sourceId, error: record.syncError })
      continue
    }

    let apiKey = ''
    try {
      const resolved = credentials ? await credentials.resolve(credentialRef) : null
      apiKey = String(resolved?.value ?? resolved ?? '').trim()
    } catch (error) {
      record.syncError = `读取 API Key 失败：${error?.message || error}`
      summary.failed.push({ sourceId, error: record.syncError })
      continue
    }
    if (!apiKey) {
      record.syncError = 'API Key 不在凭据库里，已保留旧模型列表'
      summary.failed.push({ sourceId, error: record.syncError })
      continue
    }

    let discovered = []
    try {
      discovered = await llm.discoverModels(descriptor.ns, { baseURL, api, apiKey })
    } catch (error) {
      record.syncError = `模型列表刷新失败（保留旧列表）：${error?.message || error}`
      summary.failed.push({ sourceId, error: record.syncError })
      continue
    }
    const models = pickModels(discovered)
    if (!models.length) {
      record.syncError = '上游没有返回可用模型，已保留旧列表'
      summary.failed.push({ sourceId, error: record.syncError })
      continue
    }

    const nextIds = models.map(model => model.id)
    const previousModels = Array.isArray(existing.models)
      ? existing.models.map(model => (typeof model === 'string' ? model : model?.id)).filter(Boolean)
      : Array.isArray(record.models)
        ? record.models
        : []
    const displayName = existing.displayName || `${sourceName} · 赛博鸡蛋`
    const nextProfile = {
      ...existing,
      displayName,
      api,
      baseURL,
      apiKeyEnv: existing.apiKeyEnv || credentialRef,
      models,
    }
    const changed =
      JSON.stringify(previousModels) !== JSON.stringify(nextIds) ||
      existing.api !== api ||
      existing.baseURL !== baseURL ||
      existing.displayName !== displayName
    const nextRecord = {
      ...record,
      name: sourceName,
      routeId,
      baseURL,
      api,
      models: nextIds,
      syncedAt: new Date().toISOString(),
      syncError: null,
    }
    if (changed) {
      pendingChanges.push({
        sourceId,
        record: nextRecord,
        op: { op: 'set', path: ['providers', routeId], value: nextProfile },
        removed: previousModels.filter(id => !nextIds.includes(id)).length,
      })
    } else {
      cleanRecords.push({ sourceId, record: nextRecord })
    }
  }

  if (pendingChanges.length) {
    try {
      await settings.mutate(descriptor.ns, pendingChanges.map(item => item.op), descriptor.revision)
      for (const item of pendingChanges) {
        state.installed[item.sourceId] = item.record
        summary.updated += 1
        summary.removedModels += item.removed
      }
    } catch (error) {
      const message = `写入模型配置失败（保留旧路由）：${error?.message || error}`
      for (const item of pendingChanges) {
        state.installed[item.sourceId].syncError = message
        summary.failed.push({ sourceId: item.sourceId, error: message })
      }
    }
  }
  for (const item of cleanRecords) {
    state.installed[item.sourceId] = item.record
    summary.unchanged += 1
  }
  return summary
}

/* ----------------------------------------------------------------- relays */

function normaliseRelay(input, existing) {
  const id = existing?.id || String(input.id || '') || `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
  const relay = {
    id,
    name: String(input.name || existing?.name || '').trim() || '我的中转站',
    baseURL: cleanBase(input.baseURL || existing?.baseURL),
    protocol: relayProtocols.some(item => item.id === input.protocol) ? input.protocol : existing?.protocol || 'newapi',
    method: String(input.method || existing?.method || 'POST').toUpperCase(),
    requestPath: String(input.requestPath ?? existing?.requestPath ?? '/api/user/checkin').trim(),
    headers: String(input.headers ?? existing?.headers ?? '').trim(),
    body: String(input.body ?? existing?.body ?? '').trim(),
    successKeyword: String(input.successKeyword ?? existing?.successKeyword ?? '').trim(),
    userId: String(input.userId ?? existing?.userId ?? '').trim(),
    enabled: input.enabled === undefined ? existing?.enabled !== false : Boolean(input.enabled),
    tokenRef: existing?.tokenRef || RELAY_REF(id),
    last: existing?.last || null,
  }
  return relay
}

function claimRequest(relay) {
  const base = relay.baseURL.replace(/\/+$/, '')
  const custom = relay.protocol === 'custom'
  const rawPath = custom ? relay.requestPath : '/api/user/checkin'
  const url = /^https?:\/\//i.test(rawPath) ? rawPath : `${base}${rawPath.startsWith('/') ? '' : '/'}${rawPath}`
  const headers = {}
  if (!custom) headers['content-type'] = 'application/json'
  if (custom && relay.headers) {
    const extra = parseHeaders(relay.headers)
    Object.assign(headers, extra)
  }
  const method = custom ? relay.method || 'POST' : 'POST'
  const body = method === 'GET' || method === 'HEAD' ? undefined : custom ? relay.body || undefined : '{}'
  return { url, method, headers, body }
}

function parseHeaders(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return {}
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed)
    const out = {}
    for (const [key, value] of Object.entries(parsed)) out[key] = String(value)
    return out
  }
  const out = {}
  for (const line of trimmed.split(/\r?\n/)) {
    const at = line.indexOf(':')
    if (at <= 0) continue
    out[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return out
}

function readQuota(payload) {
  const data = payload?.data ?? payload
  if (!data || typeof data !== 'object') return ''
  const quota = Number(data.quota ?? data.balance ?? data.remain_quota)
  if (!Number.isFinite(quota)) return ''
  return String(quota)
}

async function checkIn(ctx, relay, { manual = false } = {}) {
  const credentials = ctx.get('credentials')
  if (!credentials) return { ok: false, message: 'credentials 服务不可用' }
  let token = ''
  try {
    const resolved = await credentials.resolve(relay.tokenRef)
    token = resolved?.value || ''
  } catch (error) {
    return { ok: false, message: `读取口令失败：${error?.message || error}` }
  }
  if (!token) return { ok: false, message: '口令没有保存，请重新填写' }
  const { url, method, headers, body } = claimRequest(relay)
  const auth = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  const finalHeaders = { accept: 'application/json', ...headers, authorization: auth }
  if (relay.userId) finalHeaders['new-api-user'] = relay.userId
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body,
      signal: controller.signal,
      redirect: 'follow',
    })
    const text = await response.text()
    let payload = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
    const message = String(payload?.message ?? payload?.msg ?? payload?.data?.message ?? text.slice(0, 200) ?? '').trim()
    const keyword = relay.successKeyword
    let ok = response.ok
    if (keyword) ok = text.includes(keyword)
    else if (payload && typeof payload === 'object' && payload.success === false) ok = false
    else if (/已签到|已经签到|重复签到/.test(message)) ok = true
    const quota = readQuota(payload)
    return {
      ok,
      status: response.status,
      message: message || (ok ? '领取成功' : '接口返回失败'),
      quota: quota || undefined,
      manual,
    }
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return { ok: false, message: aborted ? '请求超时（20 秒）' : `请求失败：${error?.message || error}` }
  } finally {
    clearTimeout(timer)
  }
}

async function detectRelay(ctx, body, state) {
  let token = String(body.token || '').trim()
  let baseURL = body.baseURL
  let userId = body.userId
  if (!token && body.id && state) {
    const relay = state.relays.find(item => item.id === String(body.id))
    if (relay) {
      baseURL = baseURL || relay.baseURL
      userId = userId || relay.userId
      const resolved = await ctx.get('credentials')?.resolve(relay.tokenRef)
      token = resolved?.value || ''
    }
  }
  if (!baseURL) throw new Error('需要先填站点地址')
  baseURL = cleanBase(baseURL)
  if (!token) throw new Error('需要先填口令')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  const auth = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  const headers = { accept: 'application/json', authorization: auth }
  if (userId) headers['new-api-user'] = String(userId)
  try {
    const response = await fetch(`${baseURL}/api/user/self`, { headers, signal: controller.signal })
    const text = await response.text()
    let payload = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
    if (!response.ok) return { ok: false, message: `站点返回 ${response.status}`, status: response.status }
    if (payload && payload.success === false) {
      return { ok: false, message: String(payload.message || '口令被拒绝'), status: response.status }
    }
    const data = payload?.data ?? payload
    return {
      ok: true,
      status: response.status,
      username: data?.username || data?.display_name || data?.email || '',
      quota: readQuota(payload) || undefined,
    }
  } catch (error) {
    return { ok: false, message: error?.name === 'AbortError' ? '连接超时' : `连接失败：${error?.message || error}` }
  } finally {
    clearTimeout(timer)
  }
}

async function claimAll(ctx, state, { onlyId, reason } = {}) {
  return withClaimLock(() => claimAllUnsafe(ctx, state, { onlyId, reason }))
}

async function claimAllUnsafe(ctx, state, { onlyId, reason } = {}) {
  const relays = state.relays.filter(relay => (onlyId ? relay.id === onlyId : relay.enabled))
  const results = []
  const now = Date.now()
  for (const relay of relays) {
    if (!relay.enabled && onlyId) {
      results.push({ id: relay.id, name: relay.name, ok: false, message: '该中转站已暂停' })
      continue
    }
    const lastAt = relay.last?.at ? Date.parse(relay.last.at) : 0
    if (onlyId !== undefined && lastAt && now - lastAt < 60_000) {
      results.push({ id: relay.id, name: relay.name, ok: Boolean(relay.last.ok), message: '刚刚领取过，稍后再试', skipped: true })
      continue
    }
    const outcome = await checkIn(ctx, relay, { manual: Boolean(onlyId) })
    const stamp = new Date().toISOString()
    relay.last = { at: stamp, ok: outcome.ok, message: outcome.message }
    state.history.unshift({
      at: stamp,
      relayId: relay.id,
      name: relay.name,
      ok: outcome.ok,
      message: outcome.message,
      reason: reason || (onlyId ? 'manual' : 'scheduled'),
    })
    if (outcome.ok) state.today[relay.id] = dayKey()
    results.push({ id: relay.id, name: relay.name, ...outcome })
  }
  state.history = state.history.slice(0, 120)
  state.lastRun = new Date().toISOString()
  saveState(state)
  return results
}

/* -------------------------------------------------------------- scheduler */

function nextRunAt(claims, from = new Date()) {
  const next = new Date(from)
  next.setSeconds(0, 0)
  next.setHours(claims.hour, claims.minute, 0, 0)
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1)
  return next
}

function startScheduler(ctx, state, runDue) {
  let timer = null
  let startup = null
  let disposed = false
  let running = false

  const clear = () => {
    if (timer) clearTimeout(timer)
    if (startup) clearTimeout(startup)
    timer = null
    startup = null
  }

  const run = async reason => {
    if (disposed || running) return
    if (!state.relays.some(relay => relay.enabled)) return
    running = true
    try {
      await runDue(reason)
    } catch (error) {
      console.error(`[${NAME}] scheduled claim failed`, error)
    } finally {
      running = false
    }
  }

  const arm = () => {
    if (disposed) return
    const delay = Math.max(1000, nextRunAt(state.claims).getTime() - Date.now())
    timer = setTimeout(async () => {
      if (disposed) return
      await run('scheduled')
      arm()
    }, delay)
    timer.unref?.()
  }

  const armCatchUp = () => {
    startup = setTimeout(async () => {
      if (disposed) return
      const now = new Date()
      const todaysTarget = new Date(now)
      todaysTarget.setHours(state.claims.hour, state.claims.minute, 0, 0)
      if (todaysTarget.getTime() > now.getTime()) return
      const pending = state.relays.filter(relay => relay.enabled && state.today[relay.id] !== dayKey(now))
      if (!pending.length) return
      await run('catch-up')
    }, 5000)
    startup.unref?.()
  }

  const reschedule = () => {
    clear()
    if (!state.claims.enabled) return
    arm()
    if (state.claims.catchUp) armCatchUp()
  }

  reschedule()

  return {
    reschedule,
    dispose() {
      disposed = true
      clear()
    },
  }
}

/* ---------------------------------------------------------------- payload */

function snapshot(ctx, state) {
  const installed = state.installed || {}
  const decorate = source => ({
    ...source,
    installed: Boolean(installed[source.id]),
    routeId: installed[source.id]?.routeId || null,
    modelCount: installed[source.id]?.models?.length || 0,
    fresh:
      (state.officialNewIds || []).includes(source.id) || (state.feedNewIds || []).includes(source.id),
  })
  const descriptor = (() => {
    try {
      const settings = ctx.get('settings')
      return settings ? providerDescriptor(settings) : null
    } catch {
      return null
    }
  })()
  const installedFor = routeId => (descriptor ? anonInstalledModels(descriptor, routeId) : [])
  const kiloItems = state.kilo?.items || []
  const kiloInstalled = installedFor(KILO_ROUTE)
  const pollinationsItems = state.pollinations?.items || []
  const pollinationsInstalled = installedFor(POLLINATIONS_ROUTE)
  const llm7Items = state.llm7?.items || []
  const llm7Installed = installedFor(LLM7_ROUTE)
  return {
    ok: true,
    build: PLUGIN_VERSION,
    sources: sourcePool(state).map(decorate),
    accessLabels: { ...accessLabels, ...(state.officialCatalog?.accessLabels || {}) },
    officialCatalog: {
      at: state.officialCatalog?.at || null,
      version: state.officialCatalog?.version || null,
      updatedAt: state.officialCatalog?.updatedAt || null,
      source: state.officialCatalog?.source || null,
      lane: state.officialCatalog?.lane || null,
      label: state.officialCatalog?.label || null,
      nextCheckAt: state.officialCatalog?.nextCheckAt || null,
      ttlDays: 3,
      error: state.officialCatalog?.error || null,
      count: officialSources(state).length,
      cached: Boolean(state.officialCatalog?.sources?.length),
    },
    radar: state.radar || null,
    kilo: {
      at: state.kilo?.at || null,
      error: state.kilo?.error || null,
      items: kiloItems,
      installed: kiloInstalled,
      stale: kiloInstalled.filter(id => !kiloItems.some(item => item.id === id)),
    },
    pollinations: {
      at: state.pollinations?.at || null,
      error: state.pollinations?.error || null,
      items: pollinationsItems,
      installed: pollinationsInstalled,
      stale: pollinationsInstalled.filter(id => !pollinationsItems.some(item => item.id === id)),
    },
    llm7: {
      at: state.llm7?.at || null,
      error: state.llm7?.error || null,
      items: llm7Items,
      installed: llm7Installed,
      stale: llm7Installed.filter(id => !llm7Items.some(item => item.id === id)),
    },
    anon: {
      blocked: state.anonBlocked || [],
      health: state.anonHealth || null,
    },
    proxy: { port: state.kiloProxy?.port || null, healError: state.kiloProxy?.healError || null },
    feeds: state.feeds || [],
    protocols: relayProtocols,
    relays: state.relays.map(relay => ({
      id: relay.id,
      name: relay.name,
      baseURL: relay.baseURL,
      protocol: relay.protocol,
      method: relay.method,
      requestPath: relay.requestPath,
      headers: relay.headers,
      body: relay.body,
      successKeyword: relay.successKeyword,
      userId: relay.userId,
      enabled: relay.enabled,
      hasToken: Boolean(relay.tokenRef),
      checkedToday: state.today[relay.id] === dayKey(),
      last: relay.last,
    })),
    claims: state.claims,
    history: state.history.slice(0, 40),
    lastRun: state.lastRun,
    today: dayKey(),
  }
}

/* ----------------------------------------------------------- self-update */

const UPDATE_DEFAULT = { owner: 'WOchovy233', repo: 'dsh-cyber-egg', branch: 'main' }

function updateChannel(config, state) {
  return { ...UPDATE_DEFAULT, ...(state.update || {}), ...(config?.update || {}) }
}

function sourceLane(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'github.com' || host === 'raw.githubusercontent.com' ? 'direct' : 'mirror'
  } catch {
    return 'mirror'
  }
}

function updateSources(channel) {
  const base = `${channel.owner}/${channel.repo}`
  const raw = `https://raw.githubusercontent.com/${base}/${channel.branch}/update.json`
  const rows = [
    { url: `https://github.com/${base}/releases/latest/download/update.json`, label: 'GitHub Release', lane: 'direct' },
    { url: raw, label: 'GitHub raw', lane: 'direct' },
    { url: `https://github.com/${base}/raw/${channel.branch}/update.json`, label: 'GitHub raw', lane: 'direct' },
    { url: `https://cdn.jsdelivr.net/gh/${base}@${channel.branch}/update.json`, label: 'jsDelivr', lane: 'mirror' },
    { url: `https://fastly.jsdelivr.net/gh/${base}@${channel.branch}/update.json`, label: 'jsDelivr Fastly', lane: 'mirror' },
    { url: `https://ghproxy.net/${raw}`, label: 'ghproxy', lane: 'mirror' },
    { url: `https://ghfast.top/${raw}`, label: 'ghfast', lane: 'mirror' },
  ]
  return rows
}

function updateUrls(channel) {
  return updateSources(channel).map(source => source.url)
}

function officialCatalogSources(channel) {
  const base = `${channel.owner}/${channel.repo}`
  const raw = `https://raw.githubusercontent.com/${base}/${channel.branch}/catalog.json`
  const rows = [
    { url: `https://github.com/${base}/releases/latest/download/catalog.json`, label: 'GitHub Release', lane: 'direct' },
    { url: raw, label: 'GitHub raw', lane: 'direct' },
    { url: `https://github.com/${base}/raw/${channel.branch}/catalog.json`, label: 'GitHub raw', lane: 'direct' },
    { url: `https://cdn.jsdelivr.net/gh/${base}@${channel.branch}/catalog.json`, label: 'jsDelivr', lane: 'mirror' },
    { url: `https://fastly.jsdelivr.net/gh/${base}@${channel.branch}/catalog.json`, label: 'jsDelivr Fastly', lane: 'mirror' },
    { url: `https://ghproxy.net/${raw}`, label: 'ghproxy', lane: 'mirror' },
    { url: `https://ghfast.top/${raw}`, label: 'ghfast', lane: 'mirror' },
  ]
  return rows
}

function officialCatalogUrls(channel) {
  return officialCatalogSources(channel).map(source => source.url)
}

function withCacheBust(url) {
  return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
}

/** Prefer whichever lanes answer quickly; wait for the slow ones only if none did. */
function settleWithin(tasks, waitMs) {
  return new Promise(resolve => {
    let remaining = tasks.length
    const settled = new Array(tasks.length)
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve(settled.slice())
    }
    const timer = setTimeout(finish, waitMs)
    timer.unref?.()
    tasks.forEach((task, index) => {
      Promise.resolve(task).then(
        value => {
          settled[index] = { status: 'fulfilled', value }
          remaining -= 1
          if (remaining === 0) finish()
        },
        reason => {
          settled[index] = { status: 'rejected', reason }
          remaining -= 1
          if (remaining === 0) finish()
        },
      )
    })
  })
}

function localVersion() {
  try {
    const entry = path.dirname(fileURLToPath(import.meta.url))
    const version = JSON.parse(fs.readFileSync(path.join(entry, 'package.json'), 'utf8')).version
    if (version) return String(version)
  } catch {
    /* the loader may hand us an entry URL that does not sit next to package.json */
  }
  return PLUGIN_VERSION
}

function compareVersions(left, right) {
  const parse = value => String(value || '0').split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

/**
 * The manifest carries its own Ed25519 signature, so the JSON and its proof travel as
 * one file and two independently cached mirrors can never be paired up wrongly
 * (that is exactly how 1.5.0 broke: jsDelivr served a 1.4.6 manifest next to a 1.5.0
 * detached signature). The signature covers this canonical payload, not the raw file
 * bytes, so re-indenting or adding fields does not invalidate it.
 */
function manifestPayload(doc) {
  return Buffer.from(
    JSON.stringify({
      version: String(doc?.version || ''),
      tarball: String(doc?.tarball || ''),
      tarballMirrors: Array.isArray(doc?.tarballMirrors) ? doc.tarballMirrors.map(String) : [],
      sha256: String(doc?.sha256 || ''),
      notes: String(doc?.notes || ''),
    }),
    'utf8',
  )
}

function manifestFields(doc) {
  const version = String(doc?.version || '').trim()
  if (!version) throw new Error('update.json 缺少 version 字段')
  const tarball = String(doc?.tarball || '').trim()
  if (!/^https?:\/\//i.test(tarball)) throw new Error('update.json 的 tarball 地址无效')
  const sha256 = String(doc?.sha256 || '').trim()
  if (!/^[0-9a-f]{64}$/i.test(sha256)) throw new Error('update.json 的 sha256 格式不正确')
  return {
    version,
    tarball,
    sha256,
    tarballMirrors: Array.isArray(doc?.tarballMirrors) ? doc.tarballMirrors.map(String).filter(Boolean) : [],
    notes: String(doc?.notes || '').slice(0, 500),
  }
}

function verifyEmbeddedManifest(doc) {
  const signature = String(doc?.signature || '').trim()
  if (!signature) return null
  let verified = false
  try {
    verified = crypto.verify(null, manifestPayload(doc), crypto.createPublicKey(UPDATE_PUBLIC_KEY), Buffer.from(signature, 'base64'))
  } catch (error) {
    throw new Error(`更新清单签名校验失败：${error?.message || error}`)
  }
  if (!verified) throw new Error('更新清单签名校验失败（可能被篡改或镜像投毒）')
  return manifestFields(doc)
}

function verifyDetachedManifest(text, signature) {
  const manifest = String(text || '')
  const sig = String(signature || '').trim()
  if (!manifest.trim()) throw new Error('更新清单为空')
  if (!sig) throw new Error('更新清单缺少签名（update.json.sig）')
  let verified = false
  try {
    verified = crypto.verify(null, Buffer.from(manifest, 'utf8'), crypto.createPublicKey(UPDATE_PUBLIC_KEY), Buffer.from(sig, 'base64'))
  } catch (error) {
    throw new Error(`更新清单签名校验失败：${error?.message || error}`)
  }
  if (!verified) throw new Error('更新清单签名校验失败（可能被篡改或镜像投毒）')
  let doc = null
  try {
    doc = JSON.parse(manifest)
  } catch {
    throw new Error('更新清单不是合法 JSON')
  }
  return manifestFields(doc)
}

/** Accepts either an embedded signature or the legacy detached one (1.4.7–1.5.0). */
function verifyManifest(text, signature) {
  const manifest = String(text || '')
  if (!manifest.trim()) throw new Error('更新清单为空')
  let doc = null
  try {
    doc = JSON.parse(manifest)
  } catch {
    if (signature) return verifyDetachedManifest(manifest, signature)
    throw new Error('更新清单不是合法 JSON')
  }
  const embedded = verifyEmbeddedManifest(doc)
  if (embedded) return embedded
  if (signature) return verifyDetachedManifest(manifest, signature)
  throw new Error('更新清单缺少签名')
}

function describeUpdateError(error, timeoutMs) {
  const message = String(error?.message || '')
  if (message.includes('签名') || message.includes('JSON') || message.includes('缺少') || message.includes('清单')) {
    return message
  }
  return describeNetworkError(error, timeoutMs)
}

function describeDownloadError(error, timeoutMs) {
  const message = String(error?.message || '')
  // Integrity failures must not be reported as "the network is unreachable".
  if (/sha256|校验|过小|地址无效/.test(message)) return message
  return describeNetworkError(error, timeoutMs)
}

async function checkUpdate(state, config, fetchText = getText) {
  const channel = updateChannel(config, state)
  const current = localVersion()
  const sources = updateSources(channel)
  // Direct GitHub and domestic mirrors race together. The signed manifest makes
  // any lane safe; the freshest valid manifest wins even if an older mirror replies first.
  const tasks = sources.map(async source => {
    const target = withCacheBust(source.url)
    const text = await fetchText(target, 12000)
    let doc = null
    try {
      doc = JSON.parse(text)
    } catch {
      doc = null
    }
    if (!doc) throw new Error('更新清单不是合法 JSON')
    let fields = verifyEmbeddedManifest(doc)
    const embedded = Boolean(fields)
    if (!fields) {
      let sigText = ''
      try {
        sigText = await fetchText(withCacheBust(`${source.url}.sig`), 12000)
      } catch (error) {
        throw new Error(`更新清单缺少签名（update.json.sig 不可用：${String(error?.message || error)}）`)
      }
      fields = verifyDetachedManifest(text, sigText)
    }
    return { ...source, fields, embedded }
  })
  let settled = await settleWithin(tasks, 3500)
  let valid = settled
    .filter(item => item && item.status === 'fulfilled')
    .map(item => item.value)
    .sort((left, right) => {
      const versionDiff = compareVersions(right.fields.version, left.fields.version)
      if (versionDiff) return versionDiff
      return left.lane === right.lane ? 0 : left.lane === 'direct' ? -1 : 1
    })
  if (!valid.length) {
    settled = await Promise.allSettled(tasks)
    valid = settled.filter(item => item.status === 'fulfilled').map(item => item.value)
  }
  if (valid.length) {
    const chosen = valid[0]
    const fields = chosen.fields
    return {
      ok: true,
      current,
      latest: fields.version,
      newer: compareVersions(fields.version, current) > 0,
      tarball: fields.tarball,
      tarballMirrors: fields.tarballMirrors,
      sha256: fields.sha256,
      notes: fields.notes,
      source: chosen.url,
      channel,
      signed: true,
      embedded: chosen.embedded,
      lane: chosen.lane,
      label: chosen.label,
      cacheBusted: true,
      checkedMirrors: sources.length,
    }
  }
  const attempts = settled
    .map((item, index) =>
      item.status === 'rejected'
        ? {
            url: sources[index]?.url || '',
            label: sources[index]?.label || '',
            lane: sources[index]?.lane || 'mirror',
            cacheBusted: true,
            error: describeUpdateError(item.reason, 12000),
          }
        : null,
    )
    .filter(Boolean)
  const signaturesSeen = attempts.some(item => item.error.includes('签名'))
  return {
    ok: false,
    current,
    channel,
    error: signaturesSeen
      ? `更新清单校验未通过（已试 ${attempts.length} 个地址）：${attempts[0]?.error || ''}`
      : `无法读取更新信息（已试 ${attempts.length} 个地址）`,
    attempts,
    signedRequired: true,
  }
}

async function fetchUpdateBuffer(url, sha256, timeoutMs = 30000) {
  if (!/^https?:\/\//i.test(url)) throw new Error('更新包地址无效')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/octet-stream', 'cache-control': 'no-cache' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length < 1024) throw new Error('下载内容过小，可能不是插件包')
    if (sha256) {
      const actual = crypto.createHash('sha256').update(buffer).digest('hex')
      if (actual.toLowerCase() !== sha256.toLowerCase()) throw new Error('sha256 校验失败，已中止安装')
    }
    return buffer
  } finally {
    clearTimeout(timer)
  }
}

function saveUpdateBuffer(buffer, sha256, version) {
  // Keep the tarball: the profile dependency records this path, so a temp
  // directory would leave it dangling after the OS cleans up.
  const dir = path.join(process.env.DSH_HOME || path.join(os.homedir(), '.dsh'), NAME, 'packages')
  fs.mkdirSync(dir, { recursive: true })
  const label = String(version || Date.now()).replace(/[^0-9A-Za-z._-]/g, '_')
  const file = path.join(dir, `cyber-egg-${label}.tgz`)
  fs.writeFileSync(file, buffer)
  return { file, bytes: buffer.length, sha256: sha256 || crypto.createHash('sha256').update(buffer).digest('hex') }
}

async function downloadUpdate(url, sha256, version) {
  return saveUpdateBuffer(await fetchUpdateBuffer(url, sha256, 120000), sha256, version)
}

async function downloadUpdateFromSources(sources, sha256, version) {
  if (!sources.length) throw new Error('update.json 没有给出 tarball 地址')
  // Race every tarball lane; sha256 gates the winner, so a poisoned proxy cannot
  // install anything and a slow direct GitHub path cannot block a working mirror.
  const runners = sources.map(async source => ({
    source,
    buffer: await fetchUpdateBuffer(source.url, sha256, 30000),
  }))
  let winner = null
  try {
    winner = await Promise.any(runners)
  } catch (error) {
    const failures = (error?.errors || []).map((item, index) => {
      const source = sources[index] || {}
      return `${source.url || '?'}: ${describeDownloadError(item, 30000)}`
    })
    throw new Error(`下载失败（已试 ${sources.length} 个地址）：${failures.join('；')}`)
  }
  return {
    ...saveUpdateBuffer(winner.buffer, sha256, version),
    source: winner.source.url,
    lane: winner.source.lane,
    label: winner.source.label,
  }
}

async function installUpdate(ctx, state, body, config) {
  const manager = ctx.get('pluginManager')
  if (!manager) throw new Error('当前运行环境没有 pluginManager 服务，无法自动安装更新')
  const current = localVersion()
  let url = ''
  let sha256 = ''
  let latest = ''
  let mirrors = []
  if (body?.url) {
    // Only a signed manifest may name its own tarball: without this check the local
    // API could be asked to install an arbitrary package. The signature may be
    // embedded in the manifest or supplied separately (legacy format).
    if (!body?.manifest) throw new Error('拒绝安装：未经签名的更新清单')
    const doc = verifyManifest(String(body.manifest), body?.signature ? String(body.signature) : '')
    url = doc.tarball
    sha256 = doc.sha256
    latest = doc.version
    mirrors = doc.tarballMirrors
  } else {
    const checked = await checkUpdate(state, config)
    if (!checked.ok) throw new Error(checked.error)
    if (!checked.newer) return { ok: true, upToDate: true, current, latest: checked.latest, signed: true }
    url = checked.tarball
    mirrors = checked.tarballMirrors
    sha256 = checked.sha256
    latest = checked.latest
  }
  if (!url && !mirrors.length) throw new Error('update.json 没有给出 tarball 地址')
  const candidates = [url, ...mirrors]
    .filter(Boolean)
    .map(candidate => ({
      url: candidate,
      lane: sourceLane(candidate),
      label: sourceLane(candidate) === 'direct' ? 'GitHub direct' : 'mirror',
    }))
  const downloaded = await downloadUpdateFromSources(candidates, sha256, latest)
  let result = null
  try {
    result = await manager.installBundle(downloaded.file, { enabled: true })
  } catch (error) {
    if (!/already[\s-]?installed|no[\s-]?change/i.test(String(error?.message || error))) throw error
    result = { application: 'unchanged' }
  }
  const code = String(result?.error?.code || '')
  const unchanged = /already[\s-]?installed|no[\s-]?change/i.test(code)
  if (unchanged) {
    // Same bytes already installed: that is not a failure, the panel shows "up to date".
    return {
      ok: true,
      upToDate: true,
      unchanged: true,
      from: current,
      to: latest || current,
      application: 'unchanged',
      bytes: downloaded.bytes,
      file: downloaded.file,
    }
  }
  return {
    ok: result?.application !== 'failed',
    from: current,
    to: latest || 'unknown',
    application: result?.application || 'unknown',
    restartReason: result?.restartReason,
    error: result?.error?.code || undefined,
    diagnostic: result?.error?.diagnostic?.slice?.(0, 300) || undefined,
    bytes: downloaded.bytes,
    file: downloaded.file,
  }
}

async function verifyUpdate(ctx, spec) {
  const manager = ctx.get('pluginManager')
  if (!manager) throw new Error('当前运行环境没有 pluginManager 服务')
  if (!spec) throw new Error('需要安装包路径')
  return manager.inspect(spec)
}

/* ------------------------------------------------------------------ tool */

function toolResult(text) {
  return { text }
}

function registerTool(ctx, state, handlers) {
  const tools = ctx.get('tools')
  if (!tools) return
  const definition = {
    name: 'cyber_egg',
    description:
      'Cyber egg: free-token sources and daily free-credit check-in. `list` shows the tiered source catalogue (top three by popularity, three editor picks, the rest, plus subscribed feeds) with daily quota and China-registration notes; `status` shows installed models and today\'s claims; `install` registers one source as a DSH model provider from an API key the user supplies; `claim` checks in to every enabled relay now; `relay_add` adds a New API style relay site; `refresh` re-pulls the live free-model radar and subscribed feeds. All settings live in the Cyber Egg panel in the left sidebar.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'status', 'install', 'claim', 'relay_add', 'refresh'],
          description: 'Operation to perform.',
        },
        source: { type: 'string', description: 'Source id for install, e.g. openrouter.' },
        apiKey: { type: 'string', description: 'API key typed by the user; it is stored in the local credential store.' },
        models: { type: 'string', description: 'Optional comma-separated model ids when discovery returns none.' },
        name: { type: 'string', description: 'Relay display name for relay_add.' },
        baseURL: { type: 'string', description: 'Relay site root URL for relay_add.' },
        token: { type: 'string', description: 'Relay access token for relay_add.' },
        userId: { type: 'string', description: 'Optional New API user id header value.' },
      },
      required: ['action'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      render: (_args, value) => [{ type: 'text', text: String(value?.text ?? '') }],
    },
    execute: async args => {
      const action = String(args?.action || '')
      if (action === 'list') {
        const marks = { hot: '🔥', pick: '[荐]', feed: '[订阅]' }
        const labelMap = { ...accessLabels, ...(state.officialCatalog?.accessLabels || {}) }
        const lines = sourcePool(state).map(source => {
          const access = labelMap[source.access] || source.access || ''
          return `- ${marks[source.tier] ? `${marks[source.tier]} ` : ''}${source.id} · ${source.name} — ${source.daily || source.quota || ''}；${access}；注册 ${source.signupUrl}`
        })
        return toolResult(`免费 token 来源：\n${lines.join('\n')}`)
      }
      if (action === 'status') {
        const rows = Object.entries(state.installed).map(
          ([id, record]) => `- ${id} → 路由 ${record.routeId}，${record.models.length} 个模型`,
        )
        const relays = state.relays.map(
          relay => `- ${relay.name} ${relay.baseURL} — ${state.today[relay.id] === dayKey() ? '今天已领' : '今天未领'}`,
        )
        return toolResult(
          `已安装：\n${rows.join('\n') || '（无）'}\n\n中转站：\n${relays.join('\n') || '（无）'}\n\n自动领取：${
            state.claims.enabled ? `每天 ${pad(state.claims.hour)}:${pad(state.claims.minute)}` : '已关闭'
          }`,
        )
      }
      if (action === 'install') {
        const result = await handlers.install({
          sourceId: args?.source,
          apiKey: args?.apiKey,
          models: args?.models,
        })
        return toolResult(`已安装 ${args?.source}：模型路由 ${result.routeId}，${result.modelCount} 个模型。`)
      }
      if (action === 'claim') {
        const results = await handlers.claimAll({})
        return toolResult(
          results.length
            ? results.map(item => `- ${item.name}：${item.ok ? '已领取' : `失败（${item.message}）`}`).join('\n')
            : '还没有配置中转站。',
        )
      }
      if (action === 'relay_add') {
        await handlers.saveRelay({ name: args?.name, baseURL: args?.baseURL, token: args?.token, userId: args?.userId })
        return toolResult(`已添加中转站 ${args?.name || args?.baseURL}，可在面板里开启每日自动领取。`)
      }
      if (action === 'refresh') {
        const outcome = await handlers.refresh()
        const radar = outcome.state?.radar || {}
        const kilo = outcome.state?.kilo || {}
        const catalog = outcome.state?.officialCatalog || {}
        const catalogResult = outcome.officialCatalog || {}
        const routeSync = outcome.installedRoutes || {}
        const catalogLane = catalog.lane === 'direct' ? 'GitHub 直连' : catalog.lane === 'mirror' ? '国内镜像' : ''
        const catalogState = catalogResult.skipped ? '，3 天内复用缓存' : catalogLane ? `，${catalogLane}` : ''
        return toolResult(
          `已刷新：官方源清单 ${catalog.version || '内置版'}${catalogState}${catalog.error ? `（拉取失败：${catalog.error}）` : ''}；` +
            `OpenRouter 免费模型 ${radar.freeCount || 0} 个（新上架 ${(radar.newIds || []).length} 个）` +
            `${radar.error ? `，雷达错误：${radar.error}` : ''}；Kilo 匿名免费 ${ (kilo.items || []).length } 个（免注册免 Key）；` +
            `订阅源 ${(outcome.state?.sources || []).filter(item => item.tier === 'feed').length} 条；已装路由同步 ${routeSync.updated || 0} 个，移除失效模型 ${routeSync.removedModels || 0} 个。`,
        )
      }
      throw new Error(`unknown action: ${action}`)
    },
  }
  return tools.register(definition)
}

/* ------------------------------------------------------------------ apply */

export function apply(ctx, config = {}) {
  const state = loadState()
  if (config && typeof config.claims === 'object') {
    state.claims = { ...state.claims, ...config.claims }
  }
  if (config && typeof config.hour === 'number') state.claims.hour = config.hour
  if (config && typeof config.minute === 'number') state.claims.minute = config.minute

  const runDue = async reason => {
    if (!state.relays.some(relay => relay.enabled)) return []
    return claimAll(ctx, state, { reason })
  }

  let scheduler = null
  const runtime = { proxyPort: 0, proxyServer: null }

  const healKiloRoute = async () => {
    const settings = ctx.get('settings')
    if (!settings || !runtime.proxyPort) return false
    let descriptor = null
    try {
      descriptor = providerDescriptor(settings)
    } catch {
      return false
    }
    const credentials = ctx.get('credentials')
    const expected = kiloProxyUrl(runtime.proxyPort)
    const profile = descriptor.value && descriptor.value.providers && descriptor.value.providers[KILO_ROUTE]
    if (!profile) return true
    if (credentials && !profile.apiKeyEnv) {
      await credentials.set(KILO_REF, 'kilo-free-noauth').catch(() => {})
    }
    if (profile.baseURL === expected) {
      if (state.kiloProxy?.healError) {
        state.kiloProxy = { ...state.kiloProxy, healError: null }
        saveState(state)
      }
      return true
    }
    // Write the whole profile back: the settings service accepts the same shape the
    // installer uses, while a nested path update is not portable across versions.
    const value = { ...profile, baseURL: expected }
    if (!value.apiKeyEnv) value.apiKeyEnv = KILO_REF
    await settings.mutate(descriptor.ns, [{ op: 'set', path: ['providers', KILO_ROUTE], value }], descriptor.revision)
    state.kiloProxy = { ...(state.kiloProxy || {}), port: runtime.proxyPort, random: true, healError: null, at: new Date().toISOString() }
    saveState(state)
    // The route now points at the current port. Do not pull upstream lists here:
    // model-pool refreshes are explicit user actions only.
    return true
  }

  // settings.mutate internally opens an HMR transaction, so it can only run outside
  // the plugin-apply context (timers inherit it through AsyncLocalStorage and fail
  // with "HMR transactions cannot be nested"). Healing therefore happens on the next
  // API request — the panel calls /kilo/heal right after it loads.
  let healing = false
  const maybeHealRoute = () => {
    if (healing || !runtime.proxyPort) return
    healing = true
    healKiloRoute()
      .catch(() => {})
      .finally(() => {
        healing = false
      })
  }

  const rememberedPort = state.kiloProxy?.random === true ? Number(state.kiloProxy?.port) || 0 : 0
  const proxyReady = startKiloProxy(rememberedPort).then(result => {
    if (result.error) {
      console.error(`[${NAME}] kilo proxy failed:`, result.error)
      return null
    }
    runtime.proxyPort = result.port
    runtime.proxyServer = result.server
    if (state.kiloProxy?.port !== result.port || state.kiloProxy?.random !== true) {
      state.kiloProxy = { port: result.port, random: true, at: new Date().toISOString() }
      saveState(state)
    }
    // Deferred to request time, see maybeHealRoute below.
    return result.port
  })

  const handlers = {
    install: body => installSource(ctx, state, body),
    uninstall: body => uninstallSource(ctx, state, body),
    discover: async body => {
      const source = findSource(state, body.sourceId)
      if (!source) throw new Error('未知的鸡蛋来源')
      const apiKey = String(body.apiKey || '').trim()
      if (!apiKey) throw new Error('需要先填 API Key')
      const result = await discover(ctx, source, apiKey, [])
      return {
        ok: true,
        models: result.models.slice(0, 80),
        discoveredCount: result.discoveredCount,
        discoveryError: result.discoveryError || undefined,
      }
    },
    saveRelay: async body => {
      const credentials = ctx.get('credentials')
      const id = body.id ? String(body.id) : ''
      const existing = id ? state.relays.find(relay => relay.id === id) : null
      if (id && !existing) throw new Error('中转站不存在')
      const relay = normaliseRelay(body, existing)
      const token = String(body.token || '').trim()
      if (token) {
        if (!credentials) throw new Error('credentials 服务不可用')
        const value = token.startsWith('Bearer ') ? token.slice(7).trim() : token
        await credentials.set(relay.tokenRef, value)
      } else if (!existing) {
        throw new Error('新建中转站必须填口令')
      }
      if (existing) state.relays = state.relays.map(item => (item.id === relay.id ? relay : item))
      else state.relays.push(relay)
      if (!existing && state.relays.length === 1 && !state.claims.userSet) {
        state.claims = { ...state.claims, enabled: true, userSet: true }
        scheduler?.reschedule()
      } else if (!existing && state.claims.enabled) {
        scheduler?.reschedule()
      }
      saveState(state)
      return { ok: true, relay: { id: relay.id, name: relay.name }, claims: state.claims }
    },
    deleteRelay: async body => {
      const id = String(body.id || '')
      const relay = state.relays.find(item => item.id === id)
      if (!relay) throw new Error('中转站不存在')
      state.relays = state.relays.filter(item => item.id !== id)
      delete state.today[id]
      saveState(state)
      const credentials = ctx.get('credentials')
      if (credentials) await credentials.unset(relay.tokenRef).catch(() => {})
      return { ok: true }
    },
    testRelay: body => detectRelay(ctx, body, state),
    refresh: async body => {
      const outcome = await refreshAll(ctx, state, true, config, { forceCatalog: body?.forceCatalog === true })
      return { ok: true, ...outcome, state: snapshot(ctx, state) }
    },
    kiloModels: async body => {
      const outcome = await refreshKilo(state, body?.force !== false)
      saveState(state)
      return { ok: true, ...outcome, state: snapshot(ctx, state) }
    },
    kiloInstall: async body => {
      const port = await proxyReady
      if (!port) throw new Error('本地转发启动失败（端口可能被占用）')
      const result = await installKilo(ctx, state, body, port)
      return { ...result, state: snapshot(ctx, state) }
    },
    kiloTest: async () => {
      await proxyReady
      return testKilo(ctx)
    },
    kiloHeal: async () => {
      const healed = await healKiloRoute()
      return { ok: true, healed, port: runtime.proxyPort, state: snapshot(ctx, state) }
    },
    kiloUninstall: async () => {
      const settings = ctx.get('settings')
      if (!settings) throw new Error('settings 服务不可用')
      const descriptor = providerDescriptor(settings)
      await settings.mutate(descriptor.ns, [{ op: 'unset', path: ['providers', KILO_ROUTE] }], descriptor.revision)
      const credentials = ctx.get('credentials')
      if (credentials) await credentials.unset(KILO_REF).catch(() => {})
      return { ok: true, state: snapshot(ctx, state) }
    },
    pollinationsModels: async body => {
      const outcome = await refreshPollinations(state, body?.force !== false)
      saveState(state)
      return { ok: true, ...outcome, state: snapshot(ctx, state) }
    },
    pollinationsInstall: async body => {
      const result = await installPollinations(ctx, state, body)
      return { ...result, state: snapshot(ctx, state) }
    },
    pollinationsUninstall: async () => {
      const settings = ctx.get('settings')
      if (!settings) throw new Error('settings 服务不可用')
      const descriptor = providerDescriptor(settings)
      await settings.mutate(descriptor.ns, [{ op: 'unset', path: ['providers', POLLINATIONS_ROUTE] }], descriptor.revision)
      const credentials = ctx.get('credentials')
      if (credentials) await credentials.unset(POLLINATIONS_REF).catch(() => {})
      return { ok: true, state: snapshot(ctx, state) }
    },
    llm7Models: async body => {
      const outcome = await refreshLlm7(state, body?.force !== false)
      saveState(state)
      return { ok: true, ...outcome, state: snapshot(ctx, state) }
    },
    llm7Install: async body => {
      const result = await installLlm7(ctx, state, body)
      return { ...result, state: snapshot(ctx, state) }
    },
    llm7Uninstall: async () => {
      const settings = ctx.get('settings')
      if (!settings) throw new Error('settings 服务不可用')
      const descriptor = providerDescriptor(settings)
      await settings.mutate(descriptor.ns, [{ op: 'unset', path: ['providers', LLM7_ROUTE] }], descriptor.revision)
      const credentials = ctx.get('credentials')
      if (credentials) await credentials.unset(LLM7_REF).catch(() => {})
      return { ok: true, state: snapshot(ctx, state) }
    },
    anonHealth: async body => {
      const result = await healthCheckAnon(ctx, state, {
        prune: body?.prune !== false,
        scope: body?.scope === 'pool' ? 'pool' : 'installed',
      })
      return { ...result, state: snapshot(ctx, state) }
    },
    anonUnblock: async body => {
      const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
      const before = state.anonBlocked || []
      state.anonBlocked = ids.length ? before.filter(id => !ids.includes(id)) : []
      saveState(state)
      return { ok: true, unblocked: before.length - state.anonBlocked.length, state: snapshot(ctx, state) }
    },
    updateCheck: async () => checkUpdate(state, config),
    updateInstall: async body => installUpdate(ctx, state, body, config),
    updateVerify: async body => verifyUpdate(ctx, String(body?.path || '')),
    updateChannel: async body => {
      const owner = String(body?.owner || '').trim()
      const repo = String(body?.repo || '').trim()
      const branch = String(body?.branch || 'main').trim() || 'main'
      if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) throw new Error('仓库地址格式不正确')
      state.update = { owner, repo, branch }
      saveState(state)
      return { ok: true, channel: updateChannel(config, state) }
    },
    reset: async body => {
      const scope = String(body?.scope || 'history')
      if (scope === 'history') state.history = []
      if (scope === 'all') {
        state.history = []
        state.today = {}
        state.feeds = []
        state.feedSources = []
        state.feedNewIds = []
        state.feedSeenIds = []
        state.lastRun = null
      }
      saveState(state)
      return { ok: true, state: snapshot(ctx, state) }
    },
    feed: async body => {
      const action = String(body.action || '')
      const url = String(body.url || '').trim()
      if (action === 'add') {
        if (!/^https?:\/\//i.test(url)) throw new Error('订阅源需要以 http:// 或 https:// 开头')
        if (state.feeds.some(feed => feed.url === url)) throw new Error('这个订阅源已经加过了')
        state.feeds.push({ url, at: null, ok: null, error: null, count: 0 })
        saveState(state)
        const results = await refreshFeeds(state)
        return { ok: true, feeds: state.feeds, results, state: snapshot(ctx, state) }
      }
      if (action === 'remove') {
        if (!url) throw new Error('需要指定订阅源地址')
        state.feeds = state.feeds.filter(feed => feed.url !== url)
        state.feedSources = (state.feedSources || []).filter(source => source.origin !== url)
        saveState(state)
        return { ok: true, feeds: state.feeds, state: snapshot(ctx, state) }
      }
      throw new Error('未知的订阅源操作')
    },
    claimOne: async body => {
      const relay = state.relays.find(item => item.id === String(body.id || ''))
      if (!relay) throw new Error('中转站不存在')
      const [result] = await claimAll(ctx, state, { onlyId: relay.id })
      return { ok: Boolean(result?.ok), result }
    },
    claimAll: async () => {
      const results = await claimAll(ctx, state, { reason: 'manual' })
      return { ok: true, results }
    },
    saveClaims: async body => {
      const hour = Number(body.hour)
      const minute = Number(body.minute)
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('小时需要 0-23')
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('分钟需要 0-59')
      state.claims = {
        enabled: Boolean(body.enabled),
        hour,
        minute,
        catchUp: body.catchUp === undefined ? true : Boolean(body.catchUp),
        userSet: true,
      }
      saveState(state)
      scheduler?.reschedule()
      return { ok: true, claims: state.claims }
    },
  }

  ctx.effect(() => {
    const disposeRoute = ctx.webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: async (req, res) => {
        const remote = req.socket?.remoteAddress || ''
        if (!(remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1')) {
          json(res, 403, { ok: false, error: '只接受本机请求' })
          return
        }
        if (!localOriginAllowed(req)) {
          json(res, 403, { ok: false, error: '来源不允许' })
          return
        }
        maybeHealRoute()
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        const route = url.pathname.slice(API_PREFIX.length).replace(/\/+$/, '') || '/'
        try {
          if (req.method === 'GET' && (route === '/' || route === '/state')) {
            json(res, 200, snapshot(ctx, state))
            return
          }
          if (req.method === 'GET' && route === '/refresh') {
            json(res, 200, await handlers.refresh())
            return
          }
          if (req.method === 'GET' && route === '/update') {
            json(res, 200, await handlers.updateCheck())
            return
          }
          if (req.method === 'GET' && route === '/kilo/models') {
            json(res, 200, await handlers.kiloModels({ force: true }))
            return
          }
          if (req.method === 'GET' && route === '/pollinations/models') {
            json(res, 200, await handlers.pollinationsModels({ force: true }))
            return
          }
          if (req.method === 'GET' && route === '/llm7/models') {
            json(res, 200, await handlers.llm7Models({ force: true }))
            return
          }
          if (req.method !== 'POST') {
            json(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          const body = await readBody(req)
          if (route === '/install') return json(res, 200, await handlers.install(body))
          if (route === '/uninstall') return json(res, 200, await handlers.uninstall(body))
          if (route === '/discover') return json(res, 200, await handlers.discover(body))
          if (route === '/refresh') return json(res, 200, await handlers.refresh(body))
          if (route === '/reset') return json(res, 200, await handlers.reset(body))
          if (route === '/update/check') return json(res, 200, await handlers.updateCheck(body))
          if (route === '/update/install') return json(res, 200, await handlers.updateInstall(body))
          if (route === '/update/verify') return json(res, 200, await handlers.updateVerify(body))
          if (route === '/update/channel') return json(res, 200, await handlers.updateChannel(body))
          if (route === '/kilo/install') return json(res, 200, await handlers.kiloInstall(body))
          if (route === '/kilo/heal') return json(res, 200, await handlers.kiloHeal(body))
          if (route === '/kilo/uninstall') return json(res, 200, await handlers.kiloUninstall(body))
          if (route === '/kilo/test') return json(res, 200, await handlers.kiloTest(body))
          if (route === '/kilo/models') return json(res, 200, await handlers.kiloModels(body))
          if (route === '/pollinations/models') return json(res, 200, await handlers.pollinationsModels(body))
          if (route === '/pollinations/install') return json(res, 200, await handlers.pollinationsInstall(body))
          if (route === '/pollinations/uninstall') return json(res, 200, await handlers.pollinationsUninstall(body))
          if (route === '/llm7/models') return json(res, 200, await handlers.llm7Models(body))
          if (route === '/llm7/install') return json(res, 200, await handlers.llm7Install(body))
          if (route === '/llm7/uninstall') return json(res, 200, await handlers.llm7Uninstall(body))
          if (route === '/anon/health') return json(res, 200, await handlers.anonHealth(body))
          if (route === '/anon/unblock') return json(res, 200, await handlers.anonUnblock(body))
          if (route === '/feeds') return json(res, 200, await handlers.feed(body))
          if (route === '/relay/save') return json(res, 200, await handlers.saveRelay(body))
          if (route === '/relay/delete') return json(res, 200, await handlers.deleteRelay(body))
          if (route === '/relay/test') return json(res, 200, await handlers.testRelay(body))
          if (route === '/claim') {
            const id = String(body.id || '')
            return json(res, 200, id ? await handlers.claimOne(body) : await handlers.claimAll())
          }
          if (route === '/claims') return json(res, 200, await handlers.saveClaims(body))
          json(res, 404, { ok: false, error: 'unknown route' })
        } catch (error) {
          json(res, 400, { ok: false, error: error?.message || String(error) })
        }
      },
    })
    const stopScheduler = startScheduler(ctx, state, runDue)
    scheduler = stopScheduler
    const disposeTool = registerTool(ctx, state, handlers)
    // Machine room first, pools second: wait for the proxy to bind (and record the
    // port this device got) before pulling any model list.
    // Everything remote is pull-on-demand: startup only binds the local proxy and
    // reads cached state. The user must press Refresh eggs to hit upstream APIs.
    proxyReady.then(port => console.log(`[${NAME}] local machine room ready on 127.0.0.1:${port || '?'}`)).catch(() => {})
    return () => {
      scheduler = null
      proxyReady.then(() => runtime.proxyServer?.close()).catch(() => {})
      disposeRoute()
      stopScheduler.dispose()
      disposeTool?.()
    }
  })
}

/** Exposed for the offline test harness only; not a supported API. */
export const internals = {
  refreshRadar,
  refreshKilo,
  radarFromKilo,
  describeNetworkError,
  verifyManifest,
  compareVersions,
  verifyOfficialCatalog,
  catalogPayload,
  catalogFields,
  refreshOfficialCatalog,
  sanitiseSource,
  syncInstalledSources,
  officialCatalogUrls,
  officialCatalogSources,
  updateUrls,
  updateSources,
  sourceLane,
  downloadUpdateFromSources,
  checkUpdate,
  OFFICIAL_CATALOG_TTL,
}
