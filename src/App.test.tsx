import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCatalog } from './api'
import App from './App'

vi.mock('./hooks', () => ({
  useRadioStatus: () => ({ status: null, loading: false, error: null, refresh: vi.fn() }),
}))

vi.mock('./components/NowPlaying', () => ({
  NowPlaying: () => <div>Conteúdo de Agora</div>,
}))

vi.mock('./api', () => ({
  getCatalog: vi.fn(),
  runControl: vi.fn(),
  selectFolder: vi.fn(),
  selectTrack: vi.fn(),
  apiUrl: (path: string) => `/api${path}`,
  versionedArtworkUrl: (path?: string) => path ? `/api${path}` : undefined,
}))

describe('navegação principal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('preserva a pasta aberta ao alternar entre Agora e Pastas', async () => {
    vi.mocked(getCatalog)
      .mockResolvedValueOnce({
        track_count: 2,
        folder_count: 1,
        folders: [{ folder: 'Metro Tech 3', name: 'Metro Tech 3' }],
      })
      .mockResolvedValueOnce({
        folder: 'Metro Tech 3',
        exists: true,
        subfolders: [],
        tracks: [],
      })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Pastas' }))
    await user.click(await screen.findByRole('button', { name: 'Abrir pasta Metro Tech 3' }))
    expect(await screen.findByRole('heading', { name: 'Metro Tech 3' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agora' }))
    await user.click(screen.getByRole('button', { name: 'Pastas' }))

    expect(screen.getByRole('heading', { name: 'Metro Tech 3' })).toBeInTheDocument()
    expect(getCatalog).toHaveBeenCalledTimes(2)
  })
})
