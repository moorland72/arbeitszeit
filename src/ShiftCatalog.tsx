import { useState, type FormEvent } from 'react'
import { deleteActionLabels, type Language, type Translator } from './translations.ts'
import { createId } from './createId.ts'

export type ShiftTemplate = {
  id: string
  name: string
  abbreviation: string
  color: string
  start: string
  end: string
  pauseMinutes: number
  hours: number
  countsTowardTotal: boolean
  location: string
  active: boolean
}

type TemplateForm = Omit<ShiftTemplate, 'id'>

type ShiftCatalogProps = {
  templates: ShiftTemplate[]
  onSave: (template: ShiftTemplate) => void
  onDelete: (id: string) => void
  t: Translator
  locale: string
  language: Language
}

export const DEFAULT_SHIFT_COLOR = '#d9e7dc'

const emptyForm: TemplateForm = { name: '', abbreviation: '', color: DEFAULT_SHIFT_COLOR, start: '09:00', end: '17:00', pauseMinutes: 0, hours: 8, countsTowardTotal: true, location: '', active: true }

function durationHours(start: string, end: string, pauseMinutes: number) {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  let minutes = endHour * 60 + endMinute - startHour * 60 - startMinute
  if (minutes <= 0) minutes += 24 * 60
  return Math.max(0, minutes - pauseMinutes) / 60
}

function ShiftCatalog({ templates, onSave, onDelete, t, locale, language }: ShiftCatalogProps) {
  const [form, setForm] = useState<TemplateForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hours = durationHours(form.start, form.end, form.pauseMinutes)
    onSave({
      ...form,
      hours,
      id: editingId ?? createId(),
      name: form.name.trim(),
      abbreviation: form.abbreviation.trim(),
      location: form.location.trim(),
    })
    resetForm()
  }

  return (
    <section className="catalog-view" aria-labelledby="catalog-title">
      <div className="catalog-intro">
        <div><p className="eyebrow">{t('catalogEyebrow')}</p><h1 id="catalog-title">{t('catalogTitle')}</h1></div>
        <p className="intro-note">{t('catalogHelp')}</p>
      </div>

      <div className="catalog-grid">
        <section className="entry-section" aria-labelledby="template-form-title">
          <div className="section-heading"><span className="section-index">01</span><h2 id="template-form-title">{editingId ? t('editTemplate') : t('newTemplate')}</h2></div>
          <form className="shift-form" onSubmit={saveTemplate}>
            <label className="field field-wide"><span>{t('shiftName')}</span><input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('namePlaceholder')} /></label>
            <label className="field field-wide"><span>{t('abbreviation')} <small>{t('optional')}</small></span><input maxLength={12} value={form.abbreviation} onChange={(event) => setForm({ ...form, abbreviation: event.target.value })} placeholder={t('abbreviationPlaceholder')} /></label>
            <label className="field field-wide color-field"><span>{t('markerColor')}</span><input className="color-input" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
            <div className="field-row">
              <label className="field"><span>{t('startTime')}</span><input required type="time" step="300" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label>
              <label className="field"><span>{t('endTime')}</span><input required type="time" step="300" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /></label>
            </div>
            <label className="field field-wide"><span>{t('breakDuration')}</span><input type="number" min="0" max="1440" step="5" value={form.pauseMinutes} onChange={(event) => setForm({ ...form, pauseMinutes: Number(event.target.value) })} /></label>
            <div className="field field-wide"><span>{t('workHours')}</span><output>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(durationHours(form.start, form.end, form.pauseMinutes))} {t('hoursUnit')}</output></div>
            <label className="hours-toggle field-wide"><input type="checkbox" checked={form.countsTowardTotal} onChange={(event) => setForm({ ...form, countsTowardTotal: event.target.checked })} /><span>{t('countsTowardTotal')}</span></label>
            <label className="field field-wide"><span>{t('location')} <small>{t('optional')}</small></span><input maxLength={120} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={t('locationPlaceholder')} /></label>
            <label className="field field-wide"><span>{t('shiftStatus')}</span><select value={form.active ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, active: event.target.value === 'active' })}><option value="active">{t('active')}</option><option value="inactive">{t('inactive')}</option></select></label>
            <div className="form-actions field-wide">
              {editingId && <button className="cancel-button" type="button" onClick={resetForm}>{t('cancel')}</button>}
              <button className="save-button" type="submit">{editingId ? t('saveChanges') : t('saveTemplate')} <span aria-hidden="true">＋</span></button>
            </div>
          </form>
        </section>

        <section className="catalog-list-section" aria-labelledby="saved-templates-title">
          <div className="section-heading"><span className="section-index">02</span><h2 id="saved-templates-title">{t('savedTemplates')}</h2><strong className="catalog-count">{templates.length}</strong></div>
          {templates.length ? <div className="catalog-list">{templates.map((template) => (
            <article className="catalog-row" key={template.id}>
                <span className="shift-rule" style={{ backgroundColor: template.color }} aria-hidden="true" />
              <div className="shift-details">
                <strong>{template.name}{template.abbreviation && <small className="shift-abbreviation">{template.abbreviation}</small>}<small className={`shift-status${template.active ? '' : ' is-inactive'}`}>{template.active ? t('active') : t('inactive')}</small></strong>
                <span>{template.start} – {template.end} · {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(template.hours)} {t('hoursUnit')} · {t('breakDurationShort')}: {template.pauseMinutes ?? 0} {t('minutesUnit')}{!template.countsTowardTotal && ` · ${t('notCounted')}`}{template.location && ` · ${template.location}`}</span>
              </div>
              <div className="shift-actions">
                <button type="button" onClick={() => { setEditingId(template.id); setForm({ name: template.name, abbreviation: template.abbreviation, color: template.color, start: template.start, end: template.end, pauseMinutes: template.pauseMinutes ?? 0, hours: template.hours, countsTowardTotal: template.countsTowardTotal, location: template.location, active: template.active }) }} aria-label={t('editTemplateAria', { name: template.name })}>{t('editShift')}</button>
                <button type="button" onClick={() => onDelete(template.id)} aria-label={t('deleteTemplateAria', { name: template.name })}>{deleteActionLabels[language]}</button>
              </div>
            </article>
          ))}</div> : <p className="empty-note catalog-empty">{t('noTemplates')}</p>}
        </section>
      </div>
    </section>
  )
}

export default ShiftCatalog
