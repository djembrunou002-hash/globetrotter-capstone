export function unseenKeysForRequest(unseenItems, requestId) {
  if (!requestId) return []
  return unseenItems.filter(item => item.request_id === requestId).map(item => item.key)
}

export function unseenKeysForDestinationCard(unseenItems, card) {
  if (!card) return []
  return unseenItems
    .filter(
      item =>
        (card.request_id && item.request_id === card.request_id) ||
        (card.id && item.destination_id === card.id)
    )
    .map(item => item.key)
}