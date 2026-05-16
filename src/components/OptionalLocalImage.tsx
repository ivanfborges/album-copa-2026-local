import { useState } from 'react'

type OptionalLocalImageProps = {
  src: string
  className?: string
  alt?: string
}

export function OptionalLocalImage({ src, className, alt = '' }: OptionalLocalImageProps) {
  const [isMissing, setIsMissing] = useState(false)

  if (isMissing) {
    return null
  }

  return <img className={className} src={src} alt={alt} onError={() => setIsMissing(true)} />
}
