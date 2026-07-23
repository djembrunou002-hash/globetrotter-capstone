import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Login from '../../src/pages/Login.jsx'
import { loginUser } from '../../src/services/authService.js'

jest.mock('../../src/services/authService.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function renderLogin() {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
  }

  function getPasswordInput() {
    return screen.getByLabelText('Password')
  }

  test('renders a home logo link pointing to /', () => {
    renderLogin()
    expect(screen.getByRole('link', { name: /globaltrotter/i })).toHaveAttribute('href', '/')
  })

  test('renders email, phone number, and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(getPasswordInput()).toBeInTheDocument()
  })

  test('renders the +237 prefix', () => {
    renderLogin()
    expect(screen.getByText('+237')).toBeInTheDocument()
  })

  test('shows an error when password is missing', async () => {
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
    expect(loginUser).not.toHaveBeenCalled()
  })

  test('shows an error when neither email nor phone number is provided', async () => {
    renderLogin()

    await userEvent.type(getPasswordInput(), 'anypassword')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/provide an email or a phone number/i)).toBeInTheDocument()
    expect(loginUser).not.toHaveBeenCalled()
  })

  test('rejects an invalid email format', async () => {
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.type(getPasswordInput(), 'anypassword')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument()
    expect(loginUser).not.toHaveBeenCalled()
  })

  test('restricts the phone number input to 9 digits', async () => {
    renderLogin()
    const numberInput = screen.getByLabelText(/phone number/i)

    await userEvent.type(numberInput, '12345678901234')

    expect(numberInput).toHaveValue('123456789')
  })

  test('submits with the +237 prefix silently added to the phone number', async () => {
    loginUser.mockResolvedValueOnce({ token: 'fake-jwt' })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/phone number/i), '677123456')
    await userEvent.type(getPasswordInput(), 'anypassword')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: '',
        number: '+237677123456',
        password: 'anypassword'
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('submits successfully with only email as the identifier', async () => {
    loginUser.mockResolvedValueOnce({ token: 'fake-jwt' })
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(getPasswordInput(), 'anypassword')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: 'jane@example.com',
        number: '',
        password: 'anypassword'
      })
    })
  })

  test('shows server error message on invalid credentials', async () => {
    loginUser.mockRejectedValueOnce(new Error('invalid credentials'))
    renderLogin()

    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(getPasswordInput(), 'wrongpassword')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
  })

  test('toggles password visibility', async () => {
    renderLogin()
    const passwordInput = getPasswordInput()
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})