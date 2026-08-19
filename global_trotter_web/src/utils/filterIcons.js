const TYPE_ICONS = {
  attraction: '✨',
  bar: '🍸',
  entertainment: '🎬',
  hotel: '🏨',
  market: '🧺',
  monument: '🗿',
  museum: '🏛️',
  nature: '🌿',
  nightlife: '🌃',
  park: '🌳',
  restaurant: '🍽️',
  sports: '🏟️',
  'street-food': '🍢'
}

const BUDGET_ICONS = {
  low: '🪙',
  medium: '💵',
  high: '💎'
}

const TAG_ICONS = {
  adventure: '🧗',
  animals: '🐾',
  architecture: '🏛️',
  art: '🎨',
  asian: '🥢',
  bar: '🍸',
  boating: '🛶',
  buffet: '🍽️',
  business: '💼',
  casual: '😎',
  chinese: '🥡',
  cinema: '🎬',
  clothing: '👗',
  cocktails: '🍹',
  concerts: '🎤',
  crafts: '🧶',
  culture: '🎭',
  dining: '🍴',
  drinks: '🥤',
  ecotourism: '♻️',
  education: '📚',
  entertainment: '🎉',
  events: '📅',
  excursion: '🚐',
  family: '👨‍👩‍👧',
  'fine-dining': '🥂',
  fishing: '🎣',
  food: '🍲',
  football: '⚽',
  forest: '🌲',
  french: '🥖',
  'fresh-air': '💨',
  golf: '⛳',
  'grilled-fish': '🐟',
  heritage: '🏺',
  hiking: '🥾',
  history: '📜',
  hotel: '🏨',
  italian: '🍝',
  lake: '🏞️',
  landmark: '📍',
  leisure: '🛋️',
  local: '🏘️',
  lodging: '🛏️',
  lounge: '🛋️',
  luxury: '💎',
  market: '🧺',
  mediterranean: '🫒',
  monument: '🗿',
  movies: '🎥',
  museum: '🏛️',
  music: '🎵',
  nature: '🌿',
  nightlife: '🌃',
  park: '🌳',
  photography: '📷',
  pizza: '🍕',
  pool: '🏊',
  primates: '🦍',
  relaxation: '🧘',
  religion: '⛪',
  river: '🏞️',
  seafood: '🦐',
  shopping: '🛍️',
  soya: '🍢',
  sports: '🏅',
  stadium: '🏟️',
  'street-food': '🍢',
  university: '🎓',
  urban: '🏙️',
  viewpoint: '🔭',
  walk: '🚶',
  waterfall: '💦',
  wildlife: '🦁',
  wine: '🍷',
  zoo: '🦓'
}

export function getTypeIcon(type) {
  if (!type) return '📍'
  return TYPE_ICONS[String(type).toLowerCase()] || '📍'
}

export function getBudgetIcon(level) {
  if (!level) return '💰'
  return BUDGET_ICONS[String(level).toLowerCase()] || '💰'
}

export function getTagIcon(tag) {
  if (!tag) return '🏷️'
  return TAG_ICONS[String(tag).toLowerCase()] || '🏷️'
}