const SHARE_PATTERN = /(?:https?:\/\/[^\s/]+)?\/(destinations|itineraries)\/([A-Za-z0-9_-]+)/

export function destinationLink(id) {
  return `${window.location.origin}/destinations/${id}`
}

export function itineraryLink(id) {
  return `${window.location.origin}/itineraries/${id}`
}

export function whatsappLink(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function parseShareLink(text) {
  const value = (text || '').trim()
  if (!value) return null

  const match = value.match(SHARE_PATTERN)
  if (!match) return null

  const url = match[0]
  const kind = match[1] === 'destinations' ? 'destination' : 'itinerary'
  const remainder = value.replace(url, '').trim()

  return { kind, id: match[2], url, remainder }
}

export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }

  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()

    try {
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      if (ok) resolve()
      else reject(new Error('copy failed'))
    } catch (err) {
      document.body.removeChild(area)
      reject(err)
    }
  })
}