import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App'
import { getMockState, server, setMockStatus } from './test/server'
import { mockLibrary } from './test/mockData'

describe('aplicativo integrado ao servidor simulado', () => {
  it('carrega o status, executa controles e recebe mudanças externas', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Because You Loved Me' })).toBeInTheDocument()
    expect(screen.getByAltText('Capa de Flash Balada')).toHaveAttribute('src', expect.stringContaining('Flash%20Balada'))

    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(await screen.findByText('PAUSED')).toBeInTheDocument()
    expect(getMockState().commands).toContain('pause')

    await user.click(screen.getByRole('button', { name: 'Reproduzir' }))
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: 'Próxima faixa' })
    await waitFor(() => expect(nextButton).toBeEnabled())
    await user.click(nextButton)
    await waitFor(() => expect(getMockState().commands).toContain('next'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByRole('heading', { name: 'Total Eclipse of the Heart' })).toBeInTheDocument()

    setMockStatus({
      current_folder: 'Metro Tech 3',
      track_index: 0,
      current_media: mockLibrary['Metro Tech 3'][0],
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByRole('heading', { name: 'Neon' })).toBeInTheDocument()
    expect(screen.getByAltText('Capa de Metro Tech 3')).toHaveAttribute('src', expect.stringContaining('Metro%20Tech%203'))
  })

  it('navega, busca, toca pastas e preserva pasta e rolagem entre abas', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Because You Loved Me' })

    await user.click(screen.getByRole('button', { name: 'Pastas' }))
    expect(await screen.findByRole('heading', { name: 'Pastas' })).toBeInTheDocument()

    const openButtons = screen.getAllByRole('button', { name: /Abrir pasta/ })
    expect(openButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Abrir pasta Flash Balada', 'Abrir pasta Metro Tech 3', 'Abrir pasta Metro Tech 10',
    ])

    await user.type(screen.getByPlaceholderText('Buscar na coleção'), 'Metro Tech 10')
    expect(screen.queryByRole('button', { name: 'Abrir pasta Flash Balada' })).not.toBeInTheDocument()
    await user.clear(screen.getByPlaceholderText('Buscar na coleção'))

    await user.click(screen.getByRole('button', { name: 'Tocar pasta Metro Tech 10' }))
    expect(await screen.findAllByText('Voltage')).not.toHaveLength(0)
    expect(getMockState().commands).toContain('select-folder:Metro Tech 10')

    await user.click(screen.getByRole('button', { name: 'Abrir pasta Flash Balada' }))
    expect(await screen.findByRole('heading', { name: 'Flash Balada' })).toBeInTheDocument()

    const foldersPanel = document.querySelector<HTMLElement>('[data-tab-panel="albums"]')
    expect(foldersPanel).not.toBeNull()
    foldersPanel!.scrollTop = 240

    await user.click(screen.getByRole('button', { name: 'Agora' }))
    await user.click(screen.getByRole('button', { name: 'Pastas' }))

    expect(screen.getByRole('heading', { name: 'Flash Balada' })).toBeInTheDocument()
    expect(foldersPanel!.scrollTop).toBe(240)

    await user.click(screen.getByRole('button', { name: /Total Eclipse of the Heart/ }))
    expect(getMockState().commands).toContain('select-track:Flash Balada/02 Total Eclipse of the Heart.mp3')
  })

  it('mostra o estado offline e permite tentar novamente', async () => {
    server.use(http.get(/\/(?:api\/)?status$/, () => HttpResponse.json({}, { status: 503 })))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText('Sem conexão: Servidor respondeu 503')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Sem conexão: Servidor respondeu 503')).toBeInTheDocument()
  })

  it('reflete pause e live acionados por outro dispositivo', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Because You Loved Me' })

    setMockStatus({ paused: true, pause_phase: 'paused' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByText('PAUSED')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeEnabled()

    setMockStatus({ live_connected: true, mode: 'live-uplink', paused: false, pause_phase: 'playing' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByRole('heading', { name: 'Ao vivo' })).toBeInTheDocument()
    expect(screen.getByAltText('Transmissão ao vivo')).toHaveAttribute('src', expect.stringContaining('live.svg'))
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima faixa' })).toBeDisabled()

    setMockStatus({ live_connected: false, mode: 'fallback-catalog', current_media: mockLibrary['Flash Balada'][1] })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(await screen.findByRole('heading', { name: 'Total Eclipse of the Heart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled()
  })
})
