import { useState } from 'react'

type OptionalLocalImageProps = {
  src?: string
  sources?: string[]
  className?: string
  alt?: string
}

export function OptionalLocalImage({ src, sources, className, alt = '' }: OptionalLocalImageProps) {
  const imageSources = sources ?? (src ? [src] : [])
  const [sourceIndex, setSourceIndex] = useState(0)

  if (sourceIndex >= imageSources.length) {
    return null
  }

  return (
    <img
      className={className}
      src={imageSources[sourceIndex]}
      alt={alt}
      onError={() => setSourceIndex((currentIndex) => currentIndex + 1)}
    />
  )
}
