import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('contrato PWA preparado para a etapa futura', () => {
  it('mantém manifest, escopo, modo standalone e ícones essenciais', async () => {
    const manifest = JSON.parse(await readFile(resolve('public/manifest.webmanifest'), 'utf8'))
    expect(manifest).toMatchObject({
      name: 'Survivor Radio Player',
      start_url: '/player/',
      scope: '/player/',
      display: 'standalone',
    })
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]))
  })

  it('referencia o manifest e usa o título correto no HTML', async () => {
    const html = await readFile(resolve('index.html'), 'utf8')
    expect(html).toContain('<title>Survivor Radio Player</title>')
    expect(html).toContain('rel="manifest" href="/player/manifest.webmanifest"')
  })
})
