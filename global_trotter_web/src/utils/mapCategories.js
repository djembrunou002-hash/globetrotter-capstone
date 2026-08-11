export const CATEGORY_META = {
  destination: { labelKey: 'mapCategories.destination', color: '#F2B705' },
  visited: { labelKey: 'mapCategories.visited', color: '#8A8372' },
  searched: { labelKey: 'mapCategories.searched', color: '#2461A6' },
  start: { labelKey: 'mapCategories.start', color: '#00897B' },
  linked: { labelKey: 'mapCategories.linked', color: '#F2B705' },
  restaurant: { labelKey: 'mapCategories.restaurant', color: '#C8102E' },
  cafe: { labelKey: 'mapCategories.cafe', color: '#D9702E' },
  hotel: { labelKey: 'mapCategories.hotel', color: '#2461A6' },
  pharmacy: { labelKey: 'mapCategories.pharmacy', color: '#1F8A57' },
  hospital: { labelKey: 'mapCategories.hospital', color: '#1F8A57' },
  atm: { labelKey: 'mapCategories.atm', color: '#6B4EA0' },
  fuel: { labelKey: 'mapCategories.fuel', color: '#6B6558' },
  transport: { labelKey: 'mapCategories.transport', color: '#0B3D24' },
  other: { labelKey: 'mapCategories.other', color: '#8A8372' }
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