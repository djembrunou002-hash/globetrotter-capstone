import { apiRequest } from './api.js'

export function createGroup(name, memberIds) {
  return apiRequest('/chat/groups', {
    method: 'POST',
    body: JSON.stringify({ name, member_ids: memberIds || [] })
  })
}

export function joinGroup(token) {
  return apiRequest('/chat/groups/join', {
    method: 'POST',
    body: JSON.stringify({ token })
  })
}

export function getGroup(groupId) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}`)
}

export function renameGroup(groupId, name) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
}

export function addGroupMember(groupId, userId) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  })
}

export function removeGroupMember(groupId, memberId) {
  return apiRequest(
    `/chat/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' }
  )
}

export function setGroupAdmin(groupId, userId, admin) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}/admins`, {
    method: 'PUT',
    body: JSON.stringify({ user_id: userId, admin })
  })
}

export function updateGroupSettings(groupId, settings) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
}

export function rotateGroupInvite(groupId) {
  return apiRequest(`/chat/groups/${encodeURIComponent(groupId)}/invite`, {
    method: 'POST'
  })
}

export function inviteLink(token) {
  if (!token) return ''
  return `${window.location.origin}/chat?join=${encodeURIComponent(token)}`
}