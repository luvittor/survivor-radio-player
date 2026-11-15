import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  onOpenNow: () => void
  onOpenAlbum?: () => void
  albumNavigation?: { id: number; folder: string } | null
  visible?: boolean
}

function isRoot(data: CatalogRoot | CatalogDetail): data is CatalogRoot {
  return 'folders' in data
}

export function Albums({ status, pending, onAction, onSelectFolder, onSelectTrack, onOpenNow, onOpenAlbum, albumNavigation, visible = true }: Props) {
  const [root, setRoot] = useState<CatalogRoot | null>(null)
  const [detailData, setDetailData] = useState<CatalogDetail | null>(null)
  const [folder, setFolder] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [detailQuery, setDetailQuery] = useState('')
  const [rootLoading, setRootLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rootError, setRootError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [rootReload, setRootReload] = useState(0)
  const [detailReload, setDetailReload] = useState(0)
  const detailScreen = useRef<HTMLElement>(null)
  const listScreen = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    getCatalog(undefined, controller.signal)
      .then((data) => { if ('folders' in data) setRoot(data) })
      .catch((reason) => {
        if (!controller.signal.aborted) setRootError(reason instanceof Error ? reason.message : 'Falha ao abrir o catálogo')
      })
      .finally(() => { if (!controller.signal.aborted) setRootLoading(false) })
    return () => controller.abort()
  }, [rootReload])

  useEffect(() => {
    if (!folder) return
    const controller = new AbortController()
    getCatalog(folder, controller.signal)
      .then((data) => { if (!isRoot(data)) setDetailData(data) })
      .catch((reason) => {
        if (!controller.signal.aborted) setDetailError(reason instanceof Error ? reason.message : 'Falha ao abrir o catálogo')
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [folder, detailReload])

  useEffect(() => {
    if (!root || !albumNavigation) return
    const timer = window.setTimeout(() => {
      if (query) {
        setQuery('')
        return
      }
      const list = listScreen.current
      const card = Array.from(list?.querySelectorAll<HTMLElement>('[data-folder]') ?? []).find((item) => item.dataset.folder === albumNavigation.folder)
      if (list && card) list.scrollTop += card.getBoundingClientRect().top - list.getBoundingClientRect().top - 28
      if (detailScreen.current) detailScreen.current.scrollTop = 0
      setDetailLoading(true)
      setDetailError(null)
      setDetailQuery('')
      setFolder(albumNavigation.folder)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [root, albumNavigation, query])

  const detail = detailData?.folder === folder ? detailData : null
  const parent = folder?.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : undefined
  const live = isLive(status)
  const compactTrackNumber = !live && formatTrackNumber(status?.current_media?.track_number)

  const openFolder = (item: CatalogFolder) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetailQuery('')
    if (detailScreen.current) detailScreen.current.scrollTop = 0
    setFolder(item.folder)
  }

  const navigateTo = (nextFolder?: string) => {
    if (nextFolder) setDetailLoading(true)
    setDetailError(null)
    setDetailQuery('')
    if (detailScreen.current) detailScreen.current.scrollTop = 0
    setFolder(nextFolder)
  }

  const renderFolders = (folders: CatalogFolder[], search: string, onSearch: (value: string) => void) => {
    if (folders.length === 0) return null
    const filtered = folders
      .filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
      .slice()
      .sort((left, right) => naturalCompare(left.name, right.name))
    return <>
      <label className="search-box">
        <Icon name="search" />
        <span className="sr-only">Buscar álbum ou pasta</span>
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar na coleção" type="search" />
      </label>
      <div className="album-grid">
        {filtered.map((item) => (
          <article key={item.folder} data-folder={item.folder} className={`album-card${status?.current_folder === item.folder ? ' album-card--active' : ''}`}>
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
      {filtered.length === 0 && <div className="empty-search">Nenhuma pasta encontrada para “{search}”.</div>}
    </>
  }

  return (
    <>
      <section className="albums-page catalog-screen" data-catalog-screen="list" ref={listScreen} aria-labelledby="albums-title" aria-hidden={Boolean(folder)} inert={Boolean(folder)}>
        {rootLoading && !root && <div className="catalog-state"><span className="spinner" /> Abrindo sua coleção…</div>}
        {rootError && !root && <div className="catalog-state catalog-state--error"><Icon name="radio" /><strong>Catálogo indisponível</strong><span>{rootError}</span><button onClick={() => { setRootLoading(true); setRootError(null); setRootReload((value) => value + 1) }}>Tentar novamente</button></div>}
        {root && <>
          <div className="albums-heading">
            <div>
              <p className="eyebrow">SUA COLEÇÃO</p>
              <h1 id="albums-title">Pastas</h1>
              <p>{root.folder_count} pastas · {root.track_count} faixas</p>
            </div>
          </div>
          {renderFolders(root.folders, query, setQuery)}
        </>}
      </section>

      <section className="albums-page catalog-screen" data-catalog-screen="detail" ref={detailScreen} aria-labelledby="detail-title" aria-hidden={!folder} inert={!folder}>
        <button className="back-button" onClick={() => navigateTo(parent)}><Icon name="back" /> Voltar</button>
        {detailLoading && !detail && <div className="catalog-state"><span className="spinner" /> Abrindo pasta…</div>}
        {detailError && !detail && <div className="catalog-state catalog-state--error"><Icon name="radio" /><strong>Pasta indisponível</strong><span>{detailError}</span><button onClick={() => { setDetailLoading(true); setDetailError(null); setDetailReload((value) => value + 1) }}>Tentar novamente</button></div>}
        {detail && <>
          <div className="albums-heading">
            <div>
              <p className="eyebrow">SUA COLEÇÃO</p>
              <h1 id="detail-title">{detail.folder.split('/').at(-1)}</h1>
              <p>{detail.tracks.length} faixas{detail.subfolders.length ? ` · ${detail.subfolders.length} pastas` : ''}</p>
            </div>
            {!live && <button className="play-folder" disabled={Boolean(pending)} onClick={() => void onSelectFolder(detail.folder)}><Icon name="play" /> Tocar pasta</button>}
          </div>
          {renderFolders(detail.subfolders, detailQuery, setDetailQuery)}
          {detail.tracks.length > 0 && (
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
          {detail.subfolders.length === 0 && detail.tracks.length === 0 && <div className="empty-search">Esta pasta está vazia.</div>}
        </>}
      </section>

      {visible && createPortal(<div className="mini-player">
        <button className="mini-player-cover" disabled={!status?.current_folder || !status.current_media || live} onClick={onOpenAlbum} aria-label={`Abrir álbum ${status?.current_media?.album || status?.current_folder || 'atual'}`}>
          <Artwork src={status?.current_media?.artwork?.available ? status.current_media.artwork.url : undefined} cacheKey={status?.current_media?.path} live={live} alt="" />
        </button>
        <button className="mini-player-open" onClick={onOpenNow} aria-label="Abrir tela Agora pelo player compacto">
          <span className="mini-player-copy">
            <strong>{live ? 'Ao vivo' : <>{compactTrackNumber && `${compactTrackNumber}. `}{status?.current_media?.title || status?.current_media?.filename || 'Nada tocando'}</>}</strong>
            <span>{live ? 'Sinal externo conectado' : joinArtist(status)}</span>
            {!live && status?.current_media?.album && <span>{status.current_media.album}</span>}
          </span>
        </button>
        <PlayerControls compact paused={Boolean(status?.paused)} disabled={!status || live || Boolean(pending)} pending={pending} onAction={onAction} />
      </div>, document.body)}
    </>
  )
}
