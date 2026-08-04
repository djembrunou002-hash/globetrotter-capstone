import { useTranslation } from '../hooks/useTranslation.js'

function EmailField({ id = 'email', name = 'email', label, value, onChange }) {
  const { t } = useTranslation()

  return (
    <>
      <label htmlFor={id}>{label || t('fields.email')}</label>
      <input
        id={id}
        name={name}
        type="email"
        value={value}
        onChange={onChange}
      />
    </>
  )
}

export default EmailField