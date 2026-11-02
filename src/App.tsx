import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type EventRow = {
  id: string; title: string; description: string; starts_at: string
  location: string; price_cents: number; capacity: number
}
type Status = 'confirmed' | 'waitlist' | 'cancelled'

const btn = 'rounded-full bg-berry px-6 py-3 font-bold text-blush disabled:opacity-50'
const field = 'w-full rounded-xl border-2 border-rose bg-white px-4 py-3 text-berry'

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

type FeedbackRow = { id: string; kind: 'idea' | 'feedback'; message: string; created_at: string; profiles?: { display_name: string } | null }

function Ideas({ userId }: { userId: string }) {
  const [kind, setKind] = useState<'idea' | 'feedback'>('idea')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    setIsAdmin(!!me?.is_admin)
    const { data } = await supabase
      .from('feedback')
      .select('id,kind,message,created_at,profiles(display_name)')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as unknown as FeedbackRow[])
  }
  useEffect(() => { load() }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { error } = await supabase.from('feedback').insert({ user_id: userId, kind, message: message.trim() })
    if (error) setMsg('Das hat leider nicht geklappt. Bitte versuche es nochmal.')
    else { setMsg('Danke! Deine Nachricht ist bei SO Femme angekommen.'); setMessage(''); await load() }
    setBusy(false)
  }

  const label = (k: string) => (k === 'idea' ? 'Eventidee' : 'Feedback')

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Deine Stimme zählt.</h1>
      <p className="mt-4 text-lg">Welches Event wünschst du dir? Was können wir besser machen?</p>
      <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-white p-6">
        <div className="flex gap-3">
          {(['idea', 'feedback'] as const).map(k => (
            <button type="button" key={k} onClick={() => setKind(k)}
              className={'rounded-full border-2 border-berry px-5 py-2 font-bold ' + (kind === k ? 'bg-berry text-blush' : 'text-berry')}>
              {label(k)}
            </button>
          ))}
        </div>
        <textarea className={field + ' min-h-32'} maxLength={1000} required minLength={3}
          placeholder={kind === 'idea' ? 'Zum Beispiel: ein Töpferabend oder Brunch mit Vortrag …' : 'Was hat dir gefallen? Was fehlt dir?'}
          value={message} onChange={e => setMessage(e.target.value)} />
        <button className={btn} disabled={busy || message.trim().length < 3}>Absenden</button>
        {msg && <p role="status" className="text-sm font-bold">{msg}</p>}
      </form>

      {rows.length > 0 && (
        <section className="mt-10">
          <h2 className="text-4xl">{isAdmin ? 'Alle Nachrichten' : 'Deine Nachrichten'}</h2>
          <div className="mt-5 space-y-4">
            {rows.map(r => (
              <article key={r.id} className="rounded-2xl bg-white p-5">
                <p className="text-sm font-bold">
                  {label(r.kind)}
                  {isAdmin && r.profiles?.display_name ? ` von ${r.profiles.display_name}` : ''}
                  {' – '}{new Date(r.created_at).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{r.message}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<'events' | 'ideas'>('events')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) return null
  return (
    <>
      <Header onLogout={session ? () => supabase.auth.signOut() : undefined} />
      {session && (
        <nav className="mx-auto mt-4 flex max-w-2xl gap-3 px-5">
          {([['events', 'Events'], ['ideas', 'Ideen & Feedback']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k}
              className={'rounded-full border-2 border-berry px-5 py-2 font-bold ' + (tab === k ? 'bg-berry text-blush' : 'text-berry')}>
              {l}
            </button>
          ))}
        </nav>
      )}
      {session ? (tab === 'events' ? <Events userId={session.user.id} /> : <Ideas userId={session.user.id} />) : <Auth />}
    </>
  )
}
