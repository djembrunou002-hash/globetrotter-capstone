import { useEffect } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Itineraries from '../../src/pages/Itineraries.jsx'
import ItineraryDraftProvider from '../../src/context/ItineraryDraftProvider.jsx'
import { useItineraryDraft } from '../../src/hooks/useItineraryDraft.js'
import { getItineraries, createItinerary } from '../../src/services/itineraryService.js'
import { getDestinations } from '../../src/services/destinationService.js'
import { getToken } from '../../src/services/tokenStorage.js'

jest.mock('../../src/services/itineraryService.js')
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
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg']
}

const ITINERARY = {
  id: 'itin_001',
  title: 'Weekend in Yaounde',
  destinations: ['dest_001'],
  tags: ['food', 'local'],
  start_date: '2026-08-01',
  end_date: '2026-08-03'
}

function renderItineraries() {
  render(
    <MemoryRouter>
      <ItineraryDraftProvider>
        <Itineraries />
      </ItineraryDraftProvider>
    </MemoryRouter>
  )
}

describe('Itineraries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getToken.mockReturnValue('fake-jwt')
    getDestinations.mockResolvedValue({ destinations: [DESTINATION] })
  })

  test('redirects to /login when logged out', () => {
    getToken.mockReturnValue(null)
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('shows "No itinerary" with a centered add button when the list is empty', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    expect(await screen.findByText('No itinerary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add itinerary/i })).toBeInTheDocument()
  })

  test('renders itinerary cards with title and cover image when the list is not empty', async () => {
    getItineraries.mockResolvedValue({ itineraries: [ITINERARY] })
    renderItineraries()

    expect(await screen.findByText('Weekend in Yaounde')).toBeInTheDocument()
    expect(screen.getByAltText('Weekend in Yaounde')).toHaveAttribute(
      'src',
      'https://cdn.globetrotter.com/dest_001/main.jpg'
    )
  })

  test('opens the add itinerary form from the empty state button', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    fireEvent.click(await screen.findByRole('button', { name: /add itinerary/i }))

    expect(screen.getByRole('dialog', { name: /add itinerary/i })).toBeInTheDocument()
  })

  test('shows an error when submitting without a title', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    fireEvent.click(await screen.findByRole('button', { name: /add itinerary/i }))
    fireEvent.click(screen.getByRole('button', { name: /create itinerary/i }))

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(createItinerary).not.toHaveBeenCalled()
  })

  test('shows an error when no destinations are selected', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    fireEvent.click(await screen.findByRole('button', { name: /add itinerary/i }))
    await userEvent.type(screen.getByLabelText(/title/i), 'Weekend trip')
    fireEvent.click(screen.getByRole('button', { name: /create itinerary/i }))

    expect(await screen.findByText(/choose at least one destination/i)).toBeInTheDocument()
    expect(createItinerary).not.toHaveBeenCalled()
  })

  test('clicking choose destinations navigates to /destinations', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    fireEvent.click(await screen.findByRole('button', { name: /add itinerary/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose destinations/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/destinations')
  })

  test('the itineraries options menu shows a disabled delete action', async () => {
    getItineraries.mockResolvedValue({ itineraries: [ITINERARY] })
    renderItineraries()

    await screen.findByText('Weekend in Yaounde')
    fireEvent.click(screen.getByRole('button', { name: /itinerary options/i }))

    const deleteButton = screen.getByRole('button', { name: /delete itinerary/i })
    expect(deleteButton).toBeDisabled()
  })

  test('renders the bottom nav', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    renderItineraries()

    await screen.findByText('No itinerary')
    expect(screen.getByRole('link', { name: /destinations/i })).toHaveAttribute('href', '/destinations')
    expect(screen.getByRole('link', { name: /^home$/i })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: /itineraries/i })).toHaveAttribute('href', '/itineraries')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
  })

  test('shows previously selected destinations when returning from selection', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })

    function SeedSelection() {
      const { toggleDestination, confirmSelection } = useItineraryDraft()
      useEffect(() => {
        toggleDestination('dest_001')
        confirmSelection()
      }, [])
      return null
    }

    render(
      <MemoryRouter>
        <ItineraryDraftProvider>
          <SeedSelection />
          <Itineraries />
        </ItineraryDraftProvider>
      </MemoryRouter>
    )

    expect(await screen.findByRole('dialog', { name: /add itinerary/i })).toBeInTheDocument()
    expect(screen.getByText(/1 destination selected/i)).toBeInTheDocument()
    expect(await screen.findByText('Marche Central')).toBeInTheDocument()
  })

  test('creates an itinerary and prepends it to the list on success', async () => {
    getItineraries.mockResolvedValue({ itineraries: [] })
    createItinerary.mockResolvedValueOnce({ itinerary: { ...ITINERARY, id: 'itin_new' } })

    function SeedSelection() {
      const { toggleDestination, confirmSelection } = useItineraryDraft()
      useEffect(() => {
        toggleDestination('dest_001')
        confirmSelection()
      }, [])
      return null
    }

    render(
      <MemoryRouter>
        <ItineraryDraftProvider>
          <SeedSelection />
          <Itineraries />
        </ItineraryDraftProvider>
      </MemoryRouter>
    )

    await screen.findByRole('dialog', { name: /add itinerary/i })
    await userEvent.type(screen.getByLabelText(/title/i), 'Weekend trip')
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-03' } })

    fireEvent.click(screen.getByRole('button', { name: /create itinerary/i }))

    await waitFor(() => {
      expect(createItinerary).toHaveBeenCalledWith({
        title: 'Weekend trip',
        destinations: ['dest_001'],
        start_date: '2026-08-01',
        end_date: '2026-08-03'
      })
    })

    expect(await screen.findByText('Weekend in Yaounde')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})