import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ItineraryDetails from '../../src/pages/itineraryDetails.jsx'
import { getItineraries } from '../../src/services/itineraryService.js'
import {
  getDestinations,
  getFavorites,
  addFavorite,
  removeFavorite,
  rateDestination
} from '../../src/services/destinationService.js'
import { getToken } from '../../src/services/tokenStorage.js'

jest.mock('../../src/services/itineraryService.js')
jest.mock('../../src/services/destinationService.js')
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

const ITINERARY = {
  id: 'itin_001',
  title: 'Weekend in Yaounde',
  start_date: '2026-08-01',
  end_date: '2026-08-03',
  destinations: ['dest_001', 'dest_003'],
  tags: ['food', 'nature']
}

function renderItineraryDetails(id = 'itin_001') {
  return render(
    <MemoryRouter initialEntries={[`/itineraries/${id}`]}>
      <Routes>
        <Route path="/itineraries/:id" element={<ItineraryDetails />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getToken.mockReturnValue('fake-token')
  getItineraries.mockResolvedValue({ itineraries: [ITINERARY] })
  getDestinations.mockResolvedValue({ destinations: [MARCHE, MONT_FEBE] })
  getFavorites.mockResolvedValue({ favorites: [] })
  addFavorite.mockResolvedValue({ favorites: [] })
  removeFavorite.mockResolvedValue({ favorites: [] })
  rateDestination.mockResolvedValue({ rating: { average: 5, count: 1 } })
})

describe('ItineraryDetails', () => {
  test('shows the itinerary title, date interval, and its destinations', async () => {
    renderItineraryDetails()

    expect(await screen.findByText('Weekend in Yaounde')).toBeInTheDocument()
    expect(screen.getByText(/Aug 1, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Aug 3, 2026/)).toBeInTheDocument()
    expect(screen.getByText('Marche Central')).toBeInTheDocument()
    expect(screen.getByText('Mont Febe')).toBeInTheDocument()
  })

  test('redirects to login when there is no token', () => {
    getToken.mockReturnValue(null)
    renderItineraryDetails()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('shows "Itinerary not found" when the id does not match any itinerary', async () => {
    renderItineraryDetails('itin_does_not_exist')

    expect(await screen.findByText('Itinerary not found.')).toBeInTheDocument()
  })

  test('shows a visited checkbox on each destination card, defaulting to unchecked', async () => {
    renderItineraryDetails()
    await screen.findByText('Marche Central')

    const checkbox = screen.getByRole('button', { name: /mark marche central as visited/i })
    expect(checkbox).toHaveAttribute('aria-pressed', 'false')
  })
})