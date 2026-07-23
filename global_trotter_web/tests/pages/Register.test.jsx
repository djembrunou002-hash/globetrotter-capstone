import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Register from '../../src/pages/Register.jsx'
import { registerUser } from '../../src/services/authService.js'

jest.mock('../../src/services/authService.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const STRONG_PASSWORD = 'Sup3rSecret!'

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function renderRegister() {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )
  }

  function getPasswordInput() {
    return screen.getByLabelText('Password')
  }

  test('renders a home logo link pointing to /', () => {
    renderRegister()
    expect(screen.getByRole('link', { name: /globaltrotter/i })).toHaveAttribute('href', '/')
  })

  test('renders all form fields including the CMR phone prefix', () => {
    renderRegister()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(getPasswordInput()).toBeInTheDocument()
    expect(screen.getByText('+237')).toBeInTheDocument()
  })

  test('shows an error when name and password are missing', async () => {
    renderRegister()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(await screen.findByText(/name and password are required/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('shows an error when neither email nor phone number is provided', async () => {
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(getPasswordInput(), STRONG_PASSWORD)

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/provide an email or a phone number/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('rejects an invalid email format', async () => {
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(getPasswordInput(), STRONG_PASSWORD)

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('restricts the phone number input to 9 digits', async () => {
    renderRegister()
    const numberInput = screen.getByLabelText(/phone number/i)

    await userEvent.type(numberInput, '12345678901234')

    expect(numberInput).toHaveValue('123456789')
  })

  test('rejects a weak password', async () => {
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(getPasswordInput(), 'weakpass')

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('submits with the +237 prefix combined into the phone number', async () => {
    registerUser.mockResolvedValueOnce({ id: 'user_001' })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/phone number/i), '677123456')
    await userEvent.type(getPasswordInput(), STRONG_PASSWORD)

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: '',
        number: '+237677123456',
        password: STRONG_PASSWORD
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  test('submits successfully with only a valid email as contact method', async () => {
    registerUser.mockResolvedValueOnce({ id: 'user_002' })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(getPasswordInput(), STRONG_PASSWORD)

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        number: '',
        password: STRONG_PASSWORD
      })
    })
  })

  test('shows server error message on failed registration', async () => {
    registerUser.mockRejectedValueOnce(new Error('Email already registered'))
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(getPasswordInput(), STRONG_PASSWORD)

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
  })

  test('toggles password visibility', async () => {
    renderRegister()
    const passwordInput = getPasswordInput()
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})