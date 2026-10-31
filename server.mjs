import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, statSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { resolve, extname, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const dataDirectory = resolve(process.env.DATA_DIR ?? 'data')
mkdirSync(dataDirectory, { recursive: true })
const database = new DatabaseSync(resolve(dataDirectory, 'muszaknaplo.sqlite'))
const sessionDuration = 7 * 24 * 60 * 60 * 1000
const loginAttempts = new Map()

database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shift_templates (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS calendar_entries (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`)

for (const table of ['shift_templates', 'calendar_entries']) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((column) => column.name === 'user_id')) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT REFERENCES users(id)`)
  }
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  response.end(JSON.stringify(value))
}

async function readJson(request, maxBytes = 1_000_000) {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (Buffer.byteLength(body) > maxBytes) throw new Error('Request body too large')
  }
  return JSON.parse(body)
}

function requestUser(request) {
  const cookie = request.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('muszaknaplo_session='))
  if (!cookie) return null
  let token
  try {
    token = decodeURIComponent(cookie.slice('muszaknaplo_session='.length))
  } catch {
    return null
  }
  const row = database.prepare(`
    SELECT users.id, users.username, sessions.token_hash
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(hashToken(token), Date.now())
  if (!row) return null
  return { id: row.id, username: row.username, tokenHash: row.token_hash }
}

function clearSessionCookie() {
  return 'muszaknaplo_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
}

function setSessionCookie(token) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''
  return `muszaknaplo_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionDuration / 1000}${secure}`
}

function sameOrigin(request) {
  const origin = request.headers.origin
  if (!origin || !request.headers.host) return false
  try {
    const originUrl = new URL(origin)
    const forwardedProtocol = request.headers['x-forwarded-proto']?.split(',')[0].trim()
    const requestProtocol = forwardedProtocol
      ? `${forwardedProtocol.replace(/:$/, '')}:`
      : request.socket.encrypted ? 'https:' : 'http:'
    return originUrl.host === request.headers.host && originUrl.protocol === requestProtocol
  } catch {
    return false
  }
}

function isValidState(state) {
  return state && Array.isArray(state.templates) && Array.isArray(state.shifts)
    && [...state.templates, ...state.shifts].every((item) => item && typeof item.id === 'string')
}

function loadState(userId) {
  const templates = database.prepare('SELECT data FROM shift_templates WHERE user_id = ? ORDER BY rowid').all(userId)
  const shifts = database.prepare('SELECT data FROM calendar_entries WHERE user_id = ? ORDER BY rowid').all(userId)
  const initialized = database.prepare('SELECT value FROM app_metadata WHERE key = ?').get(`initialized:${userId}`)
  const userCount = database.prepare('SELECT COUNT(*) AS count FROM users').get().count
  const legacyImport = database.prepare("SELECT value FROM app_metadata WHERE key = 'legacy_import_completed'").get()
  return {
    initialized: initialized?.value === 'true',
    allowLegacyImport: userCount === 1 && legacyImport?.value !== 'true',
    templates: templates.map((row) => JSON.parse(row.data)),
    shifts: shifts.map((row) => JSON.parse(row.data)),
  }
}

function saveState(userId, state) {
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('DELETE FROM shift_templates WHERE user_id = ?').run(userId)
    database.prepare('DELETE FROM calendar_entries WHERE user_id = ?').run(userId)
    const insertTemplate = database.prepare('INSERT INTO shift_templates (id, data, user_id) VALUES (?, ?, ?)')
    const insertShift = database.prepare('INSERT INTO calendar_entries (id, data, user_id) VALUES (?, ?, ?)')
    for (const template of state.templates) insertTemplate.run(template.id, JSON.stringify(template), userId)
    for (const shift of state.shifts) insertShift.run(shift.id, JSON.stringify(shift), userId)
    database.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(`initialized:${userId}`, 'true')
    database.prepare("INSERT INTO app_metadata (key, value) VALUES ('legacy_import_completed', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'").run()
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function loginKey(request, username) {
  const address = request.socket.remoteAddress ?? 'unknown'
  return `${address}:${username.toLowerCase().slice(0, 32)}`
}

function failedLogin(request, username) {
  const key = loginKey(request, username)
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (current && current.resetAt > now && current.count >= 5) return true
  if (!current || current.resetAt <= now) loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 })
  return false
}

function recordFailedLogin(request, username) {
  const key = loginKey(request, username)
  const current = loginAttempts.get(key) ?? { count: 0, resetAt: Date.now() + 15 * 60 * 1000 }
  current.count += 1
  loginAttempts.set(key, current)
}

export async function handleApiRequest(request, response) {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (!pathname.startsWith('/api/')) return false

  if (pathname === '/api/login' && request.method === 'POST') {
    if (!sameOrigin(request)) {
      sendJson(response, 403, { error: 'Forbidden' })
      return true
    }
    try {
      const body = await readJson(request, 10_000)
      const username = typeof body.username === 'string' ? body.username.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      if (failedLogin(request, username)) {
        sendJson(response, 429, { error: 'Too many attempts' })
        return true
      }
      const user = database.prepare('SELECT id, username, password_salt, password_hash FROM users WHERE username = ?').get(username)
      const salt = user?.password_salt ?? 'muszaknaplo-invalid-user-salt'
      const actual = scryptSync(password, salt, 64)
      const expected = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64)
      const valid = expected.length === actual.length && timingSafeEqual(expected, actual)
      if (!user || !valid) {
        recordFailedLogin(request, username)
        sendJson(response, 401, { error: 'Invalid username or password' })
        return true
      }

      loginAttempts.delete(loginKey(request, username))
      const token = randomBytes(32).toString('base64url')
      database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
      database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
        .run(hashToken(token), user.id, Date.now() + sessionDuration)
      sendJson(response, 200, { user: { id: user.id, username: user.username } }, { 'Set-Cookie': setSessionCookie(token) })
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(response, 400, { error: 'Invalid request' })
      } else {
        console.error('Login request failed:', error)
        sendJson(response, 400, { error: 'Invalid request' })
      }
    }
    return true
  }

  if (pathname === '/api/session' && request.method === 'GET') {
    const user = requestUser(request)
    if (!user) {
      sendJson(response, 401, { error: 'Not authenticated' }, { 'Set-Cookie': clearSessionCookie() })
    } else {
      sendJson(response, 200, { user: { id: user.id, username: user.username } })
    }
    return true
  }

  if (pathname === '/api/logout' && request.method === 'POST') {
    if (!sameOrigin(request)) {
      sendJson(response, 403, { error: 'Forbidden' })
      return true
    }
    const user = requestUser(request)
    if (user) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(user.tokenHash)
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() })
    return true
  }

  if (pathname === '/api/state' && (request.method === 'GET' || request.method === 'PUT')) {
    const user = requestUser(request)
    if (!user) {
      sendJson(response, 401, { error: 'Not authenticated' })
      return true
    }
    if (request.method === 'GET') {
      try {
        sendJson(response, 200, loadState(user.id))
      } catch (error) {
        console.error('Unable to load account state:', error)
        sendJson(response, 500, { error: 'Could not load saved data' })
      }
      return true
    }
    if (!sameOrigin(request)) {
      sendJson(response, 403, { error: 'Forbidden' })
      return true
    }
    try {
      const state = await readJson(request)
      if (!isValidState(state)) {
        sendJson(response, 400, { error: 'Invalid state' })
        return true
      }
      saveState(user.id, state)
      sendJson(response, 200, { ok: true })
    } catch (error) {
      if (error instanceof SyntaxError || error.message === 'Request body too large') {
        sendJson(response, 400, { error: 'Invalid state' })
      } else {
        console.error('Unable to save account state:', error)
        sendJson(response, 500, { error: 'Could not save data' })
      }
    }
    return true
  }

  sendJson(response, 404, { error: 'Not found' })
  return true
}

function createHiddenPrompt(prompt) {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error('Run this command in an interactive terminal.')
  process.stdout.write(prompt)
  return new Promise((resolvePrompt, rejectPrompt) => {
    let value = ''
    const finish = (error) => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.off('data', onData)
      process.stdout.write('\n')
      if (error) rejectPrompt(error)
      else resolvePrompt(value)
    }
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') return finish(new Error('Cancelled.'))
        if (character === '\r' || character === '\n') return finish()
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1)
        else value += character
      }
    }
    process.stdin.setRawMode(true)
    process.stdin.setEncoding('utf8')
    process.stdin.resume()
    process.stdin.on('data', onData)
  })
}

async function addUser(username) {
  const normalizedUsername = username.trim().toLowerCase()
  if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
    throw new Error('Username must be 3–32 characters: letters, numbers, dot, underscore or hyphen.')
  }
  if (database.prepare('SELECT id FROM users WHERE username = ?').get(normalizedUsername)) {
    throw new Error('That username already exists.')
  }
  const password = await createHiddenPrompt('Password (minimum 12 characters): ')
  const confirmation = await createHiddenPrompt('Repeat password: ')
  if (password.length < 12) throw new Error('Password must contain at least 12 characters.')
  if (password !== confirmation) throw new Error('Passwords do not match.')

  const userCount = database.prepare('SELECT COUNT(*) AS count FROM users').get().count
  const userId = randomBytes(16).toString('hex')
  const salt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(password, salt, 64).toString('hex')
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('INSERT INTO users (id, username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, normalizedUsername, salt, passwordHash, new Date().toISOString())
    if (userCount === 0) {
      for (const table of ['shift_templates', 'calendar_entries']) {
        database.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(userId)
      }
      const oldInitialized = database.prepare("SELECT value FROM app_metadata WHERE key = 'initialized'").get()
      if (oldInitialized?.value === 'true') {
        database.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)').run(`initialized:${userId}`, 'true')
      }
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  console.log(`Created account "${normalizedUsername}".`)
}

function serveStatic(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }
  const distribution = resolve('dist')
  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  } catch {
    response.writeHead(400)
    response.end()
    return
  }
  const candidate = resolve(distribution, `.${pathname}`)
  const pathFromRoot = relative(distribution, candidate)
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === '..' || pathFromRoot.startsWith('.')) {
    response.writeHead(404)
    response.end()
    return
  }
  let file = candidate
  try {
    if (statSync(file).isDirectory()) file = resolve(file, 'index.html')
  } catch {
    if (extname(pathname)) {
      response.writeHead(404)
      response.end()
      return
    }
    file = resolve(distribution, 'index.html')
  }
  try {
    const content = readFileSync(file)
    const types = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff2': 'font/woff2',
    }
    const asset = file.includes(`${sep}assets${sep}`)
    response.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': asset ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(request.method === 'HEAD' ? undefined : content)
  } catch (error) {
    console.error('Unable to serve built app:', error)
    response.writeHead(500)
    response.end('Application build is missing. Run npm run build first.')
  }
}

function startServer() {
  const host = process.env.APP_HOST ?? '0.0.0.0'
  const port = Number(process.env.APP_PORT ?? 4173)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('APP_PORT must be a valid TCP port.')
  const server = createServer((request, response) => {
    if (request.url?.startsWith('/api/')) {
      void handleApiRequest(request, response).catch((error) => {
        console.error('Unhandled API error:', error)
        if (!response.headersSent) sendJson(response, 500, { error: 'Internal server error' })
        else response.destroy(error)
      })
    } else {
      serveStatic(request, response)
    }
  })
  server.listen(port, host, () => console.log(`Műszaknapló running at http://${host}:${port}`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [command, username] = process.argv.slice(2)
    if (command === 'add-user' && username) {
      await addUser(username)
    } else if (command === 'start' || !command) {
      startServer()
    } else {
      throw new Error('Usage: node server.mjs [start | add-user USERNAME]')
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
