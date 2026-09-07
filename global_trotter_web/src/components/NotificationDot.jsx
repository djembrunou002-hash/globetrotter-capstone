import '../styles/NotificationDot.css'

function NotificationDot({ label = '', className = '', count = 0 }) {
  const showCount = count > 0
  const text = count > 99 ? '99+' : String(count)

  return (
    <span
      className={`notif-dot ${showCount ? 'notif-dot--count' : ''} ${className}`.trim()}
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
    >
      {showCount ? text : null}
    </span>
  )
}

export default NotificationDot