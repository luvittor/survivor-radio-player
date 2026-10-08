import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCatalog } from '../api'
import { Albums } from './Albums'

vi.mock('../api', () => ({
  getCatalog: vi.fn(),
  apiUrl: (path: string) => `/api${path}`,
  versionedArtworkUrl: (path?: string) => path ? `/api${path}` : undefined,
}))

describe('Pastas', () => {
  beforeEach(() => {
    vi.mocked(getCatalog).mockResolvedValue({
      track_count: 10,
      folder_count: 1,
      folders: [{ folder: 'Flash Balada', name: 'Flash Balada' }],
    })
  })

  it('toca uma pasta pelo botão sobre a capa sem abrir sua lista', async () => {
    const user = userEvent.setup()
    const onSelectFolder = vi.fn().mockResolvedValue(undefined)

    render(
      <Albums
        status={null}
        pending={null}
        onAction={vi.fn()}
        onSelectFolder={onSelectFolder}
        onSelectTrack={vi.fn()}
      />,
    )

    const quickPlay = await screen.findByRole('button', { name: 'Tocar pasta Flash Balada' })
    await user.click(quickPlay)

    expect(onSelectFolder).toHaveBeenCalledWith('Flash Balada')
    expect(screen.getByRole('heading', { name: 'Pastas' })).toBeInTheDocument()
    expect(getCatalog).toHaveBeenCalledTimes(1)
  })
})
