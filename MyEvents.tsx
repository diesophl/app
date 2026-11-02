import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { card } from './ui'

type Row = { status: string; events: { id: string; title: string; starts_at: string; location: string; price_cents: number } }

export default function MyEvents({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    supabase.from('registrations').select('status, events(id,title,starts_at,location,price_cents)')
      .eq('user_id', userId).neq('status', 'cancelled')
      .then(({ data }) => setRows(((data ?? []) as unknown as Row[]).filter(r => r.events)))
  }, [])

  if (!rows) return null
  const now = Date.now()
  const upcoming = rows.filter(r => new Date(r.events.starts_at).getTime() >= now)
    .sort((a, b) => a.events.starts_at.localeCompare(b.events.starts_at))
  const past = rows.filter(r => new Date(r.events.starts_at).getTime() < now)
    .sort((a, b) => b.events.starts_at.localeCompare(a.events.starts_at))
  const fmt = (iso: string) => new Date(iso).toLocaleString('de-AT', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna',
  })
  const List = ({ items }: { items: Row[] }) => (
    <div className="mt-4 space-y-4">
      {items.map(r => (
        <article key={r.events.id} className={card}>
          <h3 className="text-3xl">{r.events.title}</h3>
          <p className="mt-2 font-bold">{fmt(r.events.starts_at)} Uhr</p>
          <p>{r.events.location}</p>
          <p className="mt-2 text-sm font-bold">{r.status === 'waitlist' ? 'Auf der Warteliste' : 'Angemeldet ✓'}</p>
        </article>
      ))}
    </div>
  )
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Meine Events</h1>
      <h2 className="mt-8 text-4xl">Bevorstehend</h2>
      {upcoming.length ? <List items={upcoming} /> : <p className="mt-3 text-lg">Du bist noch für kein Event angemeldet. Schau bei „Events“ vorbei.</p>}
      <h2 className="mt-10 text-4xl">Vergangen</h2>
      {past.length ? <List items={past} /> : <p className="mt-3 text-lg">Hier erscheinen die Events, bei denen du dabei warst.</p>}
    </main>
  )
}
