import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, getCatalog, getStatus, runControl, searchCatalog, selectFolder, selectTrack, versionedArtworkUrl } from './api'
import { getMockState, server } from './test/server'

describe('API', () => {
  it('normaliza caminhos relativos e URLs completas para o proxy', () => {
    expect(apiUrl('status')).toBe('/api/status')
    expect(apiUrl('/status')).toBe('/api/status')
    expect(apiUrl('http://radio.example.test/artwork/current?metadata=1')).toBe('/api/artwork/current?metadata=1')
  })

  it('lê status e catálogo do servidor', async () => {
    const status = await getStatus()
    const root = await getCatalog()
    const folder = await getCatalog('Flash Balada')

    expect(status.current_media?.title).toBe('Because You Loved Me')
    expect(root).toMatchObject({ folder_count: 3, track_count: 4 })
    expect(folder).toMatchObject({ folder: 'Flash Balada', exists: true })
  })

  it('pesquisa faixas e codifica termo e paginação', async () => {
    server.use(http.get(/\/(?:api\/)?control\/search$/, ({ request }) => {
      const url = new URL(request.url)
      expect(url.searchParams.get('fields')).toBe('artist')
      return HttpResponse.json({
        query: url.searchParams.get('q'), total: 1,
        offset: Number(url.searchParams.get('offset')), limit: Number(url.searchParams.get('limit')),
        results: [{ index: 1, global_index: 1, name: 'Halo.mp3', track: 'Ao Vivo/Halo.mp3', folder: 'Ao Vivo', metadata: { path: 'Ao Vivo/Halo.mp3', filename: 'Halo.mp3', title: 'Halo', artist: 'Beyoncé' } }],
      })
    }))

    await expect(searchCatalog('Beyoncé & Halo', 20, 10, undefined, ['artist'])).resolves.toMatchObject({
      query: 'Beyoncé & Halo', total: 1, offset: 10, limit: 20,
      results: [{ folder: 'Ao Vivo', track: 'Ao Vivo/Halo.mp3', metadata: { artist: 'Beyoncé' } }],
    })
  })

  it('codifica pastas e faixas e executa os controles no servidor simulado', async () => {
    await selectFolder('Metro Tech 10')
    expect(getMockState().status.current_folder).toBe('Metro Tech 10')

    await selectTrack('Flash Balada', '02 Total Eclipse of the Heart.mp3')
    expect(getMockState().status.current_media?.title).toBe('Total Eclipse of the Heart')

    await runControl('pause')
    expect(getMockState().status.paused).toBe(true)
    await runControl('play')
    await runControl('restart')
    await runControl('next')
    await runControl('previous')

    expect(getMockState().commands).toEqual([
      'select-folder:Metro Tech 10',
      'select-track:Flash Balada/02 Total Eclipse of the Heart.mp3',
      'pause', 'play', 'restart', 'next', 'previous',
    ])
  })

  it('propaga respostas HTTP inválidas', async () => {
    server.use(http.get(/\/(?:api\/)?status$/, () => HttpResponse.json({}, { status: 503 })))
    await expect(getStatus()).rejects.toThrow('Servidor respondeu 503')
    await expect(getCatalog('Pasta inexistente')).rejects.toThrow('Servidor respondeu 404')
  })

  it('versiona capas pela mídia atual para evitar cache antigo', () => {
    expect(versionedArtworkUrl(undefined, 'track.mp3')).toBeUndefined()
    expect(versionedArtworkUrl('/artwork/current')).toBe('/api/artwork/current')
    expect(versionedArtworkUrl('/artwork/current', 'Flash/01 Música.mp3')).toBe('/api/artwork/current?media=Flash%2F01%20M%C3%BAsica.mp3')
    expect(versionedArtworkUrl('/artwork/current?size=large', 'track.mp3')).toBe('/api/artwork/current?size=large&media=track.mp3')
  })
})
