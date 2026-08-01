import { apiRequest } from './api.js'

export function buildDestinationFormData(fields, imageFiles) {
  const formData = new FormData()

  formData.append('name', fields.name || '')
  formData.append('country', fields.country || '')
  formData.append('region', fields.region || '')
  formData.append('area', fields.area || '')
  formData.append('type', fields.type || '')
  formData.append('tags', fields.tags || '')
  formData.append('budget_level', fields.budget_level || '')
  formData.append('budget_is_free', fields.budget_is_free ? 'true' : 'false')
  formData.append('budget_amount_label', fields.budget_amount_label || '')
  formData.append('budget_note', fields.budget_note || '')
  formData.append('hours_always_open', fields.hours_always_open ? 'true' : 'false')
  formData.append('hours_open', fields.hours_open || '')
  formData.append('hours_close', fields.hours_close || '')
  formData.append('hours_note', fields.hours_note || '')
  formData.append('location_lat', fields.location_lat || '')
  formData.append('location_lng', fields.location_lng || '')
  formData.append('location_address', fields.location_address || '')
  formData.append('advice', fields.advice || '')
  formData.append('description', fields.description || '')
  formData.append('nearby_services', JSON.stringify(fields.nearby_services || []))

  ;['image_1', 'image_2', 'image_3', 'image_4'].forEach(key => {
    if (imageFiles[key]) {
      formData.append(key, imageFiles[key])
    }
  })

  return formData
}

export function getMyDestinations() {
  return apiRequest('/my-destinations')
}

export function submitDestination(fields, imageFiles) {
  return apiRequest('/destinations', {
    method: 'POST',
    body: buildDestinationFormData(fields, imageFiles)
  })
}

export function requestDestinationUpdate(destinationId, fields, imageFiles) {
  return apiRequest(`/destinations/${destinationId}`, {
    method: 'PUT',
    body: buildDestinationFormData(fields, imageFiles)
  })
}

export function updateSubmission(requestId, fields, imageFiles) {
  return apiRequest(`/my-destinations/requests/${requestId}`, {
    method: 'PUT',
    body: buildDestinationFormData(fields, imageFiles)
  })
}

export function requestDestinationDelete(destinationId) {
  return apiRequest(`/destinations/${destinationId}`, {
    method: 'DELETE'
  })
}

export function discardSubmission(requestId) {
  return apiRequest(`/my-destinations/requests/${requestId}`, {
    method: 'DELETE'
  })
}