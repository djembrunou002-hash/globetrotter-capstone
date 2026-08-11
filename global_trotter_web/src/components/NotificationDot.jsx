import '../styles/NotificationDot.css'

function NotificationDot({ label = '', className = '' }) {
  return (
    <span
      className={`notif-dot ${className}`.trim()}
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
    />
  )
}

export default NotificationDot