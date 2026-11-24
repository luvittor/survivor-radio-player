import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { RadioStatus } from '../types'
import { initialStatus, makeFolderDetail, mockFolders, mockLibrary } from './mockData'

type MockState = {
  status: RadioStatus
  commands: string[]
}

let state: MockState = { status: initialStatus(), commands: [] }

const setCurrentTrack = (folder: string, index: number) => {
  const tracks = mockLibrary[folder]
  if (!tracks?.length) return false
  const safeIndex = (index + tracks.length) % tracks.length
  state.status = {
    ...state.status,
    current_folder: folder,
    track_index: safeIndex,
    position_seconds: 0,
    paused: false,
    pause_phase: 'playing',
    current_media: tracks[safeIndex],
  }
  return true
}

export const resetMockState = () => {
  state = { status: initialStatus(), commands: [] }
}

export const getMockState = () => state

export const setMockStatus = (patch: Partial<RadioStatus>) => {
  state.status = { ...state.status, ...patch }
}

export const handlers = [
  http.get(/\/(?:api\/)?status$/, () => HttpResponse.json(state.status)),

  http.get(/\/(?:api\/)?control\/catalog$/, ({ request }) => {
    const folder = new URL(request.url).searchParams.get('folder')
    if (!folder) {
      return HttpResponse.json({
        catalog_root: '/music',
        track_count: Object.values(mockLibrary).flat().length,
        folder_count: mockFolders.length,
        folders: mockFolders,
      })
    }
    const detail = makeFolderDetail(folder)
    return detail.exists ? HttpResponse.json(detail) : HttpResponse.json({ ...detail, exists: false }, { status: 404 })
  }),

  http.get(/\/(?:api\/)?control\/search$/, ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 50))
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0)
    const rawFields = url.searchParams.get('fields')
    const fields = rawFields === null ? ['title', 'artist', 'album_artist', 'album', 'filename', 'folder'] : rawFields.split(',').filter(Boolean)
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    const results = Object.entries(mockLibrary).flatMap(([folder, tracks]) => tracks.map((media, index) => ({
      index,
      global_index: index,
      name: media.filename,
      track: `${folder}/${media.filename}`,
      folder,
      metadata: media,
    }))).filter((item) => {
      const searchableValues: Record<string, string | undefined> = {
        title: item.metadata.title,
        artist: item.metadata.artist,
        album_artist: item.metadata.album_artist,
        album: item.metadata.album,
        filename: item.name,
        folder: item.track,
      }
      return !query.trim() || fields.map((field) => searchableValues[field])
        .some((value) => value && normalize(value).includes(normalize(query.trim())))
    })
    return HttpResponse.json({ query, total: results.length, offset, limit, results: results.slice(offset, offset + limit) })
  }),

  http.get(/\/(?:api\/)?control\/select-folder$/, ({ request }) => {
    const folder = new URL(request.url).searchParams.get('folder') || ''
    state.commands.push(`select-folder:${folder}`)
    return setCurrentTrack(folder, 0)
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ ok: false }, { status: 404 })
  }),

  http.get(/\/(?:api\/)?control\/select-track$/, ({ request }) => {
    const url = new URL(request.url)
    const folder = url.searchParams.get('folder') || ''
    const track = url.searchParams.get('track') || ''
    const index = (mockLibrary[folder] || []).findIndex((item) => item.filename === track)
    state.commands.push(`select-track:${folder}/${track}`)
    return index >= 0 && setCurrentTrack(folder, index)
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ ok: false }, { status: 404 })
  }),

  http.get(/\/(?:api\/)?control\/(previous|restart|pause|play|next|previous-folder|next-folder)$/, ({ params }) => {
    const action = String(params[0])
    state.commands.push(action)
    if (action === 'pause') state.status = { ...state.status, paused: true, pause_phase: 'paused' }
    if (action === 'play') state.status = { ...state.status, paused: false, pause_phase: 'playing' }
    if (action === 'restart') state.status = { ...state.status, position_seconds: 0 }
    if (action === 'next') setCurrentTrack(state.status.current_folder || '', (state.status.track_index || 0) + 1)
    if (action === 'previous') setCurrentTrack(state.status.current_folder || '', (state.status.track_index || 0) - 1)
    return HttpResponse.json({ ok: true })
  }),

  http.get(/\/(?:api\/)?artwork\/(current|album)$/, () => new HttpResponse(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300' },
  })),
]

export const server = setupServer(...handlers)
