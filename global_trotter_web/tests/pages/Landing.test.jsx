import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Landing from '../../src/pages/Landing.jsx'

describe('Landing', () => {
  function renderLanding() {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    )
  }

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
})