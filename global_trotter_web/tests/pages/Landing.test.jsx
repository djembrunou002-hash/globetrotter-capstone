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
})