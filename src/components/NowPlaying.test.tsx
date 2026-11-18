import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { initialStatus } from '../test/mockData'
import { NowPlaying } from './NowPlaying'

describe('NowPlaying', () => {
  it('renderiza mídia, progresso e controles', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    const status = initialStatus()
    status.current_folder = 'Playlists/Flash Balada'
    status.current_media = { ...status.current_media!, album: 'Album da tag' }
    render(<NowPlaying status={status} loading={false} pending={null} onAction={onAction} />)

    expect(screen.getByRole('heading', { name: 'Because You Loved Me' })).toBeInTheDocument()
    expect(screen.queryByText(/^FAIXA /)).not.toBeInTheDocument()
    expect(screen.getByText('Suzann Rye')).toBeInTheDocument()
    expect(screen.getByText('Flash Balada')).toBeInTheDocument()
    expect(screen.queryByText('Album da tag')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12')

    await user.click(screen.getByRole('button', { name: 'Reiniciar faixa' }))
    expect(onAction).toHaveBeenCalledWith('restart')
  })

  it('mostra apenas o número da tag, mesmo quando track_index é global', () => {
    const status = initialStatus()
    render(<NowPlaying status={{ ...status, track_index: 123, current_media: { ...status.current_media!, track_number: '2/12' } }} loading={false} pending={null} onAction={vi.fn()} />)

    expect(screen.getByText('Faixa 02')).toBeInTheDocument()
    expect(screen.queryByText('Faixa 124')).not.toBeInTheDocument()
  })

  it('move o sufixo Disc da pasta para uma etiqueta ao lado da faixa', () => {
    const status = initialStatus()
    status.current_folder = 'Playlists/Flash Balada - Disc 1'
    status.current_media = { ...status.current_media!, track_number: '6/12' }
    render(<NowPlaying status={status} loading={false} pending={null} onAction={vi.fn()} />)

    expect(screen.getByLabelText('Disco 1 Faixa 06')).toHaveClass('track-labels')
    expect(screen.getByText('Disco 1')).toHaveClass('track-label')
    expect(screen.getByText('Faixa 06')).toHaveClass('track-label')
    expect(screen.getByText('Flash Balada')).toBeInTheDocument()
    expect(screen.queryByText(/Disc 1/)).not.toBeInTheDocument()
  })

  it('mantém a capa e mostra overlay durante pausa', () => {
    render(<NowPlaying status={{ ...initialStatus(), paused: true }} loading={false} pending={null} onAction={vi.fn()} />)
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByAltText('Capa de Flash Balada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeEnabled()
  })

  it('usa a identidade live, ignora a capa da faixa e bloqueia controles', () => {
    const status = initialStatus()
    render(<NowPlaying status={{ ...status, mode: 'live-uplink', live_connected: true, current_media: { ...status.current_media!, track_number: '1' } }} loading={false} pending={null} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Ao vivo' })).toBeInTheDocument()
    expect(screen.getByText('TRANSMISSÃO DA REDE')).toBeInTheDocument()
    expect(screen.queryByText('Faixa 01')).not.toBeInTheDocument()
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
