import { render, screen, fireEvent } from '@testing-library/react'
import DestinationCard from '../../src/components/DestinationCard.jsx'

const DESTINATION = {
  id: 'dest_001',
  name: 'Marche Central',
  area: 'Centre-ville',
  type: 'market',
  tags: ['food', 'shopping', 'local'],
  budget_level: 'low',
  rating: { average: 4.31, count: 56 },
  images: ['https://cdn.globetrotter.com/dest_001/main.jpg']
}

describe('DestinationCard', () => {
  test('renders name, area, type, tags, and budget level', () => {
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={false}
        isAuthenticated={true}
        onToggleFavorite={jest.fn()}
        onRate={jest.fn()}
      />
    )

    expect(screen.getByText('Marche Central')).toBeInTheDocument()
    expect(screen.getByText(/centre-ville · market/i)).toBeInTheDocument()
    expect(screen.getByText('food')).toBeInTheDocument()
    expect(screen.getByText('shopping')).toBeInTheDocument()
    expect(screen.getByText('local')).toBeInTheDocument()
    expect(screen.getByText(/low budget/i)).toBeInTheDocument()
  })

  test('the location button is disabled', () => {
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={false}
        isAuthenticated={true}
        onToggleFavorite={jest.fn()}
        onRate={jest.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /location/i })).toBeDisabled()
  })

  test('calls onToggleFavorite with the destination id', () => {
    const onToggleFavorite = jest.fn()
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={false}
        isAuthenticated={true}
        onToggleFavorite={onToggleFavorite}
        onRate={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /add to favorites/i }))
    expect(onToggleFavorite).toHaveBeenCalledWith('dest_001')
  })

  test('shows remove label when already a favorite', () => {
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={true}
        isAuthenticated={true}
        onToggleFavorite={jest.fn()}
        onRate={jest.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument()
  })

  test('calls onRate with the destination id and chosen star count', () => {
    const onRate = jest.fn()
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={false}
        isAuthenticated={true}
        onToggleFavorite={jest.fn()}
        onRate={onRate}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /rate 3 stars/i }))
    expect(onRate).toHaveBeenCalledWith('dest_001', 3)
  })

  test('falls back to a placeholder image on load failure', () => {
    render(
      <DestinationCard
        destination={DESTINATION}
        isFavorite={false}
        isAuthenticated={true}
        onToggleFavorite={jest.fn()}
        onRate={jest.fn()}
      />
    )

    const image = screen.getByAltText('Marche Central')
    fireEvent.error(image)

    expect(screen.queryByAltText('Marche Central')).not.toBeInTheDocument()
  })
})