import '../styles/AuthForm.css'

function PhoneInput({ id = 'number', name = 'number', value, onChange }) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
    onChange(digits)
  }

  return (
    <>
      <label htmlFor={id}>Phone number</label>
      <div className="auth__phone-row">
        <span className="auth__phone-prefix">+237</span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          maxLength={9}
          placeholder="677123456"
          value={value}
          onChange={handleChange}
        />
      </div>
    </>
  )
}

export default PhoneInput