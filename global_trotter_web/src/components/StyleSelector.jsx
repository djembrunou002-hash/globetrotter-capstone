import { TRAVEL_STYLES } from '../constants/travelStyles.js'
import '../styles/StyleSelector.css'

function StyleSelector({ selected, onToggle }) {
  return (
    <div className="style-selector">
      {TRAVEL_STYLES.map(style => {
        const isSelected = selected.includes(style.value)
        return (
          <button
            key={style.value}
            type="button"
            className={`style-selector__chip${isSelected ? ' style-selector__chip--selected' : ''}`}
            onClick={() => onToggle(style.value)}
            aria-pressed={isSelected}
          >
            <span className="style-selector__emoji">{style.emoji}</span>
            {style.label}
          </button>
        )
      })}
    </div>
  )
}

export default StyleSelector