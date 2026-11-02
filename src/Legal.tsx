import { card } from './ui'

// >>> HIER DEINE ANGABEN EINTRAGEN (alles in Anführungszeichen) <<<
const C = {
  inhaber: '[Vor- und Nachname der Inhaberin]',
  firma: 'SO Femme Events',
  anschrift: '[Straße Hausnummer, PLZ Ort, Österreich]',
  email: 'sofemme.events@outlook.at',
  telefon: '+43 664 88615079',
  uid: '[UID-Nummer, falls vorhanden – sonst Zeile entfernen]',
  gewerbe: '[z. B. Eventmarketing / Gewerbe laut Gewerbeschein]',
  behoerde: '[zuständige Bezirkshauptmannschaft / Magistrat]',
}

const H = ({ children }: { children: string }) => <h2 className="mt-8 text-3xl">{children}</h2>

function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <button onClick={onBack} className="mb-4 font-bold underline">Zurück</button>
      <h1 className="text-6xl">{title}</h1>
      <div className={card + ' mt-6 space-y-3 leading-relaxed'}>{children}</div>
    </main>
  )
}

export function Imprint({ onBack }: { onBack: () => void }) {
  return (
    <Shell title="Impressum" onBack={onBack}>
      <p><b>{C.firma}</b><br />{C.inhaber}<br />{C.anschrift}</p>
      <p>E-Mail: {C.email}<br />Telefon: {C.telefon}</p>
      <p>UID: {C.uid}</p>
      <p>Unternehmensgegenstand: {C.gewerbe}</p>
      <p>Gewerbebehörde: {C.behoerde}<br />Mitglied der Wirtschaftskammer Österreich. Es gelten die Vorschriften der Gewerbeordnung (www.ris.bka.gv.at).</p>
      <p>Grundlegende Richtung: Information über und Organisation von Veranstaltungen für Frauen in der Südoststeiermark sowie Austausch der Community.</p>
    </Shell>
  )
}

export function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <Shell title="Datenschutz" onBack={onBack}>
      <H>Wer ist verantwortlich?</H>
      <p>{C.firma}, {C.inhaber}, {C.anschrift}. Kontakt: {C.email}</p>

      <H>Welche Daten verarbeiten wir?</H>
      <p>Bei der Registrierung: E-Mail-Adresse, Passwort (nur verschlüsselt gespeichert) und dein Name. Freiwillig: Kurztext und Profilbild. Bei Anmeldungen zu Events: welches Event, Zeitpunkt und Status (angemeldet, Warteliste, storniert). Wenn du uns Ideen oder Feedback schickst: deinen Text.</p>

      <H>Wofür und auf welcher Grundlage?</H>
      <p>Konto, Eventanmeldungen und Organisation der Veranstaltungen: zur Erfüllung des Vertrags bzw. vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO). Profilbild und Kurztext: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit durch Löschen widerrufen kannst. Sicherheit und Missbrauchsschutz: berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).</p>

      <H>Wer bekommt deine Daten?</H>
      <p>Wir nutzen Dienstleister, die in unserem Auftrag arbeiten: Supabase (Datenbank, Anmeldung, Dateispeicher; Server in der EU, Frankfurt) und Cloudflare (Bereitstellung der Webseite; dabei werden technisch notwendige Verbindungsdaten wie die IP-Adresse verarbeitet). Mit beiden bestehen Auftragsverarbeitungs-Vereinbarungen. Soweit Daten in Drittländer übermittelt werden, geschieht das auf Grundlage der Standardvertragsklauseln bzw. des EU-US Data Privacy Frameworks. Die Schriftart wird von unserem eigenen Server geladen, es werden keine Daten an Google übertragen. Wir setzen keine Werbe- oder Analyse-Tracker ein.</p>

      <H>Cookies und lokale Speicherung</H>
      <p>Die App speichert in deinem Browser nur, was für die Anmeldung technisch nötig ist (Sitzungsdaten). Dafür ist keine Einwilligung erforderlich.</p>

      <H>Wie lange speichern wir?</H>
      <p>Bis du dein Konto löschst. Mit der Löschung werden Profil, Bild, Anmeldungen und Nachrichten dauerhaft entfernt. Gesetzliche Aufbewahrungspflichten für Buchhaltungsunterlagen (z. B. Zahlungen außerhalb der App) bleiben unberührt.</p>

      <H>Deine Rechte</H>
      <p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Das Konto kannst du selbst unter „Profil“ löschen, für alles andere schreib uns an {C.email}. Du kannst dich außerdem bei der österreichischen Datenschutzbehörde beschweren (dsb.gv.at).</p>

      <H>Mindestalter</H>
      <p>Die App ist für Personen ab 18 Jahren gedacht.</p>

      <p className="text-sm">Stand: November 2026</p>
    </Shell>
  )
}
