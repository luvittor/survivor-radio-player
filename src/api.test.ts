import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCatalog, selectTrack, versionedArtworkUrl } from './api'

afterEach(() => vi.unstubAllGlobals())

describe('API requests', () => {
  it('encodes folder paths when loading a catalog folder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await getCatalog('MPB/João Bosco')
    expect(fetchMock).toHaveBeenCalledWith('/api/control/catalog?folder=MPB%2FJo%C3%A3o%20Bosco', expect.any(Object))
  })

  it('encodes folder and track independently when selecting a track', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    await selectTrack('Rock/Anos 80', '01 A&B.mp3')
    expect(fetchMock).toHaveBeenCalledWith('/api/control/select-track?folder=Rock%2FAnos%2080&track=01%20A%26B.mp3', expect.objectContaining({ method: 'GET', cache: 'no-store' }))
  })

  it('versions current artwork by media path to bypass stale browser caches', () => {
    expect(versionedArtworkUrl('/artwork/current', 'Flash/01 Música.mp3')).toBe('/api/artwork/current?media=Flash%2F01%20M%C3%BAsica.mp3')
    expect(versionedArtworkUrl('/artwork/current?size=large', 'track.mp3')).toBe('/api/artwork/current?size=large&media=track.mp3')
  })
})
