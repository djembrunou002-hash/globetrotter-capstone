import { useState } from 'react'

function ShowcaseImage({ src, alt }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className="landing__showcase-image landing__showcase-image--placeholder" aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt={alt}
      className="landing__showcase-image"
      onError={() => setFailed(true)}
    />
  )
}

export default ShowcaseImage