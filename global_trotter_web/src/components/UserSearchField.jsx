import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../hooks/useTranslation.js'
import '../styles/UserSearchField.css'

const DEBOUNCE_MS = 250

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/).slice(0, 2)
  return parts.map(part => part.charAt(0).toUpperCase()).join('')
}

function UserSearchField({
  id,
  value,
  onChange,
  onSelect,
  search,
  placeholder,
  minLength = 2,
  disabled = false,
  autoFocus = false,
  renderMeta
}) {
  const { t } = useTranslation()

  const [term, setTerm] = useState('')
  const [results, setResults] = useState({ term: null, list: [] })
  const [dismissed, setDismissed] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  const searchRef = useRef(search)
  const ticketRef = useRef(0)
  const wrapRef = useRef(null)

  useEffect(() => {
    searchRef.current = search
  })

  useEffect(() => {
    if (term.length < minLength) return

    const ticket = ticketRef.current + 1
    ticketRef.current = ticket

    const timer = setTimeout(() => {
      Promise.resolve(searchRef.current(term))
        .then(items => {
          if (ticketRef.current !== ticket) return
          setResults({ term, list: items || [] })
          setHighlight(-1)
        })
        .catch(() => {
          if (ticketRef.current !== ticket) return
          setResults({ term, list: [] })
          setHighlight(-1)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [term, minLength])

  const searching = term.length >= minLength
  const loading = searching && results.term !== term
  const list = searching ? results.list : []
  const active = highlight < list.length ? highlight : -1
  const showPanel = searching && !dismissed && (loading || list.length > 0)

  useEffect(() => {
    if (!showPanel) return

    function handlePointer(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setDismissed(true)
    }

    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [showPanel])

  function choose(user) {
    ticketRef.current += 1
    setTerm('')
    setHighlight(-1)
    setDismissed(false)
    onSelect(user)
  }

  function handleInput(event) {
    const next = event.target.value
    setTerm(next.trim())
    setDismissed(false)
    onChange(next)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setDismissed(true)
      return
    }

    if (!showPanel || list.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight(index => (index + 1) % list.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight(index => (index <= 0 ? list.length - 1 : index - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      choose(list[active])
    }
  }

  return (
    <div className="user-search" ref={wrapRef}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setDismissed(false)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-autocomplete="list"
      />

      {showPanel && (
        <ul className="user-search__list" role="listbox">
          {loading && list.length === 0 && (
            <li className="user-search__hint">{t('userSearch.searching')}</li>
          )}

          {list.map((user, index) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`user-search__option ${index === active ? 'is-active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(user)}
              >
                <span className="user-search__avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>

                <span className="user-search__info">
                  <span className="user-search__contact">{user.email || user.number}</span>
                  <span className="user-search__name">{user.name}</span>
                </span>

                {renderMeta && <span className="user-search__meta">{renderMeta(user)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UserSearchField