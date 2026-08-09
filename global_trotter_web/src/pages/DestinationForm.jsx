import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMyDestinations, submitDestination, requestDestinationUpdate, updateSubmission } from '../services/myDestinationService.js'
import { getAllDestinations, adminUpdateDestination } from '../services/adminService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
import { useTranslation } from '../hooks/useTranslation.js'
import Logo from '../components/Logo.jsx'
import BottomNav from '../components/Bottomnav.jsx'
import '../styles/DestinationForm.css'

const EMPTY_FIELDS = {
  name: '',
  country: '',
  region: '',
  area: '',
  type: '',
  tags: '',
  budget_level: 'low',
  budget_is_free: false,
  budget_amount_label: '',
  budget_note: '',
  hours_always_open: false,
  hours_open: '',
  hours_close: '',
  hours_note: '',
  location_lat: '',
  location_lng: '',
  location_address: '',
  contact_phone: '',
  contact_email: '',
  advice: '',
  description: ''
}

const IMAGE_SLOTS = [
  { key: 'image_1', number: 1 },
  { key: 'image_2', number: 2 },
  { key: 'image_3', number: 3 },
  { key: 'image_4', number: 4 }
]

function destinationToFields(destination) {
  return {
    name: destination.name || '',
    country: destination.country || '',
    region: destination.region || '',
    area: destination.area || '',
    type: destination.type || '',
    tags: (destination.tags || []).join(', '),
    budget_level: destination.budget_level || 'low',
    budget_is_free: Boolean(destination.budget?.is_free),
    budget_amount_label: destination.budget?.amount_label || '',
    budget_note: destination.budget?.note || '',
    hours_always_open: Boolean(destination.hours?.always_open),
    hours_open: destination.hours?.open || '',
    hours_close: destination.hours?.close || '',
    hours_note: destination.hours?.note || '',
    location_lat: destination.location?.lat ?? '',
    location_lng: destination.location?.lng ?? '',
    location_address: destination.location?.address || '',
    contact_phone: destination.contact?.phone || '',
    contact_email: destination.contact?.email || '',
    advice: destination.advice || '',
    description: destination.description || ''
  }
}

function DestinationForm({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const { t } = useTranslation()
  const isEdit = mode === 'edit' || mode === 'admin-edit'
  const isAdminEdit = mode === 'admin-edit'

  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [nearbyServices, setNearbyServices] = useState([])
  const [existingImages, setExistingImages] = useState([null, null, null, null])
  const [imageFiles, setImageFiles] = useState({})
  const [imagePreviews, setImagePreviews] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [isPendingSubmission, setIsPendingSubmission] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      navigate('/login')
      return
    }

    if (isAdminEdit && getUser()?.role !== 'admin') {
      navigate('/home')
      return
    }

    if (!isEdit) {
      return
    }

    let cancelled = false

    async function loadExisting() {
      setLoading(true)
      setError('')
      setNotFound(false)
      try {
        const response = isAdminEdit ? await getAllDestinations() : await getMyDestinations()
        if (cancelled) return
        const found = response.destinations.find(d => d.id === id)
        if (!found) {
          setNotFound(true)
          return
        }
        setFields(destinationToFields(found))
        setNearbyServices(found.nearby_services || [])
        setExistingImages((found.images || []).concat([null, null, null, null]).slice(0, 4))
        setIsPendingSubmission(found.status === 'pending_review')
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    queueMicrotask(() => {
      if (!cancelled) {
        loadExisting()
      }
    })

    return () => {
      cancelled = true
    }
  }, [id, isEdit, isAdminEdit, navigate])

  function handleFieldChange(e) {
    const { name, value, type, checked } = e.target
    setFields(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleImageChange(key, file) {
    setImageFiles(prev => ({ ...prev, [key]: file }))
    setImagePreviews(prev => ({ ...prev, [key]: file ? URL.createObjectURL(file) : null }))
  }

  function handleServiceChange(index, key, value) {
    setNearbyServices(prev =>
      prev.map((service, i) => (i === index ? { ...service, [key]: value } : service))
    )
  }

  function handleAddService() {
    setNearbyServices(prev => [...prev, { name: '', type: '' }])
  }

  function handleRemoveService(index) {
    setNearbyServices(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isEdit && !imageFiles.image_1) {
      setError(t('form.principalPhotoRequired'))
      return
    }

    const payload = {
      ...fields,
      nearby_services: nearbyServices.filter(service => service.name.trim())
    }

    setSubmitting(true)
    try {
      if (mode === 'create') {
        await submitDestination(payload, imageFiles)
        navigate('/my-destinations')
      } else if (mode === 'edit') {
        if (isPendingSubmission) {
          await updateSubmission(id, payload, imageFiles)
        } else {
          await requestDestinationUpdate(id, payload, imageFiles)
        }
        navigate('/my-destinations')
      } else {
        await adminUpdateDestination(id, payload, imageFiles)
        navigate('/admin')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleBack() {
    navigate(-1)
  }

  function slotLabel(slot) {
    return slot.number === 1 ? t('form.principalPhoto') : t('form.photoNumber', { number: slot.number })
  }

  const title =
    mode === 'create'
      ? t('form.titleCreate')
      : mode === 'edit'
        ? t('form.titleEdit')
        : t('form.titleAdminEdit')

  const submitLabel =
    mode === 'create'
      ? t('form.submitCreate')
      : mode === 'edit'
        ? isPendingSubmission
          ? t('form.submitUpdate')
          : t('form.submitSendEdit')
        : t('form.submitSaveChanges')

  const displayedError = notFound ? t('destinationDetails.notFound') : error

  return (
    <div className="destination-form-page">
      <header className="destination-form-page__header">
        <button type="button" className="destination-form-page__back" aria-label={t('common.goBack')} onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
        <h1 className="destination-form-page__title">{title}</h1>
      </header>

      <main className="destination-form-page__content destination-form-page__content--with-bottom-nav">
        {loading && <p className="destination-form__status">{t('common.loading')}</p>}

        {!loading && (
          <form className="destination-form" onSubmit={handleSubmit} noValidate>
            {displayedError && <p className="destination-form__error">{displayedError}</p>}

            {mode === 'edit' && (
              <p className="destination-form__hint">
                {isPendingSubmission ? t('form.hintPending') : t('form.hintEdit')}
              </p>
            )}

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionPhotos')}</h2>
              <div className="destination-form__images">
                {IMAGE_SLOTS.map(slot => {
                  const index = IMAGE_SLOTS.indexOf(slot)
                  const preview = imagePreviews[slot.key] || existingImages[index]
                  const label = slotLabel(slot)
                  return (
                    <label key={slot.key} className="destination-form__image-slot">
                      {preview ? (
                        <img src={preview} alt={label} className="destination-form__image-preview" />
                      ) : (
                        <span className="destination-form__image-placeholder">{label}</span>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={e => handleImageChange(slot.key, e.target.files[0] || null)}
                        hidden
                      />
                      <span className="destination-form__image-label">{label}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionBasics')}</h2>

              <label className="destination-form__field">
                <span>{t('form.name')}</span>
                <input type="text" name="name" value={fields.name} onChange={handleFieldChange} required />
              </label>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>{t('form.country')}</span>
                  <input type="text" name="country" value={fields.country} onChange={handleFieldChange} required />
                </label>
                <label className="destination-form__field">
                  <span>{t('form.region')}</span>
                  <input type="text" name="region" value={fields.region} onChange={handleFieldChange} required />
                </label>
              </div>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>{t('form.area')}</span>
                  <input type="text" name="area" value={fields.area} onChange={handleFieldChange} required />
                </label>
                <label className="destination-form__field">
                  <span>{t('form.type')}</span>
                  <input
                    type="text"
                    name="type"
                    value={fields.type}
                    onChange={handleFieldChange}
                    placeholder={t('form.typePlaceholder')}
                    required
                  />
                </label>
              </div>

              <label className="destination-form__field">
                <span>{t('form.tags')}</span>
                <input
                  type="text"
                  name="tags"
                  value={fields.tags}
                  onChange={handleFieldChange}
                  placeholder={t('form.tagsPlaceholder')}
                />
              </label>

              <label className="destination-form__field">
                <span>{t('form.description')}</span>
                <textarea name="description" value={fields.description} onChange={handleFieldChange} rows={3} />
              </label>

              <label className="destination-form__field">
                <span>{t('form.advice')}</span>
                <textarea name="advice" value={fields.advice} onChange={handleFieldChange} rows={3} />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionBudget')}</h2>

              <label className="destination-form__field">
                <span>{t('form.budgetLevel')}</span>
                <select name="budget_level" value={fields.budget_level} onChange={handleFieldChange}>
                  <option value="low">{t('form.levelLow')}</option>
                  <option value="medium">{t('form.levelMedium')}</option>
                  <option value="high">{t('form.levelHigh')}</option>
                </select>
              </label>

              <label className="destination-form__checkbox">
                <input
                  type="checkbox"
                  name="budget_is_free"
                  checked={fields.budget_is_free}
                  onChange={handleFieldChange}
                />
                <span>{t('form.freeToEnter')}</span>
              </label>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>{t('form.amountLabel')}</span>
                  <input
                    type="text"
                    name="budget_amount_label"
                    value={fields.budget_amount_label}
                    onChange={handleFieldChange}
                    placeholder={t('form.amountPlaceholder')}
                  />
                </label>
                <label className="destination-form__field">
                  <span>{t('form.budgetNote')}</span>
                  <input
                    type="text"
                    name="budget_note"
                    value={fields.budget_note}
                    onChange={handleFieldChange}
                    placeholder={t('form.budgetNotePlaceholder')}
                  />
                </label>
              </div>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionHours')}</h2>

              <label className="destination-form__checkbox">
                <input
                  type="checkbox"
                  name="hours_always_open"
                  checked={fields.hours_always_open}
                  onChange={handleFieldChange}
                />
                <span>{t('form.alwaysOpen')}</span>
              </label>

              {!fields.hours_always_open && (
                <div className="destination-form__row">
                  <label className="destination-form__field">
                    <span>{t('form.opensAt')}</span>
                    <input type="time" name="hours_open" value={fields.hours_open} onChange={handleFieldChange} />
                  </label>
                  <label className="destination-form__field">
                    <span>{t('form.closesAt')}</span>
                    <input type="time" name="hours_close" value={fields.hours_close} onChange={handleFieldChange} />
                  </label>
                </div>
              )}

              <label className="destination-form__field">
                <span>{t('form.hoursNote')}</span>
                <input type="text" name="hours_note" value={fields.hours_note} onChange={handleFieldChange} />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionLocation')}</h2>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>{t('form.latitude')}</span>
                  <input
                    type="number"
                    step="any"
                    name="location_lat"
                    value={fields.location_lat}
                    onChange={handleFieldChange}
                  />
                </label>
                <label className="destination-form__field">
                  <span>{t('form.longitude')}</span>
                  <input
                    type="number"
                    step="any"
                    name="location_lng"
                    value={fields.location_lng}
                    onChange={handleFieldChange}
                  />
                </label>
              </div>

              <label className="destination-form__field">
                <span>{t('form.address')}</span>
                <input
                  type="text"
                  name="location_address"
                  value={fields.location_address}
                  onChange={handleFieldChange}
                />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionContact')}</h2>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>{t('form.contactPhone')}</span>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={fields.contact_phone}
                    onChange={handleFieldChange}
                    placeholder={t('form.contactPhonePlaceholder')}
                  />
                </label>
                <label className="destination-form__field">
                  <span>{t('form.contactEmail')}</span>
                  <input
                    type="email"
                    name="contact_email"
                    value={fields.contact_email}
                    onChange={handleFieldChange}
                    placeholder={t('form.contactEmailPlaceholder')}
                  />
                </label>
              </div>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">{t('form.sectionServices')}</h2>

              {nearbyServices.map((service, index) => (
                <div className="destination-form__service-row" key={index}>
                  <input
                    type="text"
                    placeholder={t('form.serviceName')}
                    value={service.name}
                    onChange={e => handleServiceChange(index, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('form.serviceType')}
                    value={service.type}
                    onChange={e => handleServiceChange(index, 'type', e.target.value)}
                  />
                  <button
                    type="button"
                    className="destination-form__service-remove"
                    onClick={() => handleRemoveService(index)}
                    aria-label={t('form.removeService')}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}

              <button type="button" className="destination-form__service-add" onClick={handleAddService}>
                {t('form.addService')}
              </button>
            </section>

            <button type="submit" className="destination-form__submit" disabled={submitting}>
              {submitting ? t('form.submitting') : submitLabel}
            </button>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default DestinationForm