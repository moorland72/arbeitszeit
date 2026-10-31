import { useEffect, useState, type FormEvent } from 'react'
import { languageNames, type Language } from './translations.ts'
import ShiftPlanner from './ShiftPlanner.tsx'
import './AuthGate.css'

type User = { id: string; username: string }

const authText: Record<Language, {
  title: string
  description: string
  username: string
  password: string
  login: string
  loggingIn: string
  invalid: string
  rateLimited: string
  unavailable: string
  loading: string
  noAccount: string
  logout: string
  sessionExpired: string
  language: string
}> = {
  hu: {
    title: 'Műszaknapló',
    description: 'Jelentkezz be a saját műszaknaplód megnyitásához.',
    username: 'Felhasználónév',
    password: 'Jelszó',
    login: 'Bejelentkezés',
    loggingIn: 'Bejelentkezés…',
    invalid: 'Hibás felhasználónév vagy jelszó.',
    rateLimited: 'Túl sok sikertelen próbálkozás. Próbáld újra később.',
    unavailable: 'A szerver nem érhető el. Frissítsd az oldalt, vagy próbáld később.',
    loading: 'Betöltés…',
    noAccount: 'Fiókot az alkalmazás rendszergazdája hozhat létre.',
    logout: 'Kijelentkezés',
    sessionExpired: 'A munkamenet lejárt. Jelentkezz be újra.',
    language: 'Nyelv',
  },
  de: {
    title: 'Schichtplaner',
    description: 'Melde dich an, um deinen persönlichen Dienstplan zu öffnen.',
    username: 'Benutzername',
    password: 'Passwort',
    login: 'Anmelden',
    loggingIn: 'Anmeldung…',
    invalid: 'Benutzername oder Passwort ist falsch.',
    rateLimited: 'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.',
    unavailable: 'Der Server ist nicht erreichbar. Lade die Seite neu oder versuche es später.',
    loading: 'Wird geladen…',
    noAccount: 'Konten können nur von der Administration erstellt werden.',
    logout: 'Abmelden',
    sessionExpired: 'Die Sitzung ist abgelaufen. Bitte erneut anmelden.',
    language: 'Sprache',
  },
  bs: {
    title: 'Planer smjena',
    description: 'Prijavite se da otvorite svoj raspored smjena.',
    username: 'Korisničko ime',
    password: 'Lozinka',
    login: 'Prijava',
    loggingIn: 'Prijava…',
    invalid: 'Korisničko ime ili lozinka nisu ispravni.',
    rateLimited: 'Previše neuspješnih pokušaja. Pokušajte kasnije.',
    unavailable: 'Server nije dostupan. Osvježite stranicu ili pokušajte kasnije.',
    loading: 'Učitavanje…',
    noAccount: 'Nalog može kreirati samo administrator.',
    logout: 'Odjava',
    sessionExpired: 'Sesija je istekla. Prijavite se ponovo.',
    language: 'Jezik',
  },
  en: {
    title: 'Shift Planner',
    description: 'Sign in to open your personal shift planner.',
    username: 'Username',
    password: 'Password',
    login: 'Sign in',
    loggingIn: 'Signing in…',
    invalid: 'Incorrect username or password.',
    rateLimited: 'Too many failed attempts. Please try again later.',
    unavailable: 'The server is unavailable. Reload the page or try again later.',
    loading: 'Loading…',
    noAccount: 'Only an administrator can create accounts.',
    logout: 'Sign out',
    sessionExpired: 'Your session expired. Please sign in again.',
    language: 'Language',
  },
}

function storedLanguage(): Language {
  const saved = localStorage.getItem('muszaknaplo-language')
  return saved === 'de' || saved === 'bs' || saved === 'en' ? saved : 'hu'
}

function AuthGate() {
  const [language, setLanguage] = useState(storedLanguage)
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const text = authText[language]

  useEffect(() => {
    let active = true
    async function checkSession() {
      try {
        const response = await fetch('/api/session')
        if (response.status === 401) return
        if (!response.ok) throw new Error('Session check failed')
        const result = await response.json() as { user: User }
        if (active) setUser(result.user)
      } catch {
        if (active) setError(authText[storedLanguage()].unavailable)
      } finally {
        if (active) setChecking(false)
      }
    }
    void checkSession()
    const handleExpired = () => {
      setUser(null)
      setError(authText[storedLanguage()].sessionExpired)
    }
    window.addEventListener('muszaknaplo-auth-expired', handleExpired)
    return () => {
      active = false
      window.removeEventListener('muszaknaplo-auth-expired', handleExpired)
    }
  }, [])

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (response.status === 401) {
        setError(text.invalid)
        return
      }
      if (response.status === 429) {
        setError(text.rateLimited)
        return
      }
      if (!response.ok) throw new Error('Login failed')
      const result = await response.json() as { user: User }
      setUser(result.user)
      setPassword('')
    } catch {
      setError(text.unavailable)
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout failed')
      setUser(null)
      setError('')
    } catch {
      setError(text.unavailable)
    }
  }

  if (user) {
    return <ShiftPlanner userId={user.id} username={user.username} onLogout={logout} logoutLabel={text.logout} />
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <label className="auth-language">
          <span>{text.language}</span>
          <select aria-label={text.language} value={language} onChange={(event) => {
            const nextLanguage = event.target.value as Language
            setLanguage(nextLanguage)
            localStorage.setItem('muszaknaplo-language', nextLanguage)
          }}>
            {(Object.keys(languageNames) as Language[]).map((code) => (
              <option value={code} key={code}>{languageNames[code]}</option>
            ))}
          </select>
        </label>
        <div className="auth-brand-mark" aria-hidden="true">M</div>
        <h1 id="auth-title">{text.title}</h1>
        <p className="auth-description">{text.description}</p>
        {checking ? <p className="auth-message" role="status">{text.loading}</p> : (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              <span>{text.username}</span>
              <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              <span>{text.password}</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>{submitting ? text.loggingIn : text.login}</button>
            <p className="auth-hint">{text.noAccount}</p>
          </form>
        )}
      </section>
    </main>
  )
}

export default AuthGate
