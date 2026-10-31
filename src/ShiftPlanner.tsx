import { useEffect, useState, type FormEvent } from 'react'
import ShiftCatalog, { DEFAULT_SHIFT_COLOR, type ShiftTemplate } from './ShiftCatalog.tsx'
import { deleteGoogleEvent, upsertGoogleEvent } from './googleCalendar.ts'
import { createTranslator, languageNames, localeByLanguage, translations, type Language } from './translations.ts'
import { createId } from './createId.ts'
import './ShiftPlanner.css'

type Shift = {
  id: string
  date: string
  templateId?: string
  start: string
  end: string
  pauseMinutes: number
  hours: number
  countsTowardTotal: boolean
  googleEventId?: string
  name: string
  abbreviation: string
  color: string
  location: string
}

type ShiftForm = { date: string; templateId: string }

const STORAGE_KEY = 'muszaknaplo-shifts'
const TEMPLATE_STORAGE_KEY = 'muszaknaplo-templates'
const GOOGLE_DELETE_STORAGE_KEY = 'muszaknaplo-google-deletions'
const LANGUAGE_STORAGE_KEY = 'muszaknaplo-language'
const THEME_STORAGE_KEY = 'muszaknaplo-theme'
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function durationHours(start: string, end: string, pauseMinutes = 0) {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  let minutes = endHour * 60 + endMinute - startHour * 60 - startMinute
  if (minutes <= 0) minutes += 24 * 60
  return Math.max(0, minutes - pauseMinutes) / 60
}

function contrastColor(hex: string) {
  const value = hex.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(value)) return '#252a25'
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  return luminance > 0.42 ? '#252a25' : '#ffffff'
}

function templatesFromShifts(shifts: Shift[]): ShiftTemplate[] {
  const templates = new Map<string, ShiftTemplate>()
  for (const shift of shifts) {
    const pauseMinutes = shift.pauseMinutes ?? 0
    const key = JSON.stringify([shift.name, shift.abbreviation, shift.start, shift.end, pauseMinutes, shift.hours, shift.countsTowardTotal, shift.location])
    if (!templates.has(key)) {
      templates.set(key, {
        id: createId(),
        name: shift.name,
        abbreviation: shift.abbreviation,
        color: shift.color ?? DEFAULT_SHIFT_COLOR,
        start: shift.start,
        end: shift.end,
        pauseMinutes,
        hours: shift.hours ?? durationHours(shift.start, shift.end, pauseMinutes),
        countsTowardTotal: shift.countsTowardTotal ?? true,
        location: shift.location,
        active: true,
      })
    }
  }
  return [...templates.values()]
}

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function foldCalendarLine(line: string) {
  const encoder = new TextEncoder()
  const chunks: string[] = []
  let chunk = ''
  let bytes = 0
  for (const character of line) {
    const size = encoder.encode(character).length
    if (bytes + size > 75) {
      chunks.push(chunk)
      chunk = ' '
      bytes = 1
    }
    chunk += character
    bytes += size
  }
  chunks.push(chunk)
  return chunks.join('\r\n')
}

function makeCalendar(shifts: Shift[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const eventLines = shifts
    .slice()
    .sort((first, second) => `${first.date}T${first.start}`.localeCompare(`${second.date}T${second.start}`))
    .flatMap((shift) => {
      const start = new Date(`${shift.date}T${shift.start}:00`)
      const end = new Date(`${shift.date}T${shift.end}:00`)
      if (end <= start) end.setDate(end.getDate() + 1)
      const lines = [
        'BEGIN:VEVENT',
        `UID:${shift.id}@muszaknaplo.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `DTEND:${end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `SUMMARY:${escapeCalendarText(`${shift.name}${shift.abbreviation ? ` (${shift.abbreviation})` : ''}`)}`,
      ]
      if (shift.location) lines.push(`LOCATION:${escapeCalendarText(shift.location)}`)
      lines.push('END:VEVENT')
      return lines
    })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Muszaknaplo//HU',
    'CALSCALE:GREGORIAN',
    ...eventLines,
    'END:VCALENDAR',
  ].map(foldCalendarLine).join('\r\n') + '\r\n'
}

function App() {
  const [shifts, setShifts] = useState<Shift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return []
      return (JSON.parse(saved) as Array<Partial<Shift> & { role?: string }>).map((shift) => {
        const start = shift.start ?? '09:00'
        const end = shift.end ?? '17:00'
        const pauseMinutes = shift.pauseMinutes ?? 0
        return {
          ...shift,
          start,
          end,
          pauseMinutes,
          name: shift.name ?? shift.role ?? '',
          abbreviation: shift.abbreviation ?? '',
          color: shift.color ?? DEFAULT_SHIFT_COLOR,
          hours: shift.hours ?? durationHours(start, end, pauseMinutes),
          countsTowardTotal: shift.countsTowardTotal ?? true,
        } as Shift
      })
    } catch {
      return []
    }
  })
  const [templates, setTemplates] = useState<ShiftTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      return saved
        ? (JSON.parse(saved) as Array<ShiftTemplate & { color?: string; hours?: number }>).map((template) => ({
            ...template,
            pauseMinutes: template.pauseMinutes ?? 0,
            color: template.color ?? DEFAULT_SHIFT_COLOR,
            hours: template.hours ?? durationHours(template.start, template.end, template.pauseMinutes ?? 0),
            countsTowardTotal: template.countsTowardTotal ?? true,
            active: template.active ?? true,
          }))
        : templatesFromShifts(shifts)
    } catch {
      return templatesFromShifts(shifts)
    }
  })
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return saved === 'de' || saved === 'bs' || saved === 'en' ? saved : 'hu'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light')
  const [storageReady, setStorageReady] = useState(false)
  const [sqliteAvailable, setSqliteAvailable] = useState(false)
  const [storageStatus, setStorageStatus] = useState('')
  const t = createTranslator(language)
  const locale = localeByLanguage[language]
  const [view, setView] = useState<'schedule' | 'catalog' | 'settings'>('schedule')
  const [googleReady, setGoogleReady] = useState(() => Boolean(window.google))
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)
  const [googleStatus, setGoogleStatus] = useState('')
  const [googleSyncing, setGoogleSyncing] = useState(false)
  const [deletedGoogleEventIds, setDeletedGoogleEventIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(GOOGLE_DELETE_STORAGE_KEY) ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1, 12)
  })
  const [todayKey, setTodayKey] = useState(() => dateKey(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ShiftForm>(() => ({
    date: dateKey(new Date()),
    templateId: templates.find((template) => template.active)?.id ?? '',
  }))

  useEffect(() => {
    let cancelled = false
    async function loadDatabase() {
      try {
        const response = await fetch('/api/state')
        if (!response.ok) throw new Error('SQLite-adatbázis nem érhető el.')
        const state = await response.json() as { initialized: boolean; shifts: Shift[]; templates: ShiftTemplate[] }
        if (cancelled) return
        if (state.initialized) {
          setShifts(state.shifts.map((shift) => ({ ...shift, pauseMinutes: shift.pauseMinutes ?? 0 })))
          setTemplates(state.templates.map((template) => ({ ...template, pauseMinutes: template.pauseMinutes ?? 0 })))
        } else {
          const migration = await fetch('/api/state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shifts, templates }),
          })
          if (!migration.ok) throw new Error('A korábbi adatok átvitele nem sikerült.')
        }
        setSqliteAvailable(true)
        setStorageStatus('A műszakok és beosztások SQLite-adatbázisba mentődnek.')
      } catch (error) {
        if (!cancelled) setStorageStatus(error instanceof Error ? `${error.message} A böngésző helyi mentése továbbra is aktív.` : 'SQLite-adatbázis nem érhető el.')
      } finally {
        if (!cancelled) setStorageReady(true)
      }
    }
    void loadDatabase()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!storageReady) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts))
  }, [shifts, storageReady])

  useEffect(() => {
    if (!storageReady) return
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
  }, [templates, storageReady])

  useEffect(() => {
    if (!storageReady || !sqliteAvailable) return
    const timeout = window.setTimeout(() => {
      void fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shifts, templates }),
      }).then((response) => {
        if (!response.ok) throw new Error('SQLite-mentés sikertelen.')
      }).catch((error: unknown) => {
        setStorageStatus(error instanceof Error ? `${error.message} A böngésző helyi mentése továbbra is aktív.` : 'SQLite-mentés sikertelen.')
        setSqliteAvailable(false)
      })
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [shifts, templates, storageReady, sqliteAvailable])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    localStorage.setItem(GOOGLE_DELETE_STORAGE_KEY, JSON.stringify(deletedGoogleEventIds))
  }, [deletedGoogleEventIds])

  useEffect(() => {
    if (window.google) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => setGoogleReady(Boolean(window.google))
    script.onerror = () => setGoogleStatus(translations[language].googleLoadError)
    document.head.append(script)
    return () => script.remove()
  }, [language])

  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12)
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(1 - ((monthStart.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart)
    day.setDate(calendarStart.getDate() + index)
    return day
  })
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12)
  const monthShifts = shifts
    .filter((shift) => shift.date >= dateKey(monthStart) && shift.date <= dateKey(monthEnd))
    .sort((first, second) => `${first.date}T${first.start}`.localeCompare(`${second.date}T${second.start}`))
  const countedWorkShifts = monthShifts.filter((shift) => shift.countsTowardTotal && shift.hours > 0)
  const totalHours = countedWorkShifts.reduce((total, shift) => total + shift.hours, 0)
  const monthLegend = templates.filter((template) => monthShifts.some((shift) =>
    shift.templateId === template.id || (!shift.templateId && shift.name === template.name && shift.start === template.start && shift.end === template.end),
  ))
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(monthStart)
  const selectedTemplateId = templates.some((template) => template.id === form.templateId && (template.active || editingId !== null))
    ? form.templateId
    : templates.find((template) => template.active)?.id ?? ''
  const availableTemplates = templates.filter((template) => template.active || (editingId !== null && template.id === selectedTemplateId))

  function resetForm() {
    setForm({ date: form.date, templateId: templates.find((template) => template.active)?.id ?? '' })
    setEditingId(null)
  }

  function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const template = templates.find((item) => item.id === selectedTemplateId)
    if (!template) return
    const values = { ...template, date: form.date, templateId: template.id }
    if (editingId) {
      setShifts((current) => current.map((shift) => shift.id === editingId ? { ...shift, ...values } : shift))
    } else {
      setShifts((current) => [...current, { ...values, id: createId() }])
    }
    resetForm()
  }

  function saveTemplate(template: ShiftTemplate) {
    setTemplates((current) => current.some((item) => item.id === template.id)
      ? current.map((item) => item.id === template.id ? template : item)
      : [...current, template])
    setShifts((current) => current.map((shift) => shift.templateId === template.id ? { ...shift, ...template, id: shift.id } : shift))
  }

  function removeShift(id: string) {
    const shift = shifts.find((item) => item.id === id)
    if (shift?.googleEventId) {
      setDeletedGoogleEventIds((current) => current.includes(shift.googleEventId!) ? current : [...current, shift.googleEventId!])
    }
    setShifts((current) => current.filter((item) => item.id !== id))
    if (editingId === id) resetForm()
  }

  function connectGoogleCalendar() {
    if (!GOOGLE_CLIENT_ID || !window.google) {
      setGoogleStatus(t('googleSetupMissing'))
      return
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          setGoogleStatus(response.error_description ?? t('googleAuthError'))
          return
        }
        setGoogleAccessToken(response.access_token)
        setGoogleStatus(t('googleConnected'))
      },
    })
    tokenClient.requestAccessToken()
  }

  async function syncGoogleCalendar() {
    if (!googleAccessToken || googleSyncing) return
    setGoogleSyncing(true)
    setGoogleStatus(t('googleSyncRunning'))
    try {
      for (const eventId of deletedGoogleEventIds) {
        await deleteGoogleEvent(googleAccessToken, eventId)
      }
      for (const shift of shifts) {
        const googleEventId = await upsertGoogleEvent(googleAccessToken, shift)
        setShifts((current) => current.map((item) => item.id === shift.id ? { ...item, googleEventId } : item))
      }
      setDeletedGoogleEventIds([])
      setGoogleStatus(t('googleSyncDone', { count: shifts.length }))
    } catch (error) {
      setGoogleStatus(error instanceof Error ? error.message : t('googleSyncError'))
      setGoogleAccessToken(null)
    } finally {
      setGoogleSyncing(false)
    }
  }

  function disconnectGoogleCalendar() {
    if (googleAccessToken) window.google?.accounts.oauth2.revoke(googleAccessToken)
    setGoogleAccessToken(null)
    setGoogleStatus(t('googleDisconnected'))
  }

  function deleteTemplate(id: string) {
    setTemplates((current) => current.filter((template) => template.id !== id))
  }

  function editShift(shift: Shift) {
    const template = templates.find((item) => item.id === shift.templateId)
      ?? templates.find((item) => item.name === shift.name && item.start === shift.start && item.end === shift.end)
    setEditingId(shift.id)
    setForm({ date: shift.date, templateId: template?.id ?? '' })
  }

  function exportIcs() {
    if (!shifts.length) return
    const file = new Blob([makeCalendar(shifts)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'muszakbeosztas.ics'
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Műszaknapló">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>MŰSZAKNAPLÓ</span>
        </a>
        <nav className="main-nav" aria-label={t('mainMenu')}>
          <button type="button" className={view === 'schedule' ? 'active' : ''} aria-pressed={view === 'schedule'} onClick={() => setView('schedule')}>{t('schedule')}</button>
          <button type="button" className={view === 'catalog' ? 'active' : ''} aria-pressed={view === 'catalog'} onClick={() => setView('catalog')}>{t('templates')}</button>
          <button type="button" className={view === 'settings' ? 'active' : ''} aria-pressed={view === 'settings'} onClick={() => setView('settings')}>{t('settings')}</button>
        </nav>
        <button className="export-button" type="button" onClick={exportIcs} disabled={!shifts.length}>
          {t('downloadIcs')} <span aria-hidden="true">↓</span>
        </button>
        <button className="pdf-button" type="button" onClick={() => window.print()} aria-label={t('savePdf')}>{t('savePdf')} <span aria-hidden="true">↗</span></button>
        {googleAccessToken
          ? <div className="google-actions">
              <button className="google-button" type="button" onClick={syncGoogleCalendar} disabled={googleSyncing}>{googleSyncing ? t('googleSyncing') : t('googleSync')}</button>
              <button className="google-disconnect" type="button" onClick={disconnectGoogleCalendar} aria-label={t('googleDisconnect')}>×</button>
            </div>
          : <button className="google-button" type="button" onClick={connectGoogleCalendar} disabled={!GOOGLE_CLIENT_ID || !googleReady}>{t('googleConnect')}</button>}
      </header>

      {googleStatus && <p className="google-status" role="status" aria-live="polite">{googleStatus}</p>}
      {!GOOGLE_CLIENT_ID && <p className="google-status setup-status">{t('googleSetupMissing')}</p>}
      {storageStatus && <p className="google-status" role="status" aria-live="polite">{storageStatus}</p>}

      <main id="top">
        {view === 'settings' ? <section className="settings-view" aria-labelledby="settings-title">
          <div className="settings-intro"><div><p className="eyebrow">{t('settings')}</p><h1 id="settings-title">{t('settingsTitle')}</h1></div><p className="intro-note">{t('settingsHelp')}</p></div>
          <div className="settings-form">
            <label className="field"><span>{t('language')}</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              {(Object.keys(languageNames) as Language[]).map((code) => <option value={code} key={code}>{languageNames[code]}</option>)}
            </select></label>
            <label className="field"><span>{t('theme')}</span><select value={theme} onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}>
              <option value="light">{t('lightTheme')}</option><option value="dark">{t('darkTheme')}</option>
            </select></label>
          </div>
        </section> : view === 'catalog' ? <ShiftCatalog templates={templates} onSave={saveTemplate} onDelete={deleteTemplate} t={t} locale={locale} language={language} /> : <>
        <section className="intro">
          <div><p className="eyebrow">{t('introEyebrow')}</p><h1>{t('introTitle')}</h1></div>
          <p className="intro-note">{t('localNotice')}</p>
        </section>

        <section className="week-summary" aria-label={t('monthlySummary')}>
          <div className="summary-item"><span className="summary-label">{t('countedShifts')}</span><strong>{countedWorkShifts.length}</strong></div>
          <div className="summary-item"><span className="summary-label">{t('plannedHours')}</span><strong>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(totalHours)}<small> {t('hoursUnit')}</small></strong></div>
          <div className="summary-week"><span className="summary-label">{t('selectedMonth')}</span><strong>{monthLabel}</strong></div>
        </section>

        <div className="print-report-heading"><strong>Műszaknapló</strong><span>{monthLabel}</span></div>

        <div className="workspace-grid">
          <section className="entry-section" aria-labelledby="entry-title">
            <div className="section-heading"><span className="section-index">01</span><h2 id="entry-title">{editingId ? t('editShift') : t('newShift')}</h2></div>
            <form className="shift-form" onSubmit={saveShift}>
              <div className="selected-date field-wide"><span>{t('selectedDay')}</span><strong>{new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${form.date}T12:00:00`))}</strong></div>
              <label className="field field-wide"><span>{t('chooseShift')}</span><select required value={selectedTemplateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })} disabled={!availableTemplates.length}>
                <option value="" disabled>{t('chooseTemplate')}</option>
                {availableTemplates.map((template) => <option value={template.id} key={template.id}>{template.name}{template.abbreviation ? ` (${template.abbreviation})` : ''} · {template.start}–{template.end}{!template.active ? ` · ${t('inactive')}` : ''}</option>)}
              </select></label>
              {!templates.length && <button className="catalog-link field-wide" type="button" onClick={() => setView('catalog')}>{t('addTemplateFirst')}</button>}
              <div className="form-actions field-wide">
                {editingId && <button className="cancel-button" type="button" onClick={resetForm}>{t('cancel')}</button>}
                <button className="save-button" type="submit" disabled={!availableTemplates.length}>{editingId ? t('saveChanges') : t('insertShift')} <span aria-hidden="true">＋</span></button>
              </div>
            </form>
            <section className="workday-list" aria-labelledby="workday-list-title">
              <div className="workday-heading"><h3 id="workday-list-title">{t('workdays')}</h3><span>{countedWorkShifts.length}</span></div>
              {countedWorkShifts.length ? <div className="workday-rows">{countedWorkShifts.map((shift) => (
                <article className="workday-row" key={shift.id}>
                  <time dateTime={shift.date}>{new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(`${shift.date}T12:00:00`))}</time>
                  <strong>{shift.name}{shift.abbreviation && <small className="shift-abbreviation">{shift.abbreviation}</small>}</strong>
                  <span>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(shift.hours)} {t('hoursUnit')}</span>
                </article>
              ))}</div> : <p className="workday-empty">{t('noWorkdays')}</p>}
              <div className="workday-total"><span>{t('totalWorkHours')}</span><strong>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(totalHours)} {t('hoursUnit')}</strong></div>
            </section>
          </section>

          <section className="schedule-section" aria-labelledby="schedule-title">
            <div className="section-heading schedule-heading"><span className="section-index">02</span><h2 id="schedule-title">{t('calendar')}</h2>
              <div className="week-controls" aria-label={t('selectedMonth')}>
                <button type="button" onClick={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1, 12))} aria-label={t('previousMonth')}>←</button>
                <button type="button" onClick={() => { const today = new Date(); setTodayKey(dateKey(today)); setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1, 12)); setForm((current) => ({ ...current, date: dateKey(today) })) }}>{t('today')}</button>
                <button type="button" onClick={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1, 12))} aria-label={t('nextMonth')}>→</button>
              </div>
            </div>
            <div className="calendar-month-label">{monthLabel}</div>
            <div className="calendar-weekdays" aria-hidden="true">{days.slice(0, 7).map((day) => <span key={dateKey(day)}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day).replace('.', '')}</span>)}</div>
            <div className="month-grid">
              {days.map((day) => {
                const key = dateKey(day)
                const dayShifts = monthShifts.filter((shift) => shift.date === key)
                const outsideMonth = day.getMonth() !== monthDate.getMonth()
                const weekend = day.getDay() === 0 || day.getDay() === 6
                return <div className={`calendar-cell${key === todayKey ? ' is-today' : ''}${key === form.date ? ' is-selected' : ''}${weekend ? ' is-weekend' : ''}${outsideMonth ? ' outside-month' : ''}`} key={key}>
                  <button className="calendar-date" type="button" onClick={() => { setEditingId(null); setForm((current) => ({ ...current, date: key })); if (outsideMonth) setMonthDate(new Date(day.getFullYear(), day.getMonth(), 1, 12)) }} aria-label={t('selectDay', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(day) })} aria-pressed={key === form.date}>{day.getDate()}</button>
                  <div className="calendar-events">{dayShifts.map((shift) => <div className="calendar-event" key={shift.id} style={{ backgroundColor: shift.color, color: contrastColor(shift.color) }}>
                    <button className="calendar-event-name" type="button" onClick={() => editShift(shift)} title={`${shift.name} · ${shift.start}–${shift.end}`}>{shift.abbreviation || shift.name}<span>{shift.start}</span></button>
                    <button className="calendar-event-delete" type="button" onClick={() => removeShift(shift.id)} aria-label={t('deleteShift', { name: shift.name })}>×</button>
                  </div>)}</div>
                </div>
              })}
            </div>
            {monthLegend.length > 0 && <section className="shift-legend" aria-labelledby="shift-legend-title">
              <h3 id="shift-legend-title">{t('legend')}</h3>
              <div className="shift-legend-items">{monthLegend.map((template) => (
                <div className="shift-legend-item" key={template.id}>
                  <span className="shift-legend-swatch" style={{ backgroundColor: template.color }} aria-hidden="true" />
                  <span>{template.name}{template.abbreviation && ` (${template.abbreviation})`}</span>
                </div>
              ))}</div>
            </section>}
          </section>
        </div>
        </>}
      </main>
      <footer className="footer-note"><span>Helyi mentés</span><span>·</span><span>Az ICS-fájl az összes felvitt műszakot tartalmazza</span></footer>
    </div>
  )
}

export default App
