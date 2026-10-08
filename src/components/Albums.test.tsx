import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { initialStatus } from '../test/mockData'
import { server } from '../test/server'
import { Albums } from './Albums'

describe('Pastas', () => {
  it('toca uma pasta pelo botão sobre a capa sem abrir sua lista', async () => {
    const user = userEvent.setup()
    const onSelectFolder = vi.fn().mockResolvedValue(undefined)

    render(
      <Albums
        status={initialStatus()}
        pending={null}
        onAction={vi.fn()}
        onSelectFolder={onSelectFolder}
        onSelectTrack={vi.fn()}
      />,
    )

    expect(screen.getByText('Abrindo sua coleção…')).toBeInTheDocument()
    const quickPlay = await screen.findByRole('button', { name: 'Tocar pasta Flash Balada' })
    await user.click(quickPlay)

    expect(onSelectFolder).toHaveBeenCalledWith('Flash Balada')
    expect(screen.getByRole('heading', { name: 'Pastas' })).toBeInTheDocument()
  })

  it('ordena, filtra, abre uma pasta e seleciona uma faixa', async () => {
    const user = userEvent.setup()
    const onSelectTrack = vi.fn().mockResolvedValue(undefined)
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={onSelectTrack} />)

    const openButtons = await screen.findAllByRole('button', { name: /Abrir pasta/ })
    expect(openButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Abrir pasta Flash Balada', 'Abrir pasta Metro Tech 3', 'Abrir pasta Metro Tech 10',
    ])

    const search = screen.getByPlaceholderText('Buscar na coleção')
    await user.type(search, 'Metro Tech 3')
    expect(screen.queryByRole('button', { name: 'Abrir pasta Metro Tech 10' })).not.toBeInTheDocument()
    await user.clear(search)

    await user.click(screen.getByRole('button', { name: 'Abrir pasta Flash Balada' }))
    expect(await screen.findByRole('heading', { name: 'Flash Balada' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Total Eclipse of the Heart/ }))
    expect(onSelectTrack).toHaveBeenCalledWith('Flash Balada', '02 Total Eclipse of the Heart.mp3')

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Pastas' })).toBeInTheDocument()
  })

  it('mostra erro de catálogo e oferece nova tentativa', async () => {
    server.use(http.get(/\/(?:api\/)?control\/catalog$/, () => HttpResponse.json({}, { status: 500 })))
    const user = userEvent.setup()
    render(<Albums status={null} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={vi.fn()} />)

    expect(await screen.findByText('Catálogo indisponível')).toBeInTheDocument()
    expect(screen.getByText('Servidor respondeu 500')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Catálogo indisponível')).toBeInTheDocument()
  })
})
