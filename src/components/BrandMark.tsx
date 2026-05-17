import { useState } from 'react'

const customBrandSrc = '/brand/custom-mark.png'
const fallbackBrandSrc = '/brand/app-mark.svg'

type BrandMarkProps = {
  className?: string
  alt?: string
  sources?: string[]
}

export function BrandMark({ className, alt = '', sources }: BrandMarkProps) {
  const imageSources = sources ?? [customBrandSrc, fallbackBrandSrc]
  const [sourceIndex, setSourceIndex] = useState(0)

  const src = imageSources[Math.min(sourceIndex, imageSources.length - 1)]

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setSourceIndex((currentIndex) => Math.min(currentIndex + 1, imageSources.length - 1))}
    />
  )
}
