export const CATEGORY_META = {
  destination: { label: 'Destination', color: '#F2B705' },
  searched: { label: 'Searched place', color: '#2461A6' },
  restaurant: { label: 'Restaurant', color: '#C8102E' },
  cafe: { label: 'Cafe', color: '#D9702E' },
  hotel: { label: 'Hotel', color: '#2461A6' },
  pharmacy: { label: 'Pharmacy', color: '#1F8A57' },
  hospital: { label: 'Hospital', color: '#1F8A57' },
  atm: { label: 'ATM / Bank', color: '#6B4EA0' },
  fuel: { label: 'Fuel station', color: '#6B6558' },
  transport: { label: 'Transport', color: '#0B3D24' },
  other: { label: 'Other service', color: '#8A8372' }
}

export function buildStraightLineGeoJson(points) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: points.map(([lat, lng]) => [lng, lat])
        }
      }
    ]
  }
}