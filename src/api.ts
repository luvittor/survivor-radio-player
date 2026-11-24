import type { CatalogDetail, CatalogRoot, CatalogSearchResponse, ControlAction, RadioStatus } from './types'

export const API_BASE = import.meta.env.DEV ? '/api' : ''

export function apiUrl(pathOrUrl: string): string {
  let path = pathOrUrl

  if (/^https?:\/\//i.test(path)) {
    const parsed = new URL(path)
    path = `${parsed.pathname}${parsed.search}`
  }

  if (!path.startsWith('/')) path = `/${path}`
  return `${API_BASE}${path}`
}

export function versionedArtworkUrl(pathOrUrl: string | undefined, mediaKey?: string): string | undefined {
  if (!pathOrUrl) return undefined
  const resolved = apiUrl(pathOrUrl)
  if (!mediaKey) return resolved
  const separator = resolved.includes('?') ? '&' : '?'
  return `${resolved}${separator}media=${encodeURIComponent(mediaKey)}`
}

async function requestJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error(`Servidor respondeu ${response.status}`)
  return response.json() as Promise<T>
}

async function requestControl(path: string): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json, text/plain, */*' },
  })

  if (!response.ok) throw new Error(`Servidor respondeu ${response.status}`)
}

export const getStatus = (signal?: AbortSignal) => requestJson<RadioStatus>('/status', signal)

export const getCatalog = (folder?: string, signal?: AbortSignal) =>
  requestJson<CatalogRoot | CatalogDetail>(
    folder ? `/control/catalog?folder=${encodeURIComponent(folder)}` : '/control/catalog',
    signal,
  )

export const searchCatalog = (query: string, limit = 50, offset = 0, signal?: AbortSignal, fields?: string[]) =>
  requestJson<CatalogSearchResponse>(
    `/control/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}${fields === undefined ? '' : `&fields=${encodeURIComponent(fields.join(','))}`}`,
    signal,
  )

export async function runControl(action: ControlAction): Promise<void> {
  await requestControl(`/control/${action}`)
}

export async function selectFolder(folder: string): Promise<void> {
  await requestControl(`/control/select-folder?folder=${encodeURIComponent(folder)}`)
}

export async function selectTrack(folder: string, track: string): Promise<void> {
  await requestControl(
    `/control/select-track?folder=${encodeURIComponent(folder)}&track=${encodeURIComponent(track)}`,
  )
}
