import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { btn, field, card } from './ui'

type Ev = { id: string; title: string; description: string; starts_at: string; location: string; price_cents: number; capacity: number; is_published: boolean }
type Part = { registration_id: string; display_name: string; email: string; status: string; created_at: string }
const empty = { title: '', description: '', starts_at: '', location: '', price: '0', capacity: '10', is_published: true }
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const label = (s: string) => (s === 'confirmed' ? 'Angemeldet' : s === 'waitlist' ? 'Warteliste' : 'Storniert')

export default function Admin() {
  const [events, setEvents] = useState<Ev[]>([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [openId, setOpenId] = useState('')
  const [parts, setParts] = useState<Part[]>([])
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase.from('events').select('*').order('starts_at', { ascending: false })
    setEvents((data ?? []) as Ev[])
  }
  useEffect(() => { load() }, [])

  function edit(e: Ev) {
    setEditId(e.id); setShowForm(true)
    setForm({ title: e.title, description: e.description ?? '', starts_at: toLocal(e.starts_at), location: e.location,
      price: String(e.price_cents / 100), capacity: String(e.capacity), is_published: e.is_published })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function save(ev: FormEvent) {
    ev.preventDefault(); setMsg('')
    const payload = {
      title: form.title.trim(), description: form.description.trim(), location: form.location.trim(),
      starts_at: new Date(form.starts_at).toISOString(),
      price_cents: Math.round(parseFloat(form.price.replace(',', '.') || '0') * 100),
      capacity: parseInt(form.capacity, 10), is_published: form.is_published,
    }
    const { error } = editId
      ? await supabase.from('events').update(payload).eq('id', editId)
      : await supabase.from('events').insert(payload)
    if (error) { setMsg('Speichern hat nicht geklappt. Prüfe bitte alle Felder.'); return }
    setMsg('Gespeichert.'); setForm(empty); setEditId(null); setShowForm(false); load()
  }

  async function remove(e: Ev) {
    if (!confirm(`„${e.title}“ samt allen Anmeldungen löschen?`)) return
    await supabase.from('events').delete().eq('id', e.id); load()
  }

  async function loadParts(id: string) {
    const { data } = await supabase.rpc('admin_event_participants', { p_event_id: id })
    setParts((data ?? []) as Part[])
  }
  async function toggle(id: string) {
    if (openId === id) { setOpenId(''); return }
    setOpenId(id); await loadParts(id)
  }
  async function setStatus(p: Part, status: string) {
    await supabase.from('registrations').update({ status }).eq('id', p.registration_id)
    await loadParts(openId)
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('de-AT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
  const set = (k: keyof typeof empty, v: string | boolean) => setForm({ ...form, [k]: v })

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Admin</h1>
      <button className={btn + ' mt-6'} onClick={() => { setShowForm(!showForm); setEditId(null); setForm(empty) }}>
        {showForm ? 'Abbrechen' : 'Neues Event anlegen'}
      </button>
      {msg && <p role="status" className="mt-3 font-bold">{msg}</p>}

      {showForm && (
        <form onSubmit={save} className={card + ' mt-6 space-y-4'}>
          <h2 className="text-3xl">{editId ? 'Event bearbeiten' : 'Neues Event'}</h2>
          <input className={field} placeholder="Titel" value={form.title} onChange={e => set('title', e.target.value)} required />
          <textarea className={field + ' min-h-24'} placeholder="Beschreibung" value={form.description} onChange={e => set('description', e.target.value)} />
          <label className="block font-bold">Beginn
            <input className={field + ' mt-1 font-normal'} type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} required />
          </label>
          <input className={field} placeholder="Ort" value={form.location} onChange={e => set('location', e.target.value)} required />
          <div className="flex gap-4">
            <label className="block flex-1 font-bold">Preis in €
              <input className={field + ' mt-1 font-normal'} inputMode="decimal" value={form.price} onChange={e => set('price', e.target.value)} required />
            </label>
            <label className="block flex-1 font-bold">Plätze
              <input className={field + ' mt-1 font-normal'} type="number" min={1} value={form.capacity} onChange={e => set('capacity', e.target.value)} required />
            </label>
          </div>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} />
            Für Mitglieder sichtbar
          </label>
          <button className={btn}>Speichern</button>
        </form>
      )}

      <div className="mt-8 space-y-5">
        {events.map(e => (
          <article key={e.id} className={card}>
            <h2 className="text-3xl">{e.title}</h2>
            <p className="mt-2 font-bold">{fmt(e.starts_at)} Uhr · {e.location}</p>
            <p className="text-sm">{(e.price_cents / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })} · {e.capacity} Plätze · {e.is_published ? 'sichtbar' : 'Entwurf (nicht sichtbar)'}</p>
            <div className="mt-4 flex flex-wrap gap-4 font-bold underline">
              <button onClick={() => toggle(e.id)}>{openId === e.id ? 'Liste schließen' : 'Teilnehmerinnen'}</button>
              <button onClick={() => edit(e)}>Bearbeiten</button>
              <button onClick={() => remove(e)}>Löschen</button>
            </div>
            {openId === e.id && (
              <div className="mt-4 space-y-3 border-t-2 border-blush pt-4">
                {parts.length === 0 && <p>Noch keine Anmeldungen.</p>}
                {parts.map(p => (
                  <div key={p.registration_id} className="rounded-xl bg-blush/50 p-3">
                    <p className="font-bold">{p.display_name || '(ohne Namen)'} · {label(p.status)}</p>
                    <p className="text-sm break-all">{p.email}</p>
                    <div className="mt-2 flex gap-4 text-sm font-bold underline">
                      {p.status !== 'confirmed' && <button onClick={() => setStatus(p, 'confirmed')}>Bestätigen</button>}
                      {p.status === 'confirmed' && <button onClick={() => setStatus(p, 'waitlist')}>Auf Warteliste</button>}
                      {p.status !== 'cancelled' && <button onClick={() => setStatus(p, 'cancelled')}>Entfernen</button>}
                    </div>
                  </div>
                ))}
                {parts.length > 0 && (
                  <p className="text-sm font-bold">Bestätigt: {parts.filter(p => p.status === 'confirmed').length} von {e.capacity} · Warteliste: {parts.filter(p => p.status === 'waitlist').length}</p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}
