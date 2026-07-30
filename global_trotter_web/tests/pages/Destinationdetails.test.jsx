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
  budget: { is_free: true, amount_label: 'Free to browse', note: 'Free to enter and walk around.' },
  hours: { always_open: false, open: '07:00', close: '18:30', note: 'Open daily.' },
  rating: { average: 4.31, count: 56 },
  images: [
    'https://cdn.globetrotter.com/dest_001/main.jpg',
    'https://cdn.globetrotter.com/dest_001/2.jpg',
    'https://cdn.globetrotter.com/dest_001/3.jpg',
    'https://cdn.globetrotter.com/dest_001/4.jpg'
  ],
  nearby_services: [
    { name: 'Central taxi rank', type: 'Transport' },
    { name: 'Banks and ATMs on Avenue Foch', type: 'Bank/ATM' }
  ],
  advice: 'Bargaining is normal here - agree on a price before buying.',
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
    expect(screen.getAllByText('Free to browse').length).toBeGreaterThan(0)
    expect(screen.getByText(/7:00 AM - 6:30 PM/i)).toBeInTheDocument()
    expect(screen.getByText(/4.3 \(56\)/)).toBeInTheDocument()
    expect(
      screen.getByText('Bustling central market known for local produce and crafts.')
    ).toBeInTheDocument()
  })

  test('shows extra photos, nearby services, and advice', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    expect(screen.getByText('More photos')).toBeInTheDocument()
    expect(screen.getByAltText('Marche Central photo 2')).toBeInTheDocument()
    expect(screen.getByAltText('Marche Central photo 3')).toBeInTheDocument()
    expect(screen.getByAltText('Marche Central photo 4')).toBeInTheDocument()
    expect(screen.getByText('Central taxi rank')).toBeInTheDocument()
    expect(screen.getByText('Banks and ATMs on Avenue Foch')).toBeInTheDocument()
    expect(screen.getByText(/bargaining is normal here/i)).toBeInTheDocument()
  })

  test('shows "No advice." when a destination has none', async () => {
    getDestinations.mockResolvedValue({ destinations: [{ ...DESTINATION, advice: '' }] })
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    expect(screen.getByText('No advice.')).toBeInTheDocument()
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

  test('the back button navigates to the previous page', async () => {
    renderDestinationDetails()

    await screen.findByText('Marche Central')
    fireEvent.click(screen.getByRole('button', { name: /go back/i }))

    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })
})