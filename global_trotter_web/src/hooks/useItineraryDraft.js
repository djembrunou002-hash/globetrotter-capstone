import { useContext } from 'react'
import { ItineraryDraftContext } from '../context/ItineraryDraftContext.jsx'

export function useItineraryDraft() {
  const context = useContext(ItineraryDraftContext)
  if (!context) {
    throw new Error('useItineraryDraft must be used within an ItineraryDraftProvider')
  }
  return context
}