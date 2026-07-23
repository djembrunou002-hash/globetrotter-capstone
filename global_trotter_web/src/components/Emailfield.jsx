function EmailField({ id = 'email', name = 'email', label = 'Email', value, onChange }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
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