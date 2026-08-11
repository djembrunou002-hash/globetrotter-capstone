import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Landing from '../../src/pages/Landing.jsx'
import { getDestinations, getDestinationStats } from '../../src/services/destinationService.js'
import { getUserStats } from '../../src/services/userService.js'
import { clearLandingCache } from '../../src/utils/landingCache.js'

jest.mock('../../src/services/destinationService.js')
jest.mock('../../src/services/userService.js')

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const DESTINATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: `dest_${i + 1}`,
  name: `Destination ${i + 1}`,
  area: 'Centre-ville',
  type: 'market',
  tags: ['food'],
  budget_level: 'low',
  budget: { is_free: true, amount_label: 'Free to browse', note: '' },
  hours: { always_open: true, open: '', close: '', note: '' },
  rating: { average: 4, count: 10 },
  images: []
}))

async function renderLanding() {
  const result = render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  )
  await act(async () => {})
  return result
}

beforeEach(() => {
  jest.clearAllMocks()
  clearLandingCache()
  getUserStats.mockResolvedValue({ user_count: 128 })
  getDestinationStats.mockResolvedValue({ destination_count: 45 })
  getDestinations.mockResolvedValue({ destinations: DESTINATIONS })
})

describe('Landing', () => {
  test('renders the headline', async () => {
    await renderLanding()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  test('renders sign up links pointing to /register', async () => {
    await renderLanding()
    const links = screen.getAllByRole('link', { name: /sign up/i })
    expect(links).toHaveLength(2)
    links.forEach(link => {
      expect(link).toHaveAttribute('href', '/register')
    })
  })

  test('renders a log in link pointing to /login', async () => {
    await renderLanding()
    const link = screen.getByRole('link', { name: /log in/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  test('renders the logo as a link to /', async () => {
    await renderLanding()
    expect(screen.getByRole('link', { name: /globaltrotter/i })).toHaveAttribute('href', '/')
  })

  test('renders the showcase heading', async () => {
    await renderLanding()
    expect(screen.getByText(/beautiful areas to visit/i)).toBeInTheDocument()
  })

  test('renders exactly 5 showcase image tiles', async () => {
    const { container } = await renderLanding()
    expect(container.querySelectorAll('.landing__showcase-image').length).toBe(5)
  })

  test('falls back to a placeholder tile when a showcase image fails to load', async () => {
    await renderLanding()
    const images = screen.getAllByAltText('A beautiful area to visit in Cameroon')
    const firstImage = images[0]

    fireEvent.error(firstImage)

    expect(await screen.findAllByAltText('A beautiful area to visit in Cameroon')).toHaveLength(4)
  })

  test('shows user and destination counts once loaded', async () => {
    await renderLanding()

    expect(await screen.findByText('128+')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  test('shows a placeholder for stats that fail to load', async () => {
    getUserStats.mockRejectedValue(new Error('network error'))
    await renderLanding()

    await screen.findByText('45')
    expect(screen.getAllByText('\u2014').length).toBeGreaterThan(0)
  })

  test('renders at most 10 featured destination cards', async () => {
    await renderLanding()

    const cards = await screen.findAllByRole('button', { name: /view details for/i })
    expect(cards.length).toBe(10)
  })

  test('renders fewer cards when fewer destinations exist', async () => {
    getDestinations.mockResolvedValue({ destinations: DESTINATIONS.slice(0, 3) })
    await renderLanding()

    const cards = await screen.findAllByRole('button', { name: /view details for/i })
    expect(cards.length).toBe(3)
  })

  test('renders a "See more" link to /register after the destination cards', async () => {
    await renderLanding()

    await screen.findAllByRole('button', { name: /view details for/i })
    expect(screen.getByRole('link', { name: /see more/i })).toHaveAttribute('href', '/register')
  })

  test('sends a guest to /login when they try to favorite a featured card', async () => {
    await renderLanding()

    const buttons = await screen.findAllByRole('button', { name: /add to favorites/i })
    fireEvent.click(buttons[0])

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('sends a guest to /login when they try to rate a featured card', async () => {
    await renderLanding()

    const stars = await screen.findAllByRole('button', { name: /rate 3 stars/i })
    fireEvent.click(stars[0])

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})