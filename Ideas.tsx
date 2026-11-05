import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { btn, field, card, pill } from './ui'

type Row = { id: string; kind: 'idea' | 'feedback'; message: string; created_at: string; user_id: string; profiles?: { display_name: string } | null }
type Vote = { feedback_id: string; votes: number; voted: boolean }

export default function Ideas({ userId }: { userId: string }) {
  const [kind, setKind] = useState<'idea' | 'feedback'>('idea')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [votes, setVotes] = useState<Record<string, Vote>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadVotes() {
    const { data } = await supabase.rpc('idea_votes')
    const m: Record<string, Vote> = {}
    for (const v of (data ?? []) as Vote[]) m[v.feedback_id] = v
    setVotes(m)
  }
  async function load() {
    const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    setIsAdmin(!!me?.is_admin)
    const { data } = await supabase.from('feedback')
      .select('id,kind,message,created_at,user_id,profiles(display_name)')
      .order('created_at', { ascending: false })
    setRows((data ?? []) as unknown as Row[])
    await loadVotes()
  }
  useEffect(() => { load() }, [])

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error } = await supabase.from('feedback').insert({ user_id: userId, kind, message: message.trim() })
    if (error) setMsg('Das hat leider nicht geklappt. Bitte versuche es nochmal.')
    else { setMsg('Danke! Deine Nachricht ist bei SO Femme angekommen.'); setMessage(''); await load() }
    setBusy(false)
  }

  async function toggleVote(id: string) {
    const v = votes[id]
    if (v?.voted) await supabase.from('feedback_votes').delete().eq('feedback_id', id).eq('user_id', userId)
    else await supabase.from('feedback_votes').insert({ feedback_id: id, user_id: userId })
    await loadVotes()
  }

  const ideas = rows.filter(r => r.kind === 'idea')
    .sort((a, b) => (votes[b.id]?.votes ?? 0) - (votes[a.id]?.votes ?? 0) || b.created_at.localeCompare(a.created_at))
  const feedback = rows.filter(r => r.kind === 'feedback')
  const date = (iso: string) => new Date(iso).toLocaleDateString('de-AT', { timeZone: 'Europe/Vienna' })

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Deine Stimme zählt.</h1>
      <p className="mt-4 text-lg">Welches Event wünschst du dir? Was können wir besser machen?</p>

      <form onSubmit={submit} className={card + ' mt-8 space-y-4'}>
        <div className="flex gap-3">
          <button type="button" onClick={() => setKind('idea')} className={pill(kind === 'idea')}>Eventidee</button>
          <button type="button" onClick={() => setKind('feedback')} className={pill(kind === 'feedback')}>Feedback</button>
        </div>
        <textarea className={field + ' min-h-32'} maxLength={1000} required minLength={3}
          placeholder={kind === 'idea' ? 'Zum Beispiel: ein Töpferabend oder Brunch mit Vortrag …' : 'Was hat dir gefallen? Was fehlt dir?'}
          value={message} onChange={e => setMessage(e.target.value)} />
        <p className="text-sm">{kind === 'idea'
          ? 'Eventideen sehen alle Mitglieder, ohne deinen Namen. Sie können mit „Da wäre ich dabei“ abstimmen.'
          : 'Feedback sehen nur wir bei SO Femme.'}</p>
        <button className={btn} disabled={busy || message.trim().length < 3}>Absenden</button>
        {msg && <p role="status" className="text-sm font-bold">{msg}</p>}
      </form>

      <section className="mt-10">
        <h2 className="text-4xl">Ideen der Community</h2>
        {ideas.length === 0 && <p className="mt-3 text-lg">Noch keine Ideen. Mach den Anfang!</p>}
        <div className="mt-5 space-y-4">
          {ideas.map(r => {
            const v = votes[r.id]
            return (
              <article key={r.id} className={card}>
                <p className="text-sm font-bold">
                  {r.user_id === userId ? 'Deine Idee' : isAdmin && r.profiles?.display_name ? `Von ${r.profiles.display_name}` : 'Idee'} · {date(r.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{r.message}</p>
                <button className={pill(!!v?.voted) + ' mt-4'} aria-pressed={!!v?.voted} onClick={() => toggleVote(r.id)}>
                  {v?.voted ? 'Du bist dabei ✓' : 'Da wäre ich dabei'} · {v?.votes ?? 0}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      {feedback.length > 0 && (
        <section className="mt-10">
          <h2 className="text-4xl">{isAdmin ? 'Feedback von Mitgliedern' : 'Dein Feedback'}</h2>
          <div className="mt-5 space-y-4">
            {feedback.map(r => (
              <article key={r.id} className={card}>
                <p className="text-sm font-bold">
                  {isAdmin && r.profiles?.display_name ? `Von ${r.profiles.display_name}` : 'Feedback'} · {date(r.created_at)}
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
