import { useEffect, useState } from 'react'

function useHeaderPassed(ref) {
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    function update() {
      const node = ref.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      setPassed(rect.height > 0 && rect.bottom <= 0)
    }

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [ref])

  return passed
}

export default useHeaderPassed