import { useState } from 'react'
import { ItineraryDraftContext, EMPTY_DRAFT } from './ItineraryDraftContext.jsx'

function ItineraryDraftProvider({ children }) {
  const [formOpen, setFormOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)

  function updateDraft(fields) {
    setDraft(prev => ({ ...prev, ...fields }))
  }

  function toggleDestination(destinationId) {
    setDraft(prev => {
      const isSelected = prev.selectedDestinationIds.includes(destinationId)
      return {
        ...prev,
        selectedDestinationIds: isSelected
          ? prev.selectedDestinationIds.filter(id => id !== destinationId)
          : [...prev.selectedDestinationIds, destinationId]
      }
    })
  }

  function startSelection() {
    setSelectionMode(true)
  }

  function confirmSelection() {
    setSelectionMode(false)
    setFormOpen(true)
  }

  function cancelSelection() {
    setSelectionMode(false)
    setFormOpen(true)
  }

  function openForm() {
    setDraft(EMPTY_DRAFT)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setSelectionMode(false)
    setDraft(EMPTY_DRAFT)
  }

  const value = {
    formOpen,
    selectionMode,
    draft,
    updateDraft,
    toggleDestination,
    startSelection,
    confirmSelection,
    cancelSelection,
    openForm,
    closeForm
  }

  return (
    <ItineraryDraftContext.Provider value={value}>
      {children}
    </ItineraryDraftContext.Provider>
  )
}

export default ItineraryDraftProvider