import { API_BASE_URL } from './api.js'
import { getToken } from './tokenStorage.js'

const MAX_IMAGE_EDGE = 1600
const IMAGE_QUALITY = 0.82

export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip'
].join(',')

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not read image'))
    }
    image.src = url
  })
}

export async function compressImage(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  let image
  try {
    image = await loadImage(file)
  } catch {
    return file
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height))
  if (scale === 1 && file.size < 600 * 1024) return file

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY)
  )

  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export function uploadAttachment(file, { caption, replyTo, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken()
    if (!token) {
      reject(new Error('not signed in'))
      return
    }

    const form = new FormData()
    form.append('file', file, file.name)
    if (caption) form.append('caption', caption)
    if (replyTo) form.append('reply_to', replyTo)

    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE_URL}/chat/upload`)
    request.setRequestHeader('Authorization', `Bearer ${token}`)

    request.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

        request.onload = () => {
      let data
      try {
        data = JSON.parse(request.responseText)
      } catch {
        data = null
      }

      if (request.status >= 200 && request.status < 300) resolve(data)
      else reject(new Error((data && data.error) || 'upload failed'))
    }

    request.onerror = () => reject(new Error('upload failed'))
    request.send(form)
  })
}