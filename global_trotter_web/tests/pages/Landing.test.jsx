import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Landing from '../../src/pages/Landing.jsx'

function renderLanding() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  )
}

describe('Landing', () => {
  test('renders the headline', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  test('renders sign up links pointing to /register', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /sign up/i })
    expect(links).toHaveLength(2)
    links.forEach(link => {
      expect(link).toHaveAttribute('href', '/register')
    })
  })

  test('renders a log in link pointing to /login', () => {
    renderLanding()
    const link = screen.getByRole('link', { name: /log in/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  test('renders the logo as a link to /', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: /globaltrotter/i })).toHaveAttribute('href', '/')
  })

  test('renders the showcase heading', () => {
    renderLanding()
    expect(screen.getByText(/beautiful areas to visit/i)).toBeInTheDocument()
  })

  test('renders exactly 5 showcase image tiles', () => {
    const { container } = renderLanding()
    expect(container.querySelectorAll('.landing__showcase-image').length).toBe(5)
  })

  test('falls back to a placeholder tile when a showcase image fails to load', async () => {
    renderLanding()
    const images = screen.getAllByAltText('A beautiful area to visit in Cameroon')
    const firstImage = images[0]

    fireEvent.error(firstImage)

    expect(await screen.findAllByAltText('A beautiful area to visit in Cameroon')).toHaveLength(4)
  })
})