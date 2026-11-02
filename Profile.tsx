import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { btn, field, card } from './ui'

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, 600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise(res => c.toBlob(b => res(b!), 'image/jpeg', 0.85))
}

export default function Profile({ userId, onDeleted }: { userId: string; onDeleted: () => void }) {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('display_name,bio,avatar_url').eq('id', userId).single().then(({ data }) => {
      if (!data) return
      setName(data.display_name ?? ''); setBio(data.bio ?? ''); setAvatarPath(data.avatar_url)
    })
  }, [])

  useEffect(() => {
    if (!avatarPath) { setAvatarUrl(''); return }
    supabase.storage.from('avatars').createSignedUrl(avatarPath, 3600).then(({ data }) => setAvatarUrl(data?.signedUrl ?? ''))
  }, [avatarPath])

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim() }).eq('id', userId)
    setMsg(error ? 'Speichern hat nicht geklappt. Bitte versuche es nochmal.' : 'Gespeichert.')
    setBusy(false)
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true); setMsg('')
    try {
      const path = `${userId}/avatar.jpg`
      const blob = await shrink(file)
      const up = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId)
      if (error) throw error
      setAvatarPath(path)
      const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600)
      setAvatarUrl(data?.signedUrl ?? '')
      setMsg('Profilbild gespeichert.')
    } catch { setMsg('Das Bild konnte nicht hochgeladen werden.') }
    setBusy(false)
  }

  async function removeAvatar() {
    setBusy(true)
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    setAvatarPath(null); setAvatarUrl(''); setBusy(false)
  }

  async function deleteAccount() {
    setBusy(true); setMsg('')
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
    const { error } = await supabase.rpc('delete_my_account')
    if (error) { setMsg('Das Konto konnte nicht gelöscht werden. Bitte schreibe uns.'); setBusy(false); return }
    await supabase.auth.signOut()
    onDeleted()
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-6xl">Dein Profil</h1>

      <section className={card + ' mt-8 flex items-center gap-5'}>
        {avatarUrl
          ? <img src={avatarUrl} alt="Dein Profilbild" className="h-24 w-24 rounded-full object-cover" />
          : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blush text-3xl font-bold">{name.slice(0, 1).toUpperCase() || '?'}</div>}
        <div className="space-y-2">
          <label className="inline-block cursor-pointer font-bold underline">
            Bild auswählen
            <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={e => upload(e.target.files?.[0])} />
          </label>
          {avatarUrl && <div><button className="font-bold underline" onClick={removeAvatar} disabled={busy}>Bild entfernen</button></div>}
          <p className="text-sm">Dein Bild sehen derzeit nur du und das SO-Femme-Team.</p>
        </div>
      </section>

      <form onSubmit={save} className={card + ' mt-6 space-y-4'}>
        <label className="block font-bold">Name
          <input className={field + ' mt-1 font-normal'} value={name} onChange={e => setName(e.target.value)} required maxLength={60} />
        </label>
        <label className="block font-bold">Über dich (freiwillig)
          <textarea className={field + ' mt-1 min-h-28 font-normal'} value={bio} onChange={e => setBio(e.target.value)} maxLength={300} />
        </label>
        <button className={btn} disabled={busy}>Speichern</button>
        {msg && <p role="status" className="text-sm font-bold">{msg}</p>}
      </form>

      <section className={card + ' mt-6'}>
        <h2 className="text-3xl">Konto löschen</h2>
        <p className="mt-3">Dabei werden dein Profil, dein Bild, deine Anmeldungen und deine Nachrichten dauerhaft gelöscht. Das lässt sich nicht rückgängig machen. Deine Plätze werden für andere frei.</p>
        <label className="mt-4 block text-sm font-bold">Tippe zur Bestätigung LÖSCHEN
          <input className={field + ' mt-1 font-normal'} value={confirmText} onChange={e => setConfirmText(e.target.value)} />
        </label>
        <button className={btn + ' mt-4'} disabled={busy || confirmText !== 'LÖSCHEN'} onClick={deleteAccount}>Konto endgültig löschen</button>
      </section>
    </main>
  )
}
