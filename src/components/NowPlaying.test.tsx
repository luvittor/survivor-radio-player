import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialStatus } from '../test/mockData'
import { NowPlaying } from './NowPlaying'

describe('NowPlaying', () => {
  it('renderiza mídia, progresso e controles', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<NowPlaying status={initialStatus()} loading={false} pending={null} onAction={onAction} />)

    expect(screen.getByRole('heading', { name: 'Because You Loved Me' })).toBeInTheDocument()
    expect(screen.getByText('Suzann Rye')).toBeInTheDocument()
    expect(screen.getByText('Flash Balada')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')

    await user.click(screen.getByRole('button', { name: 'Reiniciar faixa' }))
    expect(onAction).toHaveBeenCalledWith('restart')
  })

  it('mantém a capa e mostra overlay durante pausa', () => {
    render(<NowPlaying status={{ ...initialStatus(), paused: true }} loading={false} pending={null} onAction={vi.fn()} />)
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByAltText('Capa de Flash Balada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeEnabled()
  })

  it('usa a identidade live, ignora a capa da faixa e bloqueia controles', () => {
    render(<NowPlaying status={{ ...initialStatus(), mode: 'live-uplink', live_connected: true }} loading={false} pending={null} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Ao vivo' })).toBeInTheDocument()
    expect(screen.getByText('TRANSMISSÃO DA REDE')).toBeInTheDocument()
    expect(screen.getByAltText('Transmissão ao vivo')).toHaveAttribute('src', '/live.svg')
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeDisabled()
  })

  it('renderiza estados de conexão e mídia vazia', () => {
    const { rerender } = render(<NowPlaying status={null} loading pending={null} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Conectando…' })).toBeInTheDocument()
    rerender(<NowPlaying status={{ ...initialStatus(), current_media: null }} loading={false} pending={null} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Nada tocando agora' })).toBeInTheDocument()
    expect(screen.getByText('—:—')).toBeInTheDocument()
  })
})
