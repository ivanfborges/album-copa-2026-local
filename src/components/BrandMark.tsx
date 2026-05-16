import { useState } from 'react'

const customBrandSrc = '/brand/custom-mark.png'
const fallbackBrandSrc = '/brand/app-mark.svg'

type BrandMarkProps = {
  className?: string
  alt?: string
}

export function BrandMark({ className, alt = '' }: BrandMarkProps) {
  const [src, setSrc] = useState(customBrandSrc)

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={() => setSrc((currentSrc) => (currentSrc === fallbackBrandSrc ? currentSrc : fallbackBrandSrc))}
    />
  )
}
