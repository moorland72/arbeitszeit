import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DatabaseSync } from 'node:sqlite'

const dataDirectory = resolve(process.cwd(), 'data')
mkdirSync(dataDirectory, { recursive: true })
const database = new DatabaseSync(resolve(dataDirectory, 'muszaknaplo.sqlite'))
database.exec(`
  CREATE TABLE IF NOT EXISTS shift_templates (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS calendar_entries (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`)

function readState() {
  const readRows = database.prepare('SELECT data FROM shift_templates ORDER BY rowid').all() as Array<{ data: string }>
  const shifts = database.prepare('SELECT data FROM calendar_entries ORDER BY rowid').all() as Array<{ data: string }>
  const initialized = database.prepare("SELECT value FROM app_metadata WHERE key = 'initialized'").get() as { value: string } | undefined
  return { initialized: initialized?.value === 'true', templates: readRows.map((row) => JSON.parse(row.data)), shifts: shifts.map((row) => JSON.parse(row.data)) }
}

function saveState(state: { templates: Array<{ id: string }>; shifts: Array<{ id: string }> }) {
  database.exec('BEGIN IMMEDIATE')
  try {
    database.exec('DELETE FROM shift_templates; DELETE FROM calendar_entries;')
    const insertTemplate = database.prepare('INSERT INTO shift_templates (id, data) VALUES (?, ?)')
    const insertShift = database.prepare('INSERT INTO calendar_entries (id, data) VALUES (?, ?)')
    for (const template of state.templates) insertTemplate.run(template.id, JSON.stringify(template))
    for (const shift of state.shifts) insertShift.run(shift.id, JSON.stringify(shift))
    database.prepare("INSERT INTO app_metadata (key, value) VALUES ('initialized', 'true') ON CONFLICT(key) DO UPDATE SET value = 'true'").run()
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function databaseApi(request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) {
  if (!request.url?.startsWith('/api/state')) return next()
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (request.method === 'GET') return response.end(JSON.stringify(readState()))
  if (request.method !== 'PUT') {
    response.statusCode = 405
    return response.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  let body = ''
  request.on?.('data', (chunk: Uint8Array) => { body += chunk.toString() })
  request.on?.('end', () => {
    try {
      const state = JSON.parse(body) as { templates: Array<{ id: string }>; shifts: Array<{ id: string }> }
      if (!Array.isArray(state.templates) || !Array.isArray(state.shifts) || [...state.templates, ...state.shifts].some((item) => !item || typeof item.id !== 'string')) {
        response.statusCode = 400
        response.end(JSON.stringify({ error: 'Invalid state' }))
        return
      }
      saveState(state)
      response.end(JSON.stringify({ ok: true }))
    } catch {
      response.statusCode = 400
      response.end(JSON.stringify({ error: 'Invalid state' }))
    }
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'muszaknaplo-sqlite-api',
    configureServer(server) { server.middlewares.use(databaseApi) },
    configurePreviewServer(server) { server.middlewares.use(databaseApi) },
  }],
})
