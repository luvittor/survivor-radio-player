import { useEffect, useMemo, useState } from 'react'
import { versionedArtworkUrl } from '../api'
import type { RadioStatus } from '../types'
import { formatTime, formatTrackNumber, isLive, joinArtist } from '../utils'
import { Artwork } from './Artwork'
import { MarqueeText } from './MarqueeText'
import { PlayerControls } from './PlayerControls'

type Props = {
  status: RadioStatus | null
  loading: boolean
  pending: string | null
  onAction: (action: 'previous' | 'restart' | 'pause' | 'play' | 'next') => void
  onOpenAlbum?: () => void
}

export function NowPlaying({ status, loading, pending, onAction, onOpenAlbum }: Props) {
  const live = isLive(status)
  const media = status?.current_media
  const duration = media?.duration_seconds
  const trackNumber = formatTrackNumber(media?.track_number)
  const currentFolderName = status?.current_folder?.split(/[\\/]/).filter(Boolean).pop()
  const discMatch = currentFolderName?.match(/(?:^|[\s_-])disc\s+(\d+)$/i)
  const folderDisplayName = discMatch ? currentFolderName?.replace(/[\s_-]*disc\s+\d+$/i, '').trim() : currentFolderName

  const artwork = media?.artwork?.available ? media.artwork.url : undefined
  const mediaKey = media?.path
  const backdrop = useMemo(() => live ? `${import.meta.env.BASE_URL}live.svg` : versionedArtworkUrl(artwork, mediaKey) || `${import.meta.env.BASE_URL}media-placeholder.svg`, [artwork, live, mediaKey])
  const disabled = !status || live || Boolean(pending)

  return (
    <section className="now-playing" aria-labelledby="now-title">
      <div className="artwork-backdrop" style={{ backgroundImage: `url(${JSON.stringify(backdrop).slice(1, -1)})` }} />
      <div className="now-content">
        <div className="cover-shell">
          <button className="cover-open" disabled={!status?.current_folder || !media || live} onClick={onOpenAlbum} aria-label={`Abrir álbum ${media?.album || status?.current_folder || 'atual'}`}>
            <Artwork className="cover-art" src={artwork} cacheKey={mediaKey} live={live} alt={live ? 'Transmissão ao vivo' : media?.album ? `Capa de ${media.album}` : 'Capa da mídia atual'} />
          </button>
          {status?.paused && <span className="paused-overlay">PAUSED</span>}
          {live && <span className="live-badge"><span /> LIVE</span>}
        </div>

        <div className="track-info">
          {live && <p className="eyebrow">TRANSMISSÃO DA REDE</p>}
          {!live && (discMatch || trackNumber) && (
            <div className="track-labels" aria-label={[discMatch && `Disco ${discMatch[1]}`, trackNumber && `Faixa ${trackNumber}`].filter(Boolean).join(' ')}>
              {discMatch && <span className="track-label">Disco {discMatch[1]}</span>}
              {trackNumber && <span className="track-label">Faixa {trackNumber}</span>}
            </div>
          )}
          <h1 id="now-title"><MarqueeText>{loading && !status ? 'Conectando…' : live ? 'Ao vivo' : media?.title || media?.filename || 'Nada tocando agora'}</MarqueeText></h1>
          <p className="artist"><MarqueeText>{live ? 'Sinal externo conectado' : joinArtist(status)}</MarqueeText></p>
          {!live && folderDisplayName && <p className="album"><MarqueeText>{folderDisplayName}</MarqueeText></p>}

          <ProgressBlock key={`${media?.path}-${status?.position_seconds}-${status?.paused}`} initialPosition={status?.position_seconds ?? 0} duration={duration} running={Boolean(status && !status.paused && !live)} />

          <PlayerControls paused={Boolean(status?.paused)} disabled={disabled} pending={pending} onAction={onAction} />

          {live && <p className="live-note">Os controles do catálogo ficam disponíveis quando a transmissão ao vivo terminar.</p>}
        </div>
      </div>
    </section>
  )
}

function ProgressBlock({ initialPosition, duration, running }: { initialPosition: number; duration?: number; running: boolean }) {
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setPosition((value) => Math.min(duration ?? Infinity, value + 1)), 1000)
    return () => window.clearInterval(timer)
  }, [duration, running])

  const progress = duration && duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  return (
    <div className="progress-block" aria-label={`Progresso: ${formatTime(position)} de ${formatTime(duration)}`}>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={position}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-times"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div>
    </div>
  )
}
