export type Language = 'hu' | 'de' | 'bs' | 'en'

export const languageNames: Record<Language, string> = {
  hu: 'Magyar',
  de: 'Deutsch',
  bs: 'Bosanski',
  en: 'English',
}

export const localeByLanguage: Record<Language, string> = {
  hu: 'hu-HU',
  de: 'de-DE',
  bs: 'bs-BA',
  en: 'en-GB',
}

export const translations = {
  hu: {
    settings: 'Beállítások', schedule: 'Beosztás', templates: 'Műszakok', mainMenu: 'Főmenü', monthlySummary: 'Havi összesítés',
    settingsTitle: 'Beállítások', settingsHelp: 'Az alkalmazás nyelvének és megjelenésének beállítása.', language: 'Nyelv', theme: 'Téma', lightTheme: 'Világos', darkTheme: 'Sötét',
    downloadIcs: 'ICS letöltése', savePdf: 'PDF mentése', googleConnect: 'Google összekapcsolása', googleSync: 'Szinkronizálás', googleSyncing: 'Szinkronizálás…', googleDisconnect: 'Google kapcsolat bontása',
    googleConnected: 'Google Naptárhoz csatlakozva.', googleSyncDone: '{count} műszak szinkronizálva a Google Naptárba.', googleSetupMissing: 'Állítsd be a VITE_GOOGLE_CLIENT_ID értékét, és indítsd újra az appot.', googleLoadError: 'Nem sikerült betölteni a Google bejelentkezést.', googleAuthError: 'Nem sikerült hozzáférést kérni a Google Naptárhoz.', googleSyncError: 'Nem sikerült a Google Naptár szinkronizálása.', googleSyncRunning: 'Szinkronizálás folyamatban…', googleDisconnected: 'Google Naptár kapcsolat bontva.',
    introEyebrow: 'A beosztásod, egy helyen', introTitle: 'Tervezd meg a hónapod.', localNotice: 'A műszakok ezen az eszközön mentődnek.',
    countedShifts: 'Beszámított műszak', plannedHours: 'Tervezett munkaóra', selectedMonth: 'Kiválasztott hónap',
    newShift: 'Új műszak', editShift: 'Műszak módosítása', selectedDay: 'Kiválasztott nap', chooseShift: 'Műszak kiválasztása', chooseTemplate: 'Válassz a mentett műszakokból', addTemplateFirst: 'Előbb adj hozzá egy műszaktípust', insertShift: 'Műszak beillesztése', saveChanges: 'Módosítás mentése', cancel: 'Mégse',
    workdays: 'Munkanapok', noWorkdays: 'Ebben a hónapban még nincs beszámított munkanap.', totalWorkHours: 'Összes munkaóra',
    calendar: 'Havi naptár', previousMonth: 'Előző hónap', today: 'Ma', nextMonth: 'Következő hónap', selectDay: '{date} kiválasztása', deleteShift: '{name} törlése', editShiftAria: '{name} módosítása', legend: 'Műszakmagyarázat',
    catalogEyebrow: 'Újra felhasználható beállítások', catalogTitle: 'Műszakok', catalogHelp: 'Itt rögzítsd a választható műszaktípusokat.', newTemplate: 'Új műszaktípus', editTemplate: 'Műszak módosítása', shiftName: 'Műszak megnevezése', namePlaceholder: 'Például: Délelőtti műszak', abbreviation: 'Rövidítés', optional: 'Nem kötelező', abbreviationPlaceholder: 'Például: D', markerColor: 'Jelölőszín', startTime: 'Kezdés', endTime: 'Befejezés', workHours: 'Munkaóra', countsTowardTotal: 'Beszámít a havi munkaóra-összesítésbe', location: 'Helyszín', locationPlaceholder: 'Üzlet, iroda vagy megjegyzés', shiftStatus: 'Műszak állapota', active: 'Aktív', inactive: 'Inaktív', saveTemplate: 'Műszak mentése', savedTemplates: 'Mentett műszakok', noTemplates: 'Még nincs elmentett műszaktípus.', notCounted: 'Nem számít bele', editTemplateAria: '{name} módosítása', deleteTemplateAria: '{name} törlése',
    breakDuration: 'Szünet (perc)', breakDurationShort: 'Szünet', minutesUnit: 'perc', hoursUnit: 'óra', footerLocal: 'Helyi mentés', footerIcs: 'Az ICS-fájl az összes felvitt műszakot tartalmazza.',
  },
  de: {
    settings: 'Einstellungen', schedule: 'Dienstplan', templates: 'Schichten', mainMenu: 'Hauptmenü', monthlySummary: 'Monatsübersicht',
    settingsTitle: 'Einstellungen', settingsHelp: 'Sprache und Darstellung der Anwendung auswählen.', language: 'Sprache', theme: 'Darstellung', lightTheme: 'Hell', darkTheme: 'Dunkel',
    downloadIcs: 'ICS herunterladen', savePdf: 'PDF speichern', googleConnect: 'Google verbinden', googleSync: 'Synchronisieren', googleSyncing: 'Synchronisierung…', googleDisconnect: 'Google-Verbindung trennen',
    googleConnected: 'Mit Google Kalender verbunden.', googleSyncDone: '{count} Schichten mit Google Kalender synchronisiert.', googleSetupMissing: 'VITE_GOOGLE_CLIENT_ID festlegen und die App neu starten.', googleLoadError: 'Google-Anmeldung konnte nicht geladen werden.', googleAuthError: 'Zugriff auf Google Kalender konnte nicht angefordert werden.', googleSyncError: 'Google Kalender konnte nicht synchronisiert werden.', googleSyncRunning: 'Synchronisierung läuft…', googleDisconnected: 'Google Kalender getrennt.',
    introEyebrow: 'Dein Dienstplan an einem Ort', introTitle: 'Plane deinen Monat.', localNotice: 'Schichten werden auf diesem Gerät gespeichert.',
    countedShifts: 'Angerechnete Schichten', plannedHours: 'Geplante Arbeitsstunden', selectedMonth: 'Ausgewählter Monat',
    newShift: 'Neue Schicht', editShift: 'Schicht bearbeiten', selectedDay: 'Ausgewählter Tag', chooseShift: 'Schicht auswählen', chooseTemplate: 'Gespeicherte Schicht auswählen', addTemplateFirst: 'Zuerst einen Schichttyp hinzufügen', insertShift: 'Schicht eintragen', saveChanges: 'Änderungen speichern', cancel: 'Abbrechen',
    workdays: 'Arbeitstage', noWorkdays: 'Für diesen Monat sind noch keine angerechneten Arbeitstage vorhanden.', totalWorkHours: 'Arbeitsstunden gesamt',
    calendar: 'Monatskalender', previousMonth: 'Vorheriger Monat', today: 'Heute', nextMonth: 'Nächster Monat', selectDay: '{date} auswählen', deleteShift: '{name} löschen', editShiftAria: '{name} bearbeiten', legend: 'Schichtlegende',
    catalogEyebrow: 'Wiederverwendbare Einstellungen', catalogTitle: 'Schichten', catalogHelp: 'Hier legst du auswählbare Schichttypen an.', newTemplate: 'Neuer Schichttyp', editTemplate: 'Schicht bearbeiten', shiftName: 'Schichtname', namePlaceholder: 'Zum Beispiel: Frühschicht', abbreviation: 'Kürzel', optional: 'Optional', abbreviationPlaceholder: 'Zum Beispiel: F', markerColor: 'Anzeigefarbe', startTime: 'Beginn', endTime: 'Ende', workHours: 'Arbeitsstunden', countsTowardTotal: 'In die monatliche Arbeitszeit einrechnen', location: 'Ort', locationPlaceholder: 'Filiale, Büro oder Hinweis', shiftStatus: 'Status der Schicht', active: 'Aktiv', inactive: 'Inaktiv', saveTemplate: 'Schicht speichern', savedTemplates: 'Gespeicherte Schichten', noTemplates: 'Noch keine Schichttypen gespeichert.', notCounted: 'Wird nicht eingerechnet', editTemplateAria: '{name} bearbeiten', deleteTemplateAria: '{name} löschen',
    breakDuration: 'Pause (Minuten)', breakDurationShort: 'Pause', minutesUnit: 'Min.', hoursUnit: 'Std.', footerLocal: 'Lokal gespeichert', footerIcs: 'Die ICS-Datei enthält alle eingetragenen Schichten.',
  },
  bs: {
    settings: 'Postavke', schedule: 'Raspored', templates: 'Smjene', mainMenu: 'Glavni meni', monthlySummary: 'Mjesečni pregled',
    settingsTitle: 'Postavke', settingsHelp: 'Odaberite jezik i izgled aplikacije.', language: 'Jezik', theme: 'Tema', lightTheme: 'Svijetla', darkTheme: 'Tamna',
    downloadIcs: 'Preuzmi ICS', savePdf: 'Sačuvaj PDF', googleConnect: 'Poveži Google', googleSync: 'Sinhronizuj', googleSyncing: 'Sinhronizacija…', googleDisconnect: 'Prekini Google vezu',
    googleConnected: 'Povezano s Google Kalendarom.', googleSyncDone: '{count} smjena sinhronizirano s Google Kalendarom.', googleSetupMissing: 'Postavite VITE_GOOGLE_CLIENT_ID i ponovo pokrenite aplikaciju.', googleLoadError: 'Nije moguće učitati Google prijavu.', googleAuthError: 'Nije moguće zatražiti pristup Google Kalendaru.', googleSyncError: 'Nije moguće sinhronizirati Google Kalendar.', googleSyncRunning: 'Sinhronizacija je u toku…', googleDisconnected: 'Veza s Google Kalendarom je prekinuta.',
    introEyebrow: 'Vaš raspored na jednom mjestu', introTitle: 'Isplanirajte svoj mjesec.', localNotice: 'Smjene se čuvaju na ovom uređaju.',
    countedShifts: 'Smjene koje se računaju', plannedHours: 'Planirani radni sati', selectedMonth: 'Odabrani mjesec',
    newShift: 'Nova smjena', editShift: 'Uredi smjenu', selectedDay: 'Odabrani dan', chooseShift: 'Odaberite smjenu', chooseTemplate: 'Odaberite sačuvanu smjenu', addTemplateFirst: 'Prvo dodajte tip smjene', insertShift: 'Dodaj smjenu', saveChanges: 'Sačuvaj izmjene', cancel: 'Odustani',
    workdays: 'Radni dani', noWorkdays: 'Nema smjena koje se računaju za ovaj mjesec.', totalWorkHours: 'Ukupno radnih sati',
    calendar: 'Mjesečni kalendar', previousMonth: 'Prethodni mjesec', today: 'Danas', nextMonth: 'Sljedeći mjesec', selectDay: 'Odaberite {date}', deleteShift: 'Obriši {name}', editShiftAria: 'Uredi {name}', legend: 'Legenda smjena',
    catalogEyebrow: 'Postavke za ponovnu upotrebu', catalogTitle: 'Smjene', catalogHelp: 'Ovdje dodajte tipove smjena koje možete birati.', newTemplate: 'Novi tip smjene', editTemplate: 'Uredi smjenu', shiftName: 'Naziv smjene', namePlaceholder: 'Na primjer: Jutarnja smjena', abbreviation: 'Skraćenica', optional: 'Nije obavezno', abbreviationPlaceholder: 'Na primjer: J', markerColor: 'Boja oznake', startTime: 'Početak', endTime: 'Kraj', workHours: 'Radni sati', countsTowardTotal: 'Uključi u mjesečni zbir radnih sati', location: 'Lokacija', locationPlaceholder: 'Poslovnica, ured ili napomena', shiftStatus: 'Status smjene', active: 'Aktivna', inactive: 'Neaktivna', saveTemplate: 'Sačuvaj smjenu', savedTemplates: 'Sačuvane smjene', noTemplates: 'Još nema sačuvanih tipova smjena.', notCounted: 'Ne računa se', editTemplateAria: 'Uredi {name}', deleteTemplateAria: 'Obriši {name}',
    breakDuration: 'Pauza (minute)', breakDurationShort: 'Pauza', minutesUnit: 'min', hoursUnit: 'h', footerLocal: 'Sačuvano lokalno', footerIcs: 'ICS datoteka sadrži sve unesene smjene.',
  },
  en: {
    settings: 'Settings', schedule: 'Schedule', templates: 'Shifts', mainMenu: 'Main menu', monthlySummary: 'Monthly summary',
    settingsTitle: 'Settings', settingsHelp: 'Choose the language and appearance of the application.', language: 'Language', theme: 'Theme', lightTheme: 'Light', darkTheme: 'Dark',
    downloadIcs: 'Download ICS', savePdf: 'Save PDF', googleConnect: 'Connect Google', googleSync: 'Sync calendar', googleSyncing: 'Syncing…', googleDisconnect: 'Disconnect Google',
    googleConnected: 'Connected to Google Calendar.', googleSyncDone: '{count} shifts synced to Google Calendar.', googleSetupMissing: 'Set VITE_GOOGLE_CLIENT_ID and restart the app.', googleLoadError: 'Could not load Google sign-in.', googleAuthError: 'Could not request Google Calendar access.', googleSyncError: 'Google Calendar sync failed.', googleSyncRunning: 'Sync in progress…', googleDisconnected: 'Google Calendar disconnected.',
    introEyebrow: 'Your schedule, in one place', introTitle: 'Plan your month.', localNotice: 'Shifts are saved on this device.',
    countedShifts: 'Counted shifts', plannedHours: 'Planned work hours', selectedMonth: 'Selected month',
    newShift: 'New shift', editShift: 'Edit shift', selectedDay: 'Selected day', chooseShift: 'Choose a shift', chooseTemplate: 'Choose a saved shift', addTemplateFirst: 'Add a shift type first', insertShift: 'Add shift', saveChanges: 'Save changes', cancel: 'Cancel',
    workdays: 'Workdays', noWorkdays: 'No counted workdays this month yet.', totalWorkHours: 'Total work hours',
    calendar: 'Monthly calendar', previousMonth: 'Previous month', today: 'Today', nextMonth: 'Next month', selectDay: 'Select {date}', deleteShift: 'Delete {name}', editShiftAria: 'Edit {name}', legend: 'Shift legend',
    catalogEyebrow: 'Reusable settings', catalogTitle: 'Shifts', catalogHelp: 'Create shift types to choose from here.', newTemplate: 'New shift type', editTemplate: 'Edit shift', shiftName: 'Shift name', namePlaceholder: 'For example: Morning shift', abbreviation: 'Abbreviation', optional: 'Optional', abbreviationPlaceholder: 'For example: M', markerColor: 'Marker colour', startTime: 'Start', endTime: 'End', workHours: 'Work hours', countsTowardTotal: 'Count toward monthly work hours', location: 'Location', locationPlaceholder: 'Store, office or note', shiftStatus: 'Shift status', active: 'Active', inactive: 'Inactive', saveTemplate: 'Save shift', savedTemplates: 'Saved shifts', noTemplates: 'No shift types saved yet.', notCounted: 'Not counted', editTemplateAria: 'Edit {name}', deleteTemplateAria: 'Delete {name}',
    breakDuration: 'Break (minutes)', breakDurationShort: 'Break', minutesUnit: 'min', hoursUnit: 'hrs', footerLocal: 'Saved locally', footerIcs: 'The ICS file includes all entered shifts.',
  },
} as const

export type TranslationKey = keyof typeof translations.hu
export type Translator = (key: TranslationKey, replacements?: Record<string, string | number>) => string
export const deleteActionLabels: Record<Language, string> = {
  hu: 'Törlés',
  de: 'Löschen',
  bs: 'Obriši',
  en: 'Delete',
}

export function createTranslator(language: Language): Translator {
  return (key, replacements = {}) => {
    let value: string = translations[language][key]
    for (const [name, replacement] of Object.entries(replacements)) {
      value = value.replaceAll(`{${name}}`, String(replacement))
    }
    return value
  }
}
