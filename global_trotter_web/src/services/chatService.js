import { io } from 'socket.io-client'
import { getToken } from './tokenStorage.js'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined

let socket = null

export function connectChat() {
  if (socket && socket.connected) return socket

  const token = getToken()
  if (!token) return null

  if (socket) {
    socket.auth = { token }
    socket.connect()
    return socket
  }

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  })

  return socket
}

export function disconnectChat() {
  if (!socket) return
  socket.disconnect()
}

export function getSocket() {
  return socket
}