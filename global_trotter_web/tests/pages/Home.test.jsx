import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../../src/pages/Home.jsx'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../../src/services/destinationService.js'
import { getRecommendations } from '../../src/services/recommendationService.js'
import { getToken } from '../../src/services/tokenStorage.js'
import ItineraryDraftProvider from '../../src/context/ItineraryDraftProvider.jsx'


jest.mock('../../src/services/destinationService.js')
jest.mock('../../src/services/recommendationService.js')
jest.mock('../../src/services/tokenStorage.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const MARCHE = {
  id: 'dest_001',
  name: 'Marche Central',
  area: 'Centre-ville',
  type: 'market',
  tags: ['food', 'shopping', 'local'],
  budget_level: 'low',
  rating: { average: 4.31, count: 56 },
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg']
}

const MONT_FEBE = {
  id: 'dest_003',
  name: 'Mont Febe',
  area: 'Bastos',
  type: 'viewpoint',
  tags: ['nature', 'hiking', 'viewpoint'],
  budget_level: 'low',
  rating: { average: 4.4, count: 63 },
  images: ['https://cdn.globetrotter.com/dest_003/main.jpg']
}

function renderHome() {
  render(
    <MemoryRouter>
      <ItineraryDraftProvider>
        <Home />
      </ItineraryDraftProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getToken.mockReturnValue('fake-jwt')
  getDestinations.mockResolvedValue({ destinations: [MARCHE, MONT_FEBE] })
  getFavorites.mockResolvedValue({ favorites: [] })
  addFavorite.mockResolvedValue({ favorites: [] })
  removeFavorite.mockResolvedValue({ favorites: [] })
  rateDestination.mockResolvedValue({ rating: { average: 5, count: 1 } })
  getRecommendations.mockResolvedValue({
    user_id: 'usr_1',
    recommendations: [
      { destination_id: 'dest_003', name: 'Mont Febe', score: 24, reasons: ['highly rated by other travelers'] },
      { destination_id: 'dest_001', name: 'Marche Central', score: 10, reasons: ['matches your budget'] }
    ]
  })
})

describe('Home', () => {
  test('redirects to login when there is no token', () => {
    getToken.mockReturnValue(null)
    renderHome()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('renders recommended destinations resolved from the full destinations list, in recommendation order', async () => {
    renderHome()

    const cards = await screen.findAllByRole('heading', { level: 3 })
    expect(cards.map(c => c.textContent)).toEqual(['Mont Febe', 'Marche Central'])
  })

  test('shows a message when there are no recommendations yet', async () => {
    getRecommendations.mockResolvedValueOnce({ user_id: 'usr_1', recommendations: [] })
    renderHome()

    expect(await screen.findByText(/no recommendations yet/i)).toBeInTheDocument()
  })

  test('ignores a recommended id that no longer matches any destination', async () => {
    getRecommendations.mockResolvedValueOnce({
      user_id: 'usr_1',
      recommendations: [
        { destination_id: 'dest_003', name: 'Mont Febe', score: 24, reasons: [] },
        { destination_id: 'dest_999', name: 'Ghost Destination', score: 5, reasons: [] }
      ]
    })
    renderHome()

    expect(await screen.findByText('Mont Febe')).toBeInTheDocument()
    expect(screen.queryByText('Ghost Destination')).not.toBeInTheDocument()
  })

  test('toggles favorite for a recommended destination', async () => {
    addFavorite.mockResolvedValueOnce({ favorites: ['dest_003'] })
    renderHome()

    await screen.findByText('Mont Febe')
    const favoriteButtons = screen.getAllByRole('button', { name: /add to favorites/i })
    fireEvent.click(favoriteButtons[0])

    await waitFor(() => {
      expect(addFavorite).toHaveBeenCalledWith('dest_003')
    })
  })

  test('submits a rating for a recommended destination', async () => {
    rateDestination.mockResolvedValueOnce({
      destination_id: 'dest_003',
      rating: { average: 4.5, count: 64 }
    })
    renderHome()

    await screen.findByText('Mont Febe')
    fireEvent.click(screen.getAllByRole('button', { name: /rate 5 stars/i })[0])

    await waitFor(() => {
      expect(rateDestination).toHaveBeenCalledWith('dest_003', 5)
    })
  })

  test('shows an error message if recommendations fail to load', async () => {
    getRecommendations.mockRejectedValueOnce(new Error('Something went wrong'))
    renderHome()

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  test('clicking a recommended card navigates to its detail page', async () => {
    renderHome()

    const card = await screen.findByRole('button', { name: /view details for mont febe/i })
    fireEvent.click(card)

    expect(mockNavigate).toHaveBeenCalledWith('/destinations/dest_003')
  })

  test('renders the bottom nav with Destinations, Home, Itineraries, and Profile links', async () => {
    renderHome()

    await screen.findByText('Mont Febe')
    expect(screen.getByRole('link', { name: /destinations/i })).toHaveAttribute('href', '/destinations')
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: /itineraries/i })).toHaveAttribute('href', '/itineraries')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
  })
})