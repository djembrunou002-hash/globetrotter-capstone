import { createContext } from 'react'

export const ItineraryDraftContext = createContext(null)

export const EMPTY_DRAFT = {
  title: '',
  tags: '',
  startDate: '',
  endDate: '',
  selectedDestinationIds: []
}