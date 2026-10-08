import { Icon } from './Icons'

type Props = {
  paused: boolean
  disabled: boolean
  compact?: boolean
  pending?: string | null
  onAction: (action: 'previous' | 'restart' | 'pause' | 'play' | 'next') => void
}

export function PlayerControls({ paused, disabled, compact = false, pending, onAction }: Props) {
  const toggle = paused ? 'play' : 'pause'
  return (
    <div className={`player-controls${compact ? ' player-controls--compact' : ''}`} aria-label="Controles de reprodução">
      <button className="icon-button" disabled={disabled} onClick={() => onAction('previous')} aria-label="Faixa anterior">
        <Icon name="previous" />
      </button>
      {!compact && (
        <button className="icon-button" disabled={disabled} onClick={() => onAction('restart')} aria-label="Reiniciar faixa">
          <Icon name="restart" />
        </button>
      )}
      <button className="play-button" disabled={disabled} onClick={() => onAction(toggle)} aria-label={paused ? 'Reproduzir' : 'Pausar'} aria-busy={pending === toggle}>
        <Icon name={paused ? 'play' : 'pause'} />
      </button>
      <button className="icon-button" disabled={disabled} onClick={() => onAction('next')} aria-label="Próxima faixa">
        <Icon name="next" />
      </button>
    </div>
  )
}
