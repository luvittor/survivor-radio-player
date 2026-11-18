import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { initialStatus, makeFolderDetail, mockFolders } from '../test/mockData'
import { server } from '../test/server'
import { Albums } from './Albums'

describe('Coleção', () => {
  it('mostra pasta, disco e faixa em linhas compactas sem incluir o álbum da tag', async () => {
    const status = initialStatus()
    status.current_folder = 'Playlists/Flash Balada - Disc 2'
    status.current_media = { ...status.current_media!, album: 'Album da tag', track_number: '1/12' }
    const props = { pending: null, onAction: vi.fn(), onSelectFolder: vi.fn(), onSelectTrack: vi.fn(), onOpenNow: vi.fn() }
    const { rerender } = render(<Albums status={status} {...props} />)
    await screen.findByRole('heading', { name: 'Coleção' })
    expect(screen.getByText('Because You Loved Me')).toBeInTheDocument()
    const compactPlayer = within(screen.getByRole('button', { name: 'Abrir tela Agora pelo player compacto' }))
    expect(compactPlayer.getByText('Flash Balada')).toBeInTheDocument()
    expect(compactPlayer.getByText('Disco 2')).toBeInTheDocument()
    expect(compactPlayer.getByText('Faixa 01')).toBeInTheDocument()
    expect(compactPlayer.queryByText('Album da tag')).not.toBeInTheDocument()

    rerender(<Albums status={{ ...status, current_media: { ...status.current_media!, track_number: undefined } }} {...props} />)
    expect(compactPlayer.queryByText('Faixa 01')).not.toBeInTheDocument()
    expect(compactPlayer.getByText('Because You Loved Me')).toBeInTheDocument()
  })

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
        onOpenNow={vi.fn()}
      />,
    )

    expect(screen.getByText('Abrindo sua coleção…')).toBeInTheDocument()
    const quickPlay = await screen.findByRole('button', { name: 'Tocar pasta Flash Balada' })
    await user.click(quickPlay)

    expect(onSelectFolder).toHaveBeenCalledWith('Flash Balada')
    expect(screen.getByRole('heading', { name: 'Coleção' })).toBeInTheDocument()
  })

  it('ordena, filtra, abre uma pasta e seleciona uma faixa', async () => {
    const user = userEvent.setup()
    const onSelectTrack = vi.fn().mockResolvedValue(undefined)
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={onSelectTrack} onOpenNow={vi.fn()} />)

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
    expect(screen.getByRole('button', { name: /Total Eclipse of the Heart/ }).querySelector('.track-number')).toBeEmptyDOMElement()
    await user.click(screen.getByRole('button', { name: /Total Eclipse of the Heart/ }))
    expect(onSelectTrack).toHaveBeenCalledWith('Flash Balada', '02 Total Eclipse of the Heart.mp3')

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Coleção' })).toBeInTheDocument()
  })

  it('mostra na lista somente o número da tag do MP3', async () => {
    server.use(http.get(/\/(?:api\/)?control\/catalog$/, ({ request }) => {
      const folder = new URL(request.url).searchParams.get('folder')
      if (folder) {
        const detail = makeFolderDetail(folder)
        detail.tracks[0].metadata = { ...detail.tracks[0].metadata!, track_number: '7/14' }
        return HttpResponse.json(detail)
      }
      return HttpResponse.json({ track_count: 4, folder_count: mockFolders.length, folders: mockFolders })
    }))
    const user = userEvent.setup()
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={vi.fn()} onOpenNow={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Abrir pasta Flash Balada' }))
    const first = await screen.findByRole('button', { name: /Because You Loved Me/ })
    expect(first.querySelector('.track-number')).toHaveTextContent('07')
    expect(screen.getByRole('button', { name: /Total Eclipse of the Heart/ }).querySelector('.track-number')).toBeEmptyDOMElement()
  })

  it('mostra erro de catálogo e oferece nova tentativa', async () => {
    server.use(http.get(/\/(?:api\/)?control\/catalog$/, () => HttpResponse.json({}, { status: 500 })))
    const user = userEvent.setup()
    render(<Albums status={null} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={vi.fn()} onOpenNow={vi.fn()} />)

    expect(await screen.findByText('Catálogo indisponível')).toBeInTheDocument()
    expect(screen.getByText('Servidor respondeu 500')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Catálogo indisponível')).toBeInTheDocument()
  })
})
