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

  it('agrupa discos, permite escolher qual tocar e mostra as faixas por disco', async () => {
    const user = userEvent.setup()
    const onSelectFolder = vi.fn().mockResolvedValue(undefined)
    const albumFolders = [1, 2].map((disc) => ({
      folder: `Metro Tech 11 (2003) Disc ${disc}`,
      name: `Metro Tech 11 (2003) Disc ${disc}`,
      artwork_url: `/artwork/disc-${disc}`,
    }))
    server.use(http.get(/\/(?:api\/)?control\/catalog$/, ({ request }) => {
      const folder = new URL(request.url).searchParams.get('folder')
      if (!folder) return HttpResponse.json({ track_count: 2, folder_count: 2, folders: albumFolders })
      const disc = folder.endsWith('2') ? 2 : 1
      return HttpResponse.json({
        folder,
        exists: true,
        subfolders: [],
        tracks: [{
          index: 0,
          track: `0${disc} Track ${disc}.mp3`,
          name: `Track ${disc}`,
          metadata: { path: `${folder}/0${disc} Track ${disc}.mp3`, filename: `0${disc} Track ${disc}.mp3`, title: `Track ${disc}` },
        }],
      })
    }))
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={onSelectFolder} onSelectTrack={vi.fn()} onOpenNow={vi.fn()} />)

    const openAlbum = await screen.findByRole('button', { name: 'Abrir pasta Metro Tech 11 (2003)' })
    expect(screen.getAllByRole('button', { name: /Abrir pasta/ })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Escolher disco para tocar Metro Tech 11 (2003)' }))
    expect(screen.getByRole('group', { name: 'Discos de Metro Tech 11 (2003)' })).toBeInTheDocument()
    await user.click(screen.getByRole('heading', { name: 'Coleção' }))
    expect(screen.queryByRole('group', { name: 'Discos de Metro Tech 11 (2003)' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Escolher disco para tocar Metro Tech 11 (2003)' }))
    await user.click(screen.getByRole('button', { name: 'Disco 2' }))
    expect(onSelectFolder).toHaveBeenCalledWith('Metro Tech 11 (2003) Disc 2')

    await user.click(openAlbum)
    expect(await screen.findByRole('heading', { name: 'Disco 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Disco 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Track 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Track 2/ })).toBeInTheDocument()
  })

  it('ordena, filtra, abre uma pasta e seleciona uma faixa', async () => {
    const user = userEvent.setup()
    const onSelectTrack = vi.fn().mockResolvedValue(undefined)
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={onSelectTrack} onOpenNow={vi.fn()} />)

    const openButtons = await screen.findAllByRole('button', { name: /Abrir pasta/ })
    expect(openButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Abrir pasta Flash Balada', 'Abrir pasta Metro Tech 3', 'Abrir pasta Metro Tech 10',
    ])

    server.use(http.get(/\/(?:api\/)?control\/search$/, () => HttpResponse.json({ query: 'Metro Tech 3', total: 0, offset: 0, limit: 50, results: [] })))
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

  it('mostra álbuns e faixas na mesma busca e permite tocar a faixa encontrada', async () => {
    const user = userEvent.setup()
    const onSelectTrack = vi.fn().mockResolvedValue(undefined)
    server.use(http.get(/\/(?:api\/)?control\/search$/, ({ request }) => {
      const query = new URL(request.url).searchParams.get('q') || ''
      return HttpResponse.json({
        query, total: 1, offset: 0, limit: 50,
        results: [{
          index: 0, global_index: 4, name: '01 Because You Loved Me.mp3', track: 'Flash Balada/01 Because You Loved Me.mp3', folder: 'Flash Balada',
          metadata: { path: 'Flash Balada/01 Because You Loved Me.mp3', filename: '01 Because You Loved Me.mp3', title: 'Because You Loved Me', artist: 'Céline Dion', album: 'Flash Balada', track_number: '1', duration_seconds: 290 },
        }],
      })
    }))
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={onSelectTrack} onOpenNow={vi.fn()} />)

    await user.type(await screen.findByPlaceholderText('Buscar na coleção'), 'Flash Balada')

    expect(screen.getByRole('button', { name: 'Abrir pasta Flash Balada' })).toBeInTheDocument()
    const track = await screen.findByRole('button', { name: /Because You Loved Me/ }, { timeout: 3000 })
    expect(track).toHaveTextContent('Céline Dion')
    expect(track.querySelector('img')).toHaveAttribute('alt', 'Capa de Flash Balada')
    await user.click(track)
    expect(onSelectTrack).toHaveBeenCalledWith('Flash Balada', 'Flash Balada/01 Because You Loved Me.mp3')
  })

  it('carrega automaticamente a próxima página ao chegar ao fim dos resultados', async () => {
    const user = userEvent.setup()
    const offsets: number[] = []
    class IntersectingObserverMock {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        window.setTimeout(() => this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver), 0)
      }
      disconnect() {}
      unobserve() {}
      takeRecords() { return [] }
    }
    vi.stubGlobal('IntersectionObserver', IntersectingObserverMock)
    server.use(http.get(/\/(?:api\/)?control\/search$/, ({ request }) => {
      const url = new URL(request.url)
      const offset = Number(url.searchParams.get('offset'))
      offsets.push(offset)
      const results = Array.from({ length: offset === 0 ? 50 : 1 }, (_, index) => {
        const number = offset + index
        return { index: number, global_index: number, name: `Song ${number}.mp3`, track: `Album/Song ${number}.mp3`, folder: 'Album', metadata: { path: `Album/Song ${number}.mp3`, filename: `Song ${number}.mp3`, title: `Song ${number}`, artist: 'Singer' } }
      })
      return HttpResponse.json({ query: url.searchParams.get('q'), total: 51, offset, limit: 50, results })
    }))
    render(<Albums status={initialStatus()} pending={null} onAction={vi.fn()} onSelectFolder={vi.fn()} onSelectTrack={vi.fn()} onOpenNow={vi.fn()} />)

    await user.type(await screen.findByPlaceholderText('Buscar na coleção'), 'Singer')
    expect(await screen.findByRole('button', { name: /Song 50/ }, { timeout: 4000 })).toBeInTheDocument()
    expect(offsets).toEqual([0, 50])
    expect(screen.queryByRole('button', { name: /Carregar mais faixas/ })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
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
