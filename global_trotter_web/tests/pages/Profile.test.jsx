import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Profile from '../../src/pages/Profile.jsx'
import { getFavorites } from '../../src/services/destinationService.js'
import { getToken, getUser, clearToken, clearUser } from '../../src/services/tokenStorage.js'
import ItineraryDraftProvider from '../../src/context/ItineraryDraftProvider.jsx'

jest.mock('../../src/services/destinationService.js')
jest.mock('../../src/services/tokenStorage.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const USER = {
  id: 'usr_1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  number: '+237677123456',
  created_at: '2026-06-15T09:00:00Z',
  favorites: ['dest_001']
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <ItineraryDraftProvider>
        <Profile />
      </ItineraryDraftProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getToken.mockReturnValue('fake-jwt')
  getUser.mockReturnValue(USER)
  getFavorites.mockResolvedValue({ favorites: ['dest_001', 'dest_003'] })
})

describe('Profile', () => {
  test('redirects to login when there is no token', () => {
    getToken.mockReturnValue(null)
    renderProfile()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('shows the user name, email, phone, and member since date', async () => {
    renderProfile()

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('+237 677123456')).toBeInTheDocument()
    expect(screen.getByText('June 2026')).toBeInTheDocument()

    // wait for the favorites fetch to settle so it doesn't resolve after the test ends
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  test('shows the favorite destination count fetched from the backend', async () => {
    renderProfile()

    await screen.findByText('Jane Doe')
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  test('the favorite destinations row links to the dedicated favorites page', async () => {
    renderProfile()

    await screen.findByText('Jane Doe')
    const favoritesLabel = await screen.findByText('Favorite destinations')

    expect(favoritesLabel.closest('a')).toHaveAttribute('href', '/favorites')
  })

  test('shows a fallback message when no user info is stored', async () => {
    getUser.mockReturnValue(null)
    renderProfile()

    expect(await screen.findByText(/profile information isn't available/i)).toBeInTheDocument()
    // with no user, the favorites fetch is skipped entirely -- nothing pending to await
    expect(getFavorites).not.toHaveBeenCalled()
  })

  test('does not render optional fields the user does not have', async () => {
    getUser.mockReturnValue({ id: 'usr_2', name: 'No Contact Info' })
    renderProfile()

    await screen.findByText('No Contact Info')
    expect(screen.queryByText('Email')).not.toBeInTheDocument()
    expect(screen.queryByText('Phone')).not.toBeInTheDocument()
    expect(screen.queryByText('Member since')).not.toBeInTheDocument()

    // wait for the favorites fetch to settle so it doesn't resolve after the test ends
    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  test('logging out clears stored auth state and redirects to login', async () => {
    renderProfile()

    await screen.findByText('Jane Doe')
    // wait for the favorites fetch to settle before triggering logout
    await screen.findByText('2')

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(clearToken).toHaveBeenCalled()
      expect(clearUser).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})