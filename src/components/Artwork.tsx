import { useState } from 'react'
import { versionedArtworkUrl } from '../api'

type Props = {
  src?: string
  alt: string
  live?: boolean
  className?: string
  cacheKey?: string
}

export function Artwork({ src, alt, live = false, className = '', cacheKey }: Props) {
  const placeholder = `${import.meta.env.BASE_URL}icon.png`
  const liveArt = `${import.meta.env.BASE_URL}live.svg`
  const resolved = live ? liveArt : versionedArtworkUrl(src, cacheKey) || placeholder
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const image = failedSource === resolved ? (live ? `${import.meta.env.BASE_URL}live.png` : placeholder) : resolved

  return (
    <img
      className={className}
      src={image}
      alt={alt}
      onError={() => setFailedSource(resolved)}
    />
  )
}
