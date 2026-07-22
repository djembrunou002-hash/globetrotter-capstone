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

  test('shows an error when submitting with empty fields', async () => {
    renderRegister()
    fireEvent.click(screen.getByRole('button', { name: /register/i }))
    expect(await screen.findByText(/all fields are required/i)).toBeInTheDocument()
    expect(registerUser).not.toHaveBeenCalled()
  })

  test('submits the form and redirects on success', async () => {
    registerUser.mockResolvedValueOnce({ id: 'user_001' })
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/phone number/i), '1234567890')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        number: '1234567890',
        password: 'supersecret'
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  test('shows server error message on failed registration', async () => {
    registerUser.mockRejectedValueOnce(new Error('Email already registered'))
    renderRegister()

    await userEvent.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/phone number/i), '1234567890')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret')

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
  })
})