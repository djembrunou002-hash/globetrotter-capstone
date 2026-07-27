import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DestinationDetails from '../../src/pages/DestinationDetails.jsx'
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
  area: 'Centre-ville',
  type: 'market',
  tags: ['food', 'shopping', 'local'],
  budget_level: 'low',
  rating: { average: 4.31, count: 56 },
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg'],
  description: 'Bustling central market known for local produce and crafts.'
}

function renderDestinationDetails(id = 'dest_001') {
  return render(
    <MemoryRouter initialEntries={[`/destinations/${id}`]}>
      <Routes>
        <Route path="/destinations/:id" element={<DestinationDetails />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  getToken.mockReturnValue(null)
  getDestinations.mockResolvedValue({ destinations: [DESTINATION] })
  getFavorites.mockResolvedValue({ favorites: [] })
  addFavorite.mockResolvedValue({ favorites: [] })
  removeFavorite.mockResolvedValue({ favorites: [] })
  rateDestination.mockResolvedValue({ rating: { average: 5, count: 1 } })
})

describe('DestinationDetails', () => {
  test('shows the destination name, meta, tags, rating, and description', async () => {
    renderDestinationDetails()

    expect(await screen.findByText('Marche Central')).toBeInTheDocument()
    expect(screen.getByText(/centre-ville · market/i)).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
    expect(screen.getByText(/low budget/i)).toBeInTheDocument()
    expect(screen.getByText(/4.3 \(56\)/)).toBeInTheDocument()
    expect(
      screen.getByText('Bustling central market known for local produce and crafts.')
    ).toBeInTheDocument()
  })

  test('shows a "coming soon" note for future features', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  test('shows "Destination not found" for an unknown id', async () => {
    renderDestinationDetails('dest_does_not_exist')

    expect(await screen.findByText('Destination not found.')).toBeInTheDocument()
  })

  test('the location button is disabled', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    expect(screen.getByRole('button', { name: /location/i })).toBeDisabled()
  })

  test('redirects to /login when favoriting while logged out', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /add to favorites/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/login')
    expect(addFavorite).not.toHaveBeenCalled()
  })

  test('toggles favorite when logged in', async () => {
    getToken.mockReturnValue('fake-jwt')
    addFavorite.mockResolvedValueOnce({ favorites: ['dest_001'] })
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /add to favorites/i }))

    await waitFor(() => {
      expect(addFavorite).toHaveBeenCalledWith('dest_001')
    })

    expect(await screen.findByRole('button', { name: /remove from favorites/i })).toBeInTheDocument()
  })

  test('submits a rating when logged in', async () => {
    getToken.mockReturnValue('fake-jwt')
    rateDestination.mockResolvedValueOnce({
      destination_id: 'dest_001',
      rating: { average: 4.4, count: 57 }
    })
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /rate 5 stars/i }))

    await waitFor(() => {
      expect(rateDestination).toHaveBeenCalledWith('dest_001', 5)
    })

    expect(await screen.findByText(/4.4 \(57\)/)).toBeInTheDocument()
  })

  test('the back link points to /destinations', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    expect(screen.getByRole('link', { name: /back to destinations/i })).toHaveAttribute(
      'href',
      '/destinations'
    )
  })
})