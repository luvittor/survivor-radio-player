import { useEffect, useMemo, useState } from 'react'
import { getCatalog } from '../api'
import type { CatalogDetail, CatalogFolder, CatalogRoot, RadioStatus } from '../types'
import { formatTrackNumber, isLive, joinArtist, naturalCompare } from '../utils'
import { Artwork } from './Artwork'
import { Icon } from './Icons'
import { PlayerControls } from './PlayerControls'

type Props = {
  status: RadioStatus | null
  pending: string | null
  onAction: (action: 'previous' | 'restart' | 'pause' | 'play' | 'next') => void
  onSelectFolder: (folder: string) => Promise<void>
  onSelectTrack: (folder: string, track: string) => Promise<void>
}

function isRoot(data: CatalogRoot | CatalogDetail): data is CatalogRoot {
  return 'folders' in data
}

export function Albums({ status, pending, onAction, onSelectFolder, onSelectTrack }: Props) {
  const [data, setData] = useState<CatalogRoot | CatalogDetail | null>(null)
  const [folder, setFolder] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getCatalog(folder, controller.signal)
      .then(setData)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Falha ao abrir o catálogo')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [folder])

  const folders = useMemo(() => data && isRoot(data) ? data.folders : data?.subfolders || [], [data])
  const filtered = useMemo(() => folders
    .filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
    .slice()
    .sort((left, right) => naturalCompare(left.name, right.name)), [folders, query])
  const detail = data && !isRoot(data) ? data : null
  const parent = folder?.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : undefined
  const live = isLive(status)
  const compactTrackNumber = !live && formatTrackNumber(status?.current_media?.track_number)

  const openFolder = (item: CatalogFolder) => {
    setLoading(true)
    setError(null)
    setQuery('')
    setFolder(item.folder)
  }

  const navigateTo = (nextFolder?: string) => {
    setLoading(true)
    setError(null)
    setFolder(nextFolder)
  }

  if (loading && !data) return <div className="catalog-state"><span className="spinner" /> Abrindo sua coleção…</div>
  if (error && !data) return <div className="catalog-state catalog-state--error"><Icon name="radio" /><strong>Catálogo indisponível</strong><span>{error}</span><button onClick={() => navigateTo(folder === undefined ? '' : undefined)}>Tentar novamente</button></div>

  return (
    <section className="albums-page" aria-labelledby="albums-title">
      <div className="albums-heading">
        <div>
          {folder && <button className="back-button" onClick={() => navigateTo(parent)}><Icon name="back" /> Voltar</button>}
          <p className="eyebrow">SUA COLEÇÃO</p>
          <h1 id="albums-title">{detail?.folder ? detail.folder.split('/').at(-1) : 'Pastas'}</h1>
          <p>{detail ? `${detail.tracks.length} faixas${detail.subfolders.length ? ` · ${detail.subfolders.length} pastas` : ''}` : `${(data as CatalogRoot | null)?.folder_count ?? 0} pastas · ${(data as CatalogRoot | null)?.track_count ?? 0} faixas`}</p>
        </div>
        {detail && !live && <button className="play-folder" disabled={Boolean(pending)} onClick={() => void onSelectFolder(detail.folder)}><Icon name="play" /> Tocar pasta</button>}
      </div>

      {folders.length > 0 && (
        <>
          <label className="search-box">
            <Icon name="search" />
            <span className="sr-only">Buscar álbum ou pasta</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na coleção" type="search" />
          </label>
          <div className="album-grid">
            {filtered.map((item) => (
              <article key={item.folder} className={`album-card${status?.current_folder === item.folder ? ' album-card--active' : ''}`}>
                <button className="album-open" onClick={() => openFolder(item)} aria-label={`Abrir pasta ${item.name}`}>
                  <span className="album-cover">
                    <Artwork src={item.artwork_url} alt="" />
                    {status?.current_folder === item.folder && <span className="playing-pill"><Icon name="music" /> Tocando</span>}
                  </span>
                  <strong>{item.name}</strong>
                  <span>{item.folder.includes('/') ? item.folder.split('/').slice(0, -1).join(' / ') : 'Pasta'}</span>
                </button>
                <button className="folder-quick-play" disabled={live || Boolean(pending)} onClick={() => void onSelectFolder(item.folder)} aria-label={`Tocar pasta ${item.name}`} title={`Tocar ${item.name}`}><Icon name="play" /></button>
              </article>
            ))}
          </div>
          {filtered.length === 0 && <div className="empty-search">Nenhuma pasta encontrada para “{query}”.</div>}
        </>
      )}

      {detail && detail.tracks.length > 0 && (
        <div className="track-list" aria-label="Faixas">
          {detail.tracks.map((item) => {
            const selected = status?.current_media?.path === item.metadata?.path || status?.current_media?.filename === item.track
            return (
              <button key={`${item.index}-${item.track}`} className={selected ? 'track-row track-row--active' : 'track-row'} disabled={live || Boolean(pending)} onClick={() => void onSelectTrack(detail.folder, item.track)}>
                <span className="track-number">{formatTrackNumber(item.metadata?.track_number)}</span>
                <span className="track-copy"><strong>{item.metadata?.title || item.name || item.track}</strong><span>{item.metadata?.artist || item.metadata?.album_artist || detail.folder}</span></span>
                {item.metadata?.duration_seconds != null && <span className="track-duration">{Math.floor(item.metadata.duration_seconds / 60)}:{String(Math.floor(item.metadata.duration_seconds % 60)).padStart(2, '0')}</span>}
              </button>
            )
          })}
        </div>
      )}

      {detail && folders.length === 0 && detail.tracks.length === 0 && <div className="empty-search">Esta pasta está vazia.</div>}

      <div className="mini-player">
        <Artwork src={status?.current_media?.artwork?.available ? status.current_media.artwork.url : undefined} cacheKey={status?.current_media?.path} live={live} alt="" />
        <div><strong>{live ? 'Ao vivo' : <>{compactTrackNumber && `${compactTrackNumber}. `}{status?.current_media?.title || status?.current_media?.filename || 'Nada tocando'}</>}</strong><span>{live ? 'Sinal externo conectado' : joinArtist(status)}</span></div>
        <PlayerControls compact paused={Boolean(status?.paused)} disabled={!status || live || Boolean(pending)} pending={pending} onAction={onAction} />
      </div>
    </section>
  )
}
