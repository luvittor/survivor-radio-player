import { expect, test, type Page, type Route } from '@playwright/test'
import { initialStatus, makeFolderDetail, mockFolders, mockLibrary } from '../src/test/mockData'
import type { RadioStatus } from '../src/types'

const artwork = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect width="512" height="512" fill="#402080" />
  </svg>`

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mockSurvivor(page: Page) {
  let status = structuredClone(initialStatus())
  const commands: string[] = []

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const endpoint = url.pathname.replace(/^\/api/, '')

    if (endpoint === '/status') return json(route, status)
    if (endpoint.startsWith('/artwork/')) {
      return route.fulfill({ contentType: 'image/svg+xml', body: artwork })
    }
    if (endpoint === '/control/catalog') {
      const folder = url.searchParams.get('folder')
      return json(route, folder
        ? makeFolderDetail(folder)
        : { catalog_root: '/music', track_count: 4, folder_count: mockFolders.length, folders: mockFolders })
    }

    if (endpoint === '/control/select-folder') {
      const folder = url.searchParams.get('folder') || ''
      commands.push(`select-folder:${folder}`)
      status = { ...status, current_folder: folder, track_index: 0, current_media: mockLibrary[folder]?.[0] || null, paused: false }
      return json(route, { ok: true })
    }

    if (endpoint === '/control/select-track') {
      const folder = url.searchParams.get('folder') || ''
      const track = url.searchParams.get('track') || ''
      const index = mockLibrary[folder]?.findIndex((item) => item.filename === track) ?? -1
      commands.push(`select-track:${folder}/${track}`)
      status = { ...status, current_folder: folder, track_index: index, current_media: mockLibrary[folder]?.[index] || null, paused: false }
      return json(route, { ok: true })
    }

    const action = endpoint.match(/^\/control\/(previous|restart|pause|play|next)$/)?.[1]
    if (action) {
      commands.push(action)
      if (action === 'pause') status = { ...status, paused: true, pause_phase: 'paused' }
      if (action === 'play') status = { ...status, paused: false, pause_phase: 'playing' }
      if (action === 'restart') status = { ...status, position_seconds: 0 }
      if (action === 'next' || action === 'previous') {
        const tracks = mockLibrary[status.current_folder || ''] || []
        const direction = action === 'next' ? 1 : -1
        const index = (Number(status.track_index || 0) + direction + tracks.length) % tracks.length
        status = { ...status, track_index: index, current_media: tracks[index], position_seconds: 0 }
      }
      return json(route, { ok: true })
    }

    return json(route, { error: 'Rota não simulada' }, 404)
  })

  return {
    commands,
    externalUpdate(update: Partial<RadioStatus>) {
      status = { ...status, ...update }
    },
  }
}

test('controla pause, play e faixa e recebe ações de outro dispositivo', async ({ page }) => {
  const survivor = await mockSurvivor(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Because You Loved Me' })).toBeVisible()
  await page.getByRole('button', { name: 'Pausar' }).click()
  await expect(page.getByText('PAUSED')).toBeVisible()
  expect(survivor.commands).toContain('pause')

  await page.getByRole('button', { name: 'Reproduzir' }).click()
  await expect(page.getByRole('button', { name: 'Próxima faixa' })).toBeEnabled()
  await page.getByRole('button', { name: 'Próxima faixa' }).click()
  await expect(page.getByRole('heading', { name: 'Total Eclipse of the Heart' })).toBeVisible()

  survivor.externalUpdate({
    current_folder: 'Metro Tech 3',
    track_index: 0,
    current_media: mockLibrary['Metro Tech 3'][0],
    paused: true,
    pause_phase: 'paused',
  })
  await expect(page.getByRole('heading', { name: 'Neon' })).toBeVisible({ timeout: 2_000 })
  await expect(page.getByAltText('Capa de Metro Tech 3')).toHaveAttribute('src', /Metro%20Tech%203/)
  await expect(page.getByText('PAUSED')).toBeVisible()

  survivor.externalUpdate({ live_connected: true, mode: 'live-uplink', paused: false, pause_phase: 'playing' })
  await expect(page.getByRole('heading', { name: 'Ao vivo' })).toBeVisible({ timeout: 2_000 })
  await expect(page.getByText('LIVE')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Próxima faixa' })).toBeDisabled()
})

test('navega na interface mobile sem overflow e preserva a pasta entre abas', async ({ page }) => {
  const survivor = await mockSurvivor(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Because You Loved Me' })).toBeVisible()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.locator('.app-header')).toHaveCSS('position', 'fixed')
  await expect(page.locator('.tab-bar')).toHaveCSS('position', 'fixed')

  await page.getByRole('button', { name: 'Pastas' }).click()
  const folderNames = await page.locator('button[aria-label^="Abrir pasta "]').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  )
  expect(folderNames).toEqual(['Abrir pasta Flash Balada', 'Abrir pasta Metro Tech 3', 'Abrir pasta Metro Tech 10'])

  await page.getByRole('button', { name: 'Tocar pasta Metro Tech 10' }).click()
  await expect(page.locator('.mini-player').getByText('Voltage')).toBeVisible()
  expect(survivor.commands).toContain('select-folder:Metro Tech 10')

  await page.getByRole('button', { name: 'Abrir pasta Flash Balada' }).click()
  await expect(page.getByRole('heading', { name: 'Flash Balada' })).toBeVisible()
  await page.getByRole('button', { name: 'Agora', exact: true }).click()
  await page.getByRole('button', { name: 'Pastas' }).click()
  await expect(page.getByRole('heading', { name: 'Flash Balada' })).toBeVisible()
})
