import { Trophy } from 'lucide-react'
import { getFlagIconSrc } from '../data/flags'

type FlagIconProps = {
  sectionCode: string
  label?: string
  className?: string
}

export function FlagIcon({ sectionCode, label, className = '' }: FlagIconProps) {
  const flagSrc = getFlagIconSrc(sectionCode)
  const classes = ['flag-frame', className].filter(Boolean).join(' ')

  if (flagSrc) {
    return (
      <span className={classes} title={label ?? `${sectionCode} flag`}>
        <img src={flagSrc} alt="" loading="lazy" />
      </span>
    )
  }

  return (
    <span className={`${classes} flag-frame-fallback`} title={label ?? sectionCode}>
      <Trophy size={16} aria-hidden="true" />
    </span>
  )
}
