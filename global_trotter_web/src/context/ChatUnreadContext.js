import { createContext } from 'react'

export const EMPTY_CHAT_STATE = {
  conversations: [],
  loaded: false,
  error: '',
  pinned: [],
  started: [],
  totalUnread: 0,
  unreadFor: () => 0,
  markRead: () => {},
  applyMessage: () => {},
  dropConversation: () => {},
  togglePin: () => {},
  startWith: () => {},
  forgetStarted: () => {},
  refresh: () => {}
}

const ChatUnreadContext = createContext(EMPTY_CHAT_STATE)

export default ChatUnreadContext