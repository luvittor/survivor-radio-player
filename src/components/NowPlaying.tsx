import { useEffect, useMemo, useState } from 'react'
import { apiUrl } from '../api'
import type { RadioStatus } from '../types'
import { formatTime, isLive, joinArtist } from '../utils'
import { Artwork } from './Artwork'
import { Icon } from './Icons'
import { PlayerControls } from './PlayerControls'

type Props = {
  status: RadioStatus | null
  loading: boolean
  pending: string | null
  onAction: (action: 'previous' | 'restart' | 'pause' | 'play' | 'next' | 'previous-folder' | 'next-folder') => void
}

export function NowPlaying({ status, loading, pending, onAction }: Props) {
  const live = isLive(status)
  const media = status?.current_media
  const duration = media?.duration_seconds

  const artwork = media?.artwork?.available ? media.artwork.url : undefined
  const backdrop = useMemo(() => live ? `${import.meta.env.BASE_URL}live.svg` : artwork ? apiUrl(artwork) : `${import.meta.env.BASE_URL}icon.png`, [artwork, live])
  const disabled = !status || live || Boolean(pending)

  return (
    <section className="now-playing" aria-labelledby="now-title">
      <div className="artwork-backdrop" style={{ backgroundImage: `url(${JSON.stringify(backdrop).slice(1, -1)})` }} />
      <div className="now-content">
        <div className="cover-shell">
          <Artwork className="cover-art" src={artwork} live={live} alt={live ? 'Transmissão ao vivo' : media?.album ? `Capa de ${media.album}` : 'Capa da mídia atual'} />
          {status?.paused && <span className="paused-overlay">PAUSED</span>}
          {live && <span className="live-badge"><span /> LIVE</span>}
        </div>

        <div className="track-info">
          <p className="eyebrow">{live ? 'TRANSMISSÃO DA REDE' : status?.current_folder || 'SURVIVOR RADIO'}</p>
          <h1 id="now-title">{loading && !status ? 'Conectando…' : live ? 'Ao vivo' : media?.title || media?.filename || 'Nada tocando agora'}</h1>
          <p className="artist">{live ? 'Sinal externo conectado' : joinArtist(status)}</p>
          {!live && media?.album && <p className="album">{media.album}</p>}

          <ProgressBlock key={`${media?.path}-${status?.position_seconds}-${status?.paused}`} initialPosition={status?.position_seconds ?? 0} duration={duration} running={Boolean(status && !status.paused && !live)} />

          <PlayerControls paused={Boolean(status?.paused)} disabled={disabled} pending={pending} onAction={onAction} />

          <div className="folder-controls">
            <button disabled={disabled} onClick={() => onAction('previous-folder')}><Icon name="chevronLeft" /> Pasta anterior</button>
            <button disabled={disabled} onClick={() => onAction('next-folder')}>Próxima pasta <Icon name="chevronRight" /></button>
          </div>

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
