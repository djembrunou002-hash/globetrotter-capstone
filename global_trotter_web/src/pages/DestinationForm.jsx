import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMyDestinations, submitDestination, requestDestinationUpdate } from '../services/myDestinationService.js'
import { getAllDestinations, adminUpdateDestination } from '../services/adminService.js'
import { getToken, getUser } from '../services/tokenStorage.js'
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
  advice: '',
  description: ''
}

const IMAGE_SLOTS = [
  { key: 'image_1', label: 'Principal photo' },
  { key: 'image_2', label: 'Photo 2' },
  { key: 'image_3', label: 'Photo 3' },
  { key: 'image_4', label: 'Photo 4' }
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
    advice: destination.advice || '',
    description: destination.description || ''
  }
}

function DestinationForm({ mode }) {
  const navigate = useNavigate()
  const { id } = useParams()
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
      try {
        const response = isAdminEdit ? await getAllDestinations() : await getMyDestinations()
        if (cancelled) return
        const found = response.destinations.find(d => d.id === id)
        if (!found) {
          setError('Destination not found.')
          return
        }
        setFields(destinationToFields(found))
        setNearbyServices(found.nearby_services || [])
        setExistingImages((found.images || []).concat([null, null, null, null]).slice(0, 4))
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
      setError('A principal photo is required.')
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
        await requestDestinationUpdate(id, payload, imageFiles)
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

  const title =
    mode === 'create'
      ? 'Add your destination'
      : mode === 'edit'
        ? 'Edit your destination'
        : 'Edit destination'

  const submitLabel =
    mode === 'create'
      ? 'Submit for review'
      : mode === 'edit'
        ? 'Send edit for review'
        : 'Save changes'

  return (
    <div className="destination-form-page">
      <header className="destination-form-page__header">
        <button type="button" className="destination-form-page__back" aria-label="Go back" onClick={handleBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <Logo theme="dark" />
        <h1 className="destination-form-page__title">{title}</h1>
      </header>

      <main className="destination-form-page__content destination-form-page__content--with-bottom-nav">
        {loading && <p className="destination-form__status">Loading...</p>}

        {!loading && (
          <form className="destination-form" onSubmit={handleSubmit} noValidate>
            {error && <p className="destination-form__error">{error}</p>}

            {mode === 'edit' && (
              <p className="destination-form__hint">
                Changes you save here will be sent to an admin for review before they go live.
              </p>
            )}

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Photos</h2>
              <div className="destination-form__images">
                {IMAGE_SLOTS.map(slot => {
                  const index = IMAGE_SLOTS.indexOf(slot)
                  const preview = imagePreviews[slot.key] || existingImages[index]
                  return (
                    <label key={slot.key} className="destination-form__image-slot">
                      {preview ? (
                        <img src={preview} alt={slot.label} className="destination-form__image-preview" />
                      ) : (
                        <span className="destination-form__image-placeholder">{slot.label}</span>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={e => handleImageChange(slot.key, e.target.files[0] || null)}
                        hidden
                      />
                      <span className="destination-form__image-label">{slot.label}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Basics</h2>

              <label className="destination-form__field">
                <span>Name</span>
                <input type="text" name="name" value={fields.name} onChange={handleFieldChange} required />
              </label>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>Country</span>
                  <input type="text" name="country" value={fields.country} onChange={handleFieldChange} required />
                </label>
                <label className="destination-form__field">
                  <span>Region</span>
                  <input type="text" name="region" value={fields.region} onChange={handleFieldChange} required />
                </label>
              </div>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>Area</span>
                  <input type="text" name="area" value={fields.area} onChange={handleFieldChange} required />
                </label>
                <label className="destination-form__field">
                  <span>Type</span>
                  <input
                    type="text"
                    name="type"
                    value={fields.type}
                    onChange={handleFieldChange}
                    placeholder="e.g. market, nature, museum"
                    required
                  />
                </label>
              </div>

              <label className="destination-form__field">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  name="tags"
                  value={fields.tags}
                  onChange={handleFieldChange}
                  placeholder="food, hiking, local"
                />
              </label>

              <label className="destination-form__field">
                <span>Description</span>
                <textarea name="description" value={fields.description} onChange={handleFieldChange} rows={3} />
              </label>

              <label className="destination-form__field">
                <span>Advice for visitors</span>
                <textarea name="advice" value={fields.advice} onChange={handleFieldChange} rows={3} />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Budget</h2>

              <label className="destination-form__field">
                <span>Budget level</span>
                <select name="budget_level" value={fields.budget_level} onChange={handleFieldChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="destination-form__checkbox">
                <input
                  type="checkbox"
                  name="budget_is_free"
                  checked={fields.budget_is_free}
                  onChange={handleFieldChange}
                />
                <span>Free to enter</span>
              </label>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>Amount label</span>
                  <input
                    type="text"
                    name="budget_amount_label"
                    value={fields.budget_amount_label}
                    onChange={handleFieldChange}
                    placeholder="e.g. Free to browse"
                  />
                </label>
                <label className="destination-form__field">
                  <span>Budget note</span>
                  <input
                    type="text"
                    name="budget_note"
                    value={fields.budget_note}
                    onChange={handleFieldChange}
                    placeholder="Extra detail about cost"
                  />
                </label>
              </div>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Hours</h2>

              <label className="destination-form__checkbox">
                <input
                  type="checkbox"
                  name="hours_always_open"
                  checked={fields.hours_always_open}
                  onChange={handleFieldChange}
                />
                <span>Always open</span>
              </label>

              {!fields.hours_always_open && (
                <div className="destination-form__row">
                  <label className="destination-form__field">
                    <span>Opens at</span>
                    <input type="time" name="hours_open" value={fields.hours_open} onChange={handleFieldChange} />
                  </label>
                  <label className="destination-form__field">
                    <span>Closes at</span>
                    <input type="time" name="hours_close" value={fields.hours_close} onChange={handleFieldChange} />
                  </label>
                </div>
              )}

              <label className="destination-form__field">
                <span>Hours note</span>
                <input type="text" name="hours_note" value={fields.hours_note} onChange={handleFieldChange} />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Location</h2>

              <div className="destination-form__row">
                <label className="destination-form__field">
                  <span>Latitude</span>
                  <input
                    type="number"
                    step="any"
                    name="location_lat"
                    value={fields.location_lat}
                    onChange={handleFieldChange}
                  />
                </label>
                <label className="destination-form__field">
                  <span>Longitude</span>
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
                <span>Address</span>
                <input
                  type="text"
                  name="location_address"
                  value={fields.location_address}
                  onChange={handleFieldChange}
                />
              </label>
            </section>

            <section className="destination-form__section">
              <h2 className="destination-form__section-title">Nearby services</h2>

              {nearbyServices.map((service, index) => (
                <div className="destination-form__service-row" key={index}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={service.name}
                    onChange={e => handleServiceChange(index, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Type (e.g. Transport)"
                    value={service.type}
                    onChange={e => handleServiceChange(index, 'type', e.target.value)}
                  />
                  <button
                    type="button"
                    className="destination-form__service-remove"
                    onClick={() => handleRemoveService(index)}
                    aria-label="Remove nearby service"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}

              <button type="button" className="destination-form__service-add" onClick={handleAddService}>
                + Add nearby service
              </button>
            </section>

            <button type="submit" className="destination-form__submit" disabled={submitting}>
              {submitting ? 'Submitting...' : submitLabel}
            </button>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default DestinationForm