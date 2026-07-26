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

const MONT_FEBE = {
  id: 'dest_003',
  name: 'Mont Febe',
  country: 'Cameroon',
  region: 'Centre',
  area: 'Bastos',
  type: 'viewpoint',
  tags: ['nature', 'hiking', 'viewpoint'],
  budget_level: 'low',
  location: { lat: 3.9, lng: 11.53, address: 'Bastos, Yaounde' },
  rating: { average: 4.4, count: 63 },
  images: ['https://cdn.globetrotter.com/dest_003/main.jpg'],
  description: 'A forested hill with panoramic views over Yaounde.'
}

const CRAFT_VILLAGE = {
  id: 'dest_007',
  name: 'Craft Village',
  country: 'Cameroon',
  region: 'Centre',
  area: 'Mont Febe',
  type: 'market',
  tags: ['culture', 'shopping'],
  budget_level: 'low',
  location: { lat: 3.91, lng: 11.54, address: 'Mont Febe, Yaounde' },
  rating: { average: 4.1, count: 22 },
  images: ['https://cdn.globetrotter.com/dest_007/main.jpg'],
  description: 'A small artisan market near the base of Mont Febe.'
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

  describe('search', () => {
    beforeEach(() => {
      getToken.mockReturnValue(null)
      getDestinations.mockResolvedValue({
        destinations: [DESTINATION, MONT_FEBE, CRAFT_VILLAGE]
      })
    })

    test('shows all destinations before anything is typed', async () => {
      renderDestinations()

      expect(await screen.findByText('Marche Central')).toBeInTheDocument()
      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()
    })

    test('filters live as the user types, matching by name prefix', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      fireEvent.change(searchInput, { target: { value: 'Marche' } })

      expect(screen.getByText('Marche Central')).toBeInTheDocument()
      expect(screen.queryByText('Mont Febe')).not.toBeInTheDocument()
      expect(screen.queryByText('Craft Village')).not.toBeInTheDocument()
    })

    test('matches destinations whose area starts with the query, even if the name does not', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      // "Craft Village" doesn't start with "Mont", but its area ("Mont Febe") does
      fireEvent.change(searchInput, { target: { value: 'Mont' } })

      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()
    })

    test('updates live on every keystroke without needing a submit action, matching name or area', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })

      // Typing "Mo" should match "Mont Febe" (name) and "Craft Village" (area: "Mont Febe")
      fireEvent.change(searchInput, { target: { value: 'Mo' } })

      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()
    })

    test('search is case-insensitive', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      fireEvent.change(searchInput, { target: { value: 'MONT' } })

      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()
    })

    test('shows a no-results message when nothing matches', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      fireEvent.change(searchInput, { target: { value: 'zzzz' } })

      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()
      expect(screen.queryByText('Mont Febe')).not.toBeInTheDocument()
      expect(screen.getByText(/no destinations match/i)).toBeInTheDocument()
    })

    test('clearing the search restores the full list', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      fireEvent.change(searchInput, { target: { value: 'Mont' } })
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /clear search/i }))

      expect(searchInput).toHaveValue('')
      expect(screen.getByText('Marche Central')).toBeInTheDocument()
      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()
    })
  })

  describe('type filters', () => {
    beforeEach(() => {
      getToken.mockReturnValue(null)
      getDestinations.mockResolvedValue({
        destinations: [DESTINATION, MONT_FEBE, CRAFT_VILLAGE]
      })
    })

    test('renders one pill per distinct type present in the data, plus an All pill', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Market' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Viewpoint' })).toBeInTheDocument()
      // Both Marche Central and Craft Village are type "market" -- should only get one pill
      expect(screen.getAllByRole('button', { name: 'Market' })).toHaveLength(1)
    })

    test('All is active by default and shows every destination', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
    })

    test('selecting a type pill filters the grid to that type only', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      fireEvent.click(screen.getByRole('button', { name: 'Viewpoint' }))

      expect(screen.getByText('Mont Febe')).toBeInTheDocument()
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()
      expect(screen.queryByText('Craft Village')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Viewpoint' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    })

    test('clicking the active pill again toggles back to showing all destinations', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      const viewpointPill = screen.getByRole('button', { name: 'Viewpoint' })
      fireEvent.click(viewpointPill)
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()

      fireEvent.click(viewpointPill)
      expect(screen.getByText('Marche Central')).toBeInTheDocument()
      expect(viewpointPill).toHaveAttribute('aria-pressed', 'false')
    })

    test('combines the type filter with the search query', async () => {
      renderDestinations()
      await screen.findByText('Marche Central')

      // Both Marche Central and Craft Village are "market" type
      fireEvent.click(screen.getByRole('button', { name: 'Market' }))
      expect(screen.getByText('Marche Central')).toBeInTheDocument()
      expect(screen.getByText('Craft Village')).toBeInTheDocument()

      // Narrow further by search -- only Craft Village's area starts with "Mont"
      const searchInput = screen.getByRole('textbox', { name: /search destinations/i })
      fireEvent.change(searchInput, { target: { value: 'Mont' } })

      expect(screen.getByText('Craft Village')).toBeInTheDocument()
      expect(screen.queryByText('Marche Central')).not.toBeInTheDocument()
    })
  })
})