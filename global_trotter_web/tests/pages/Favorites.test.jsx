import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Favorites from '../../src/pages/Favorites.jsx'
import { getFavorites, removeFavorite, rateDestination } from '../../src/services/destinationService.js'
import { getToken } from '../../src/services/tokenStorage.js'
import ItineraryDraftProvider from '../../src/context/ItineraryDraftProvider.jsx'

jest.mock('../../src/services/destinationService.js')
jest.mock('../../src/services/tokenStorage.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const MARCHE_CENTRAL = {
  id: 'dest_001',
  name: 'Marche Central',
  area: 'Centre-ville',
  type: 'market',
  budget_level: 'low',
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg'],
  rating: { average: 4.3, count: 56 },
  tags: ['food', 'shopping'],
  comment_count: 2
}

const MONT_FEBE = {
  id: 'dest_003',
  name: 'Mont Febe',
  area: 'Bastos',
  type: 'nature',
  budget_level: 'low',
  images: ['https://cdn.globetrotter.com/dest_003/main.jpg'],
  rating: { average: 4.4, count: 63 },
  tags: ['nature', 'hiking'],
  comment_count: 0
}

function renderFavorites() {
  return render(
    <MemoryRouter>
      <ItineraryDraftProvider>
        <Favorites />
      </ItineraryDraftProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getToken.mockReturnValue('fake-jwt')
})

describe('Favorites', () => {
  test('redirects to login when there is no token', () => {
    getToken.mockReturnValue(null)
    renderFavorites()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('renders a card for each favorited destination', async () => {
    getFavorites.mockResolvedValue({ favorites: [MARCHE_CENTRAL, MONT_FEBE] })
    renderFavorites()

    expect(await screen.findByText('Marche Central')).toBeInTheDocument()
    expect(screen.getByText('Mont Febe')).toBeInTheDocument()
  })

  test('shows an empty state when there are no favorites', async () => {
    getFavorites.mockResolvedValue({ favorites: [] })
    renderFavorites()

    expect(await screen.findByText(/haven't favorited any destinations/i)).toBeInTheDocument()
  })

  test('shows an error message when the fetch fails', async () => {
    getFavorites.mockRejectedValue(new Error('Something went wrong'))
    renderFavorites()

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  test('removing a favorite calls the backend and drops the card', async () => {
    getFavorites.mockResolvedValue({ favorites: [MARCHE_CENTRAL, MONT_FEBE] })
    removeFavorite.mockResolvedValue({ favorites: [] })
    renderFavorites()

    await screen.findByText('Marche Central')

    const marcheCard = screen.getByRole('button', { name: /view details for marche central/i })
    fireEvent.click(within(marcheCard).getByRole('button', { name: /remove from favorites/i }))

    await waitFor(() => expect(removeFavorite).toHaveBeenCalledWith('dest_001'))
    await waitFor(() => expect(screen.queryByText('Marche Central')).not.toBeInTheDocument())
    expect(screen.getByText('Mont Febe')).toBeInTheDocument()
  })

  test('rating a favorite calls the backend', async () => {
    getFavorites.mockResolvedValue({ favorites: [MARCHE_CENTRAL] })
    rateDestination.mockResolvedValue({ destination_id: 'dest_001', rating: { average: 4.5, count: 57 } })
    renderFavorites()

    const card = await screen.findByRole('button', { name: /view details for marche central/i })
    fireEvent.click(within(card).getByRole('button', { name: /rate 5 stars/i }))

    await waitFor(() => expect(rateDestination).toHaveBeenCalledWith('dest_001', 5))
  })

  test('the back button navigates back', async () => {
    getFavorites.mockResolvedValue({ favorites: [] })
    renderFavorites()

    await screen.findByText(/haven't favorited any destinations/i)
    fireEvent.click(screen.getByRole('button', { name: /go back/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})