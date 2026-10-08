import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useRadioStatus } from './hooks'
import { mockLibrary } from './test/mockData'
import { server, setMockStatus } from './test/server'

describe('useRadioStatus', () => {
  it('carrega status e atualiza quando a guia volta a ficar visível', async () => {
    const { result } = renderHook(() => useRadioStatus())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.status?.current_media?.title).toBe('Because You Loved Me'))
    expect(result.current.error).toBeNull()

    setMockStatus({ current_media: mockLibrary['Metro Tech 3'][0], current_folder: 'Metro Tech 3' })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(result.current.status?.current_media?.title).toBe('Neon'))
  })

  it('detecta pelo polling uma ação feita em outro dispositivo', async () => {
    const { result } = renderHook(() => useRadioStatus())
    await waitFor(() => expect(result.current.status?.current_media?.title).toBe('Because You Loved Me'))

    setMockStatus({
      current_media: mockLibrary['Metro Tech 10'][0],
      current_folder: 'Metro Tech 10',
      paused: true,
    })

    await waitFor(
      () => {
        expect(result.current.status?.current_media?.title).toBe('Voltage')
        expect(result.current.status?.paused).toBe(true)
      },
      { timeout: 1_800 },
    )
  })

  it('expõe falha de conexão e se recupera em uma atualização manual', async () => {
    server.use(http.get(/\/(?:api\/)?status$/, () => HttpResponse.json({}, { status: 502 })))
    const { result } = renderHook(() => useRadioStatus())

    await waitFor(() => expect(result.current.error).toBe('Servidor respondeu 502'))
    server.resetHandlers()
    await act(() => result.current.refresh(true))

    expect(result.current.status?.current_media?.title).toBe('Because You Loved Me')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
