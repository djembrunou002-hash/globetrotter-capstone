import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Destinations from '../../src/pages/Destinations.jsx'
import ItineraryDraftProvider from '../../src/context/ItineraryDraftProvider.jsx'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../../src/services/destinationService.js'
import { getToken } from '../../src/services/tokenStorage.js'

jest.mock('../../src/services/destinationService.js')
jest.mock('../../src/services/tokenStorage.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const DESTINATION = {
  id: 'dest_001',
  name: 'Marche Central',
  country: 'Cameroon',
  region: 'Centre',
  area: 'Centre-ville',
  type: 'market',
  tags: ['food', 'shopping', 'local'],
  budget_level: 'low',
  location: { lat: 3.8667, lng: 11.5167, address: 'Centre-ville, Yaounde' },
  rating: { average: 4.31, count: 56 },
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg'],
  description: 'Bustling central market known for local produce and crafts.'
}

function renderDestinations() {
  render(
    <MemoryRouter>
      <ItineraryDraftProvider>
        <Destinations />
      </ItineraryDraftProvider>
    </MemoryRouter>
  )
}

describe('Destinations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getDestinations.mockResolvedValue({ destinations: [DESTINATION] })
    getFavorites.mockResolvedValue({ favorites: [] })
  })

  test('shows a loading state then renders destination cards', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    expect(screen.getByText(/loading destinations/i)).toBeInTheDocument()

    expect(await screen.findByText('Marche Central')).toBeInTheDocument()
    expect(screen.getByText(/centre-ville · market/i)).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
  })

  test('shows an error message when the destinations request fails', async () => {
    getToken.mockReturnValue(null)
    getDestinations.mockRejectedValueOnce(new Error('Request failed'))
    renderDestinations()

    expect(await screen.findByText('Request failed')).toBeInTheDocument()
  })

  test('does not fetch favorites when logged out', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    await screen.findByText('Marche Central')
    expect(getFavorites).not.toHaveBeenCalled()
  })

  test('redirects to /login when favoriting while logged out', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /add to favorites/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(addFavorite).not.toHaveBeenCalled()
  })

  test('toggles favorite when logged in', async () => {
    getToken.mockReturnValue('fake-jwt')
    addFavorite.mockResolvedValueOnce({ favorites: ['dest_001'] })
    renderDestinations()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /add to favorites/i }))

    await waitFor(() => {
      expect(addFavorite).toHaveBeenCalledWith('dest_001')
    })

    expect(await screen.findByRole('button', { name: /remove from favorites/i })).toBeInTheDocument()
  })

  test('removes an existing favorite when logged in', async () => {
    getToken.mockReturnValue('fake-jwt')
    getFavorites.mockResolvedValueOnce({ favorites: [DESTINATION] })
    removeFavorite.mockResolvedValueOnce({ favorites: [] })
    renderDestinations()

    const removeButton = await screen.findByRole('button', { name: /remove from favorites/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(removeFavorite).toHaveBeenCalledWith('dest_001')
    })

    expect(await screen.findByRole('button', { name: /add to favorites/i })).toBeInTheDocument()
  })

  test('redirects to /login when rating while logged out', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /rate 5 stars/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(rateDestination).not.toHaveBeenCalled()
  })

  test('submits a rating when logged in', async () => {
    getToken.mockReturnValue('fake-jwt')
    rateDestination.mockResolvedValueOnce({
      destination_id: 'dest_001',
      rating: { average: 4.4, count: 57 }
    })
    renderDestinations()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /rate 5 stars/i }))

    await waitFor(() => {
      expect(rateDestination).toHaveBeenCalledWith('dest_001', 5)
    })

    expect(await screen.findByText(/4.4 \(57\)/)).toBeInTheDocument()
  })

  test('renders the bottom nav with Destinations, Home, and Itineraries links', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    await screen.findByText('Marche Central')
    expect(screen.getByRole('link', { name: /destinations/i })).toHaveAttribute('href', '/destinations')
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: /itineraries/i })).toHaveAttribute('href', '/itineraries')
  })

  test('does not show selection checkboxes outside of selection mode', async () => {
    getToken.mockReturnValue(null)
    renderDestinations()

    await screen.findByText('Marche Central')
    expect(screen.queryByRole('button', { name: /select marche central/i })).not.toBeInTheDocument()
  })
})