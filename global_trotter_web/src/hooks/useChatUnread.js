import { useContext } from 'react'
import ChatUnreadContext from '../context/ChatUnreadContext.js'

export function useChatUnread() {
  return useContext(ChatUnreadContext)
}