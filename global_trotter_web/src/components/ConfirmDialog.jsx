import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/ConfirmDialog.css'

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  submitting = false,
  error = ''
}) {
  const { t } = useTranslation()

  return (
    <div className="confirm-dialog__backdrop" onClick={submitting ? undefined : onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>

        {error && <p className="confirm-dialog__error">{error}</p>}

        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="confirm-dialog__cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            className="confirm-dialog__confirm"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? t('common.deleting') : confirmLabel || t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog