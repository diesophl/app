const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

type Ev = { id: string; title: string; starts_at: string; location: string; description?: string | null }

// Erzeugt eine Kalenderdatei (.ics). Dauer: 2 Stunden, falls nichts anderes bekannt ist.
export function downloadIcs(e: Ev) {
  const start = new Date(e.starts_at)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SO Femme//Community App//DE', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.id}@sofemme`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc('SO Femme: ' + e.title)}`, `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description ?? '')}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'so-femme-event.ics'
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
