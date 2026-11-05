import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type EventRow = {
  id: string; title: string; description: string; starts_at: string
  location: string; price_cents: number; capacity: number; image_url: string | null
}
type Status = 'confirmed' | 'waitlist' | 'cancelled'

import { btn, field, pill } from './ui'
import Profile from './Profile'
import MyEvents from './MyEvents'
import Admin from './Admin'
import Ideas from './Ideas'
import { downloadIcs } from './ics'
import { Imprint, Privacy } from './Legal'

function Header({ onLogout }: { onLogout?: () => void }) {
  return (
    <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-6">
      <img src="/logo.png" alt="SO Femme" className="h-16 w-16 rounded-full" />
      {onLogout && <button onClick={onLogout} className="font-bold underline">Abmelden</button>}
    </header>
  )
}

function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg(''); setBusy(true)
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { display_name: name } },
      })
      setMsg(error ? error.message : 'Fast geschafft! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg('E-Mail oder Passwort stimmen nicht.')
    }
    setBusy(false)
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-6xl">{mode === 'login' ? 'Willkommen zurück.' : 'Sei dabei.'}</h1>
      <p className="mt-4 text-lg">Das digitale Zuhause der SO Femme Community.</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-white p-6">
        {mode === 'register' && (
          <input className={field} placeholder="Dein Name" value={name} onChange={e => setName(e.target.value)} required />
        )}
        <input className={field} type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className={field} type="password" placeholder="Passwort (mind. 8 Zeichen)" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
        {mode === 'register' && (
          <label className="flex gap-3 text-sm">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required className="mt-1" />
            <span>Ich bin mindestens 18 Jahre alt und stimme der Datenschutzerklärung zu.</span>
          </label>
        )}
        <button className={btn + ' w-full'} disabled={busy || (mode === 'register' && !agreed)}>
          {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </button>
        {msg && <p role="status" className="text-sm font-bold">{msg}</p>}
      </form>
      <button className="mt-5 font-bold underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg('') }}>
        {mode === 'login' ? 'Noch kein Konto? Jetzt registrieren' : 'Schon dabei? Zur Anmeldung'}
      </button>
    </main>
  )
}

function Events({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [spots, setSpots] = useState<Record<string, number>>({})
  const [mine, setMine] = useState<Record<string, Status>>({})
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data: ev } = await supabase.from('events').select('*').order('starts_at')
    const list = (ev ?? []) as EventRow[]
    setEvents(list)
    const counts: Record<string, number> = {}
    for (const e of list) {
      const { data } = await supabase.rpc('spots_left', { p_event_id: e.id })
      counts[e.id] = data ?? 0
    }
    setSpots(counts)
    const { data: regs } = await supabase.from('registrations').select('event_id,status').eq('user_id', userId)
    const m: Record<string, Status> = {}
    for (const r of regs ?? []) m[r.event_id] = r.status as Status
    setMine(m)
  }
  useEffect(() => { load() }, [])

  async function act(id: string, fn: 'register_for_event' | 'cancel_registration') {
    setBusyId(id); setError('')
    const { error } = await supabase.rpc(fn, { p_event_id: id })
    if (error) setError('Das hat leider nicht geklappt. Bitte versuche es nochmal.')
    await load()
    setBusyId('')
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna',
  }) + ' Uhr'
  const price = (c: number) => c === 0 ? 'Kostenlos' : (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Kommende Events</h1>
      {error && <p role="alert" className="mt-4 font-bold">{error}</p>}
      {events.length === 0 && <p className="mt-6 text-lg">Aktuell sind keine Events geplant. Schau bald wieder vorbei.</p>}
      <div className="mt-8 space-y-6">
        {events.map(e => {
          const s = mine[e.id]
          const left = spots[e.id] ?? 0
          return (
            <article key={e.id} className="rounded-2xl bg-white p-6">
              {e.image_url && <img src={e.image_url} alt="" className="mb-4 aspect-[4/3] w-full rounded-xl object-cover" />}
              <h2 className="text-4xl">{e.title}</h2>
              <p className="mt-3 font-bold">{fmt(e.starts_at)}</p>
              <p>{e.location} · {price(e.price_cents)}</p>
              {e.description && <p className="mt-3">{e.description}</p>}
              <p className="mt-3 text-sm font-bold">
                {left > 0 ? `Noch ${left} von ${e.capacity} Plätzen frei` : 'Ausgebucht – Warteliste möglich'}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                {(!s || s === 'cancelled') ? (
                  <button className={btn} disabled={busyId === e.id} onClick={() => act(e.id, 'register_for_event')}>
                    {left > 0 ? 'Jetzt anmelden' : 'Auf die Warteliste'}
                  </button>
                ) : (
                  <>
                    <span className="rounded-full bg-blush px-4 py-2 font-bold">
                      {s === 'confirmed' ? 'Du bist angemeldet ✓' : 'Du stehst auf der Warteliste'}
                    </span>
                    {s === 'confirmed' && <button className="font-bold underline" onClick={() => downloadIcs(e)}>Im Kalender speichern</button>}
                    <button className="font-bold underline" disabled={busyId === e.id} onClick={() => act(e.id, 'cancel_registration')}>
                      Stornieren
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}

function Banner() {
  const [news, setNews] = useState<{ message: string; is_active: boolean } | null>(null)
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    supabase.from('site_news').select('message,is_active').eq('id', 1).maybeSingle().then(({ data }) => setNews(data))
  }, [])
  if (!news || !news.is_active || !news.message || hidden) return null
  return (
    <div className="mx-auto mt-4 max-w-2xl px-5">
      <div role="status" className="flex items-start justify-between gap-4 rounded-2xl bg-berry px-5 py-4 text-blush">
        <p className="font-bold">{news.message}</p>
        <button onClick={() => setHidden(true)} aria-label="Schließen" className="text-xl font-bold leading-none">×</button>
      </div>
    </div>
  )
}

type Page = 'events' | 'mine' | 'ideas' | 'profile' | 'admin' | 'privacy' | 'imprint'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [page, setPage] = useState<Page>('events')
  const [last, setLast] = useState<Page>('events')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  useEffect(() => {
    if (!uid) { setIsAdmin(false); return }
    supabase.from('profiles').select('is_admin').eq('id', uid).single().then(({ data }) => setIsAdmin(!!data?.is_admin))
  }, [uid])

  if (!ready) return null

  const tabs: [Page, string][] = [['events', 'Events'], ['mine', 'Meine Events'], ['ideas', 'Ideen & Feedback'], ['profile', 'Profil']]
  if (isAdmin) tabs.push(['admin', 'Admin'])
  const open = (p: Page) => { if (p !== 'privacy' && p !== 'imprint') setLast(p); setPage(p) }
  const legal = page === 'privacy' || page === 'imprint'

  let body
  if (page === 'privacy') body = <Privacy onBack={() => setPage(last)} />
  else if (page === 'imprint') body = <Imprint onBack={() => setPage(last)} />
  else if (!uid) body = <Auth />
  else if (page === 'mine') body = <MyEvents userId={uid} />
  else if (page === 'ideas') body = <Ideas userId={uid} />
  else if (page === 'profile') body = <Profile userId={uid} onDeleted={() => { setPage('events'); setLast('events') }} />
  else if (page === 'admin' && isAdmin) body = <Admin />
  else body = <Events userId={uid} />

  return (
    <>
      <Header onLogout={session ? () => supabase.auth.signOut() : undefined} />
      {uid && !legal && (
        <nav className="mx-auto mt-4 flex max-w-2xl flex-wrap gap-2 px-5">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => open(k)} aria-current={page === k} className={pill(page === k)}>{l}</button>
          ))}
        </nav>
      )}
      {uid && !legal && <Banner />}
      {body}
      <footer className="mx-auto max-w-2xl px-5 pb-10 pt-4 text-sm font-bold">
        <button className="underline" onClick={() => setPage('privacy')}>Datenschutz</button>
        <span className="mx-3">·</span>
        <button className="underline" onClick={() => setPage('imprint')}>Impressum</button>
      </footer>
    </>
  )
}
