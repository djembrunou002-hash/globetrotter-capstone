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

  test('renders all form fields', () => {
    renderRegister()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
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
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/provide an email or a phone number/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('submits successfully with only a phone number as contact method', async () => {
    registerUser.mockResolvedValueOnce({ id: 'user_001' })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/phone number/i), '1234567890')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: '',
        number: '1234567890',
        password: 'supersecret'
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  test('submits successfully with only an email as contact method', async () => {
    registerUser.mockResolvedValueOnce({ id: 'user_002' })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        number: '',
        password: 'supersecret'
      })
    })
  })

  test('shows server error message on failed registration', async () => {
    registerUser.mockRejectedValueOnce(new Error('Email already registered'))
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
  })

  test('toggles password visibility', async () => {
    renderRegister()
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: /show/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})