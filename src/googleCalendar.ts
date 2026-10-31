export type GoogleCalendarShift = {
  id: string
  googleEventId?: string
  date: string
  start: string
  end: string
  name: string
  abbreviation: string
  location: string
  color: string
}

const API_BASE = 'https://www.googleapis.com/calendar/v3'
const GOOGLE_EVENT_COLORS = {
  '1': '#a4bdfc',
  '2': '#7ae7bf',
  '3': '#dbadff',
  '4': '#ff887c',
  '5': '#fbd75b',
  '6': '#ffb878',
  '7': '#46d6db',
  '8': '#e1e1e1',
  '9': '#5484ed',
  '10': '#51b749',
  '11': '#dc2127',
} as const

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message ?? `Google Calendar API hiba (${response.status})`)
  }
  return response.json() as Promise<T>
}

function colorDistance(first: string, second: string) {
  const firstHex = first.replace('#', '')
  const secondHex = second.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(firstHex) || !/^[\da-f]{6}$/i.test(secondHex)) return Number.POSITIVE_INFINITY
  return [0, 2, 4].reduce((total, index) => {
    const difference = Number.parseInt(firstHex.slice(index, index + 2), 16) - Number.parseInt(secondHex.slice(index, index + 2), 16)
    return total + difference * difference
  }, 0)
}

function closestColorId(color: string) {
  let closestId: string | undefined
  let closestDistance = Number.POSITIVE_INFINITY
  for (const [id, background] of Object.entries(GOOGLE_EVENT_COLORS)) {
    const distance = colorDistance(color, background)
    if (distance < closestDistance) {
      closestId = id
      closestDistance = distance
    }
  }
  return closestId
}

function eventBody(shift: GoogleCalendarShift) {
  const start = new Date(`${shift.date}T${shift.start}:00`)
  const end = new Date(`${shift.date}T${shift.end}:00`)
  if (end <= start) end.setDate(end.getDate() + 1)
  const colorId = closestColorId(shift.color)

  return {
    summary: `${shift.name}${shift.abbreviation ? ` (${shift.abbreviation})` : ''}`,
    location: shift.location || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    ...(colorId ? { colorId } : {}),
    extendedProperties: { private: { muszaknaploShiftId: shift.id } },
  }
}

export async function upsertGoogleEvent(accessToken: string, shift: GoogleCalendarShift) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
  const body = JSON.stringify(eventBody(shift))

  if (shift.googleEventId) {
    const response = await fetch(`${API_BASE}/calendars/primary/events/${encodeURIComponent(shift.googleEventId)}`, {
      method: 'PATCH',
      headers,
      body,
    })
    if (response.status !== 404) {
      const event = await readResponse<{ id: string }>(response)
      return event.id
    }
  }

  const response = await fetch(`${API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers,
    body,
  })
  const event = await readResponse<{ id: string }>(response)
  return event.id
}

export async function deleteGoogleEvent(accessToken: string, eventId: string) {
  const response = await fetch(`${API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    await readResponse(response)
  }
}