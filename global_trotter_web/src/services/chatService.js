import { io } from 'socket.io-client'
import { apiRequest } from './api.js'
import { getToken } from './tokenStorage.js'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined

export const GENERAL_ROOM = 'general'

let socket = null

export function directRoom(userA, userB) {
  return `dm_${[userA, userB].sort().join('__')}`
}

export function peerIdOf(room, userId) {
  if (!room || !room.startsWith('dm_')) return null

  const members = room.slice(3).split('__')
  if (members.length !== 2 || !members.includes(userId)) return null

  return members[0] === userId ? members[1] : members[0]
}

export function getConversations() {
  return apiRequest('/chat/conversations')
}

export function deleteConversation(room) {
  return apiRequest(`/chat/conversations/${encodeURIComponent(room)}`, {
    method: 'DELETE'
  })
}

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