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

type FolderGroup = {
  key: string
  name: string
  folders: CatalogFolder[]
}

function discNumber(name: string) {
  return name.match(/(?:^|[\s_-])disc\s+(\d+)$/i)?.[1]
}

function baseAlbumName(name: string) {
  return name.replace(/[\s_-]*disc\s+\d+$/i, '').trim()
}

function groupFolders(folders: CatalogFolder[]): FolderGroup[] {
  const groups = new Map<string, FolderGroup>()
  for (const item of folders) {
    const number = discNumber(item.name)
    const parent = item.folder.split(/[\\/]/).slice(0, -1).join('/').toLocaleLowerCase('pt-BR')
    const name = number ? baseAlbumName(item.name) : item.name
    const key = number ? `disc:${parent}/${name.toLocaleLowerCase('pt-BR')}` : `folder:${item.folder}`
    const group = groups.get(key) ?? { key, name, folders: [] }
    group.folders.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      folders: group.folders.slice().sort((left, right) => Number(discNumber(left.name) || 0) - Number(discNumber(right.name) || 0)),
    }))
    .sort((left, right) => naturalCompare(left.name, right.name))
}

function isRoot(data: CatalogRoot | CatalogDetail): data is CatalogRoot {
  return 'folders' in data
}

export function Albums({ status, pending, onAction, onSelectFolder, onSelectTrack, onOpenNow, onOpenAlbum, albumNavigation, visible = true }: Props) {
  const [root, setRoot] = useState<CatalogRoot | null>(null)
  const [detailData, setDetailData] = useState<CatalogDetail[] | null>(null)
  const [selectedFolders, setSelectedFolders] = useState<CatalogFolder[]>([])
  const [quickPlayGroup, setQuickPlayGroup] = useState<string | null>(null)
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
  const quickPlayMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!quickPlayGroup) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!quickPlayMenuRef.current?.contains(event.target as Node)) setQuickPlayGroup(null)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [quickPlayGroup])

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
    Promise.all(selectedFolders.map((item) => getCatalog(item.folder, controller.signal)))
      .then((data) => { if (data.every((item) => !isRoot(item))) setDetailData(data as CatalogDetail[]) })
      .catch((reason) => {
        if (!controller.signal.aborted) setDetailError(reason instanceof Error ? reason.message : 'Falha ao abrir o catálogo')
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [folder, selectedFolders, detailReload])

  useEffect(() => {
    if (!root || !albumNavigation) return
    const timer = window.setTimeout(() => {
      if (query) {
        setQuery('')
        return
      }
      const list = listScreen.current
      const card = Array.from(list?.querySelectorAll<HTMLElement>('[data-folders]') ?? []).find((item) => item.dataset.folders?.split('|').includes(albumNavigation.folder))
      if (list && card) list.scrollTop += card.getBoundingClientRect().top - list.getBoundingClientRect().top - 28
      if (detailScreen.current) detailScreen.current.scrollTop = 0
      setDetailLoading(true)
      setDetailError(null)
      setDetailQuery('')
      const targetGroup = groupFolders(root.folders).find((group) => group.folders.some((item) => item.folder === albumNavigation.folder))
      setSelectedFolders(targetGroup?.folders ?? [{ folder: albumNavigation.folder, name: albumNavigation.folder.split(/[\\/]/).pop() || albumNavigation.folder }])
      setFolder(targetGroup?.folders[0]?.folder ?? albumNavigation.folder)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [root, albumNavigation, query])

  const detail = detailData?.[0]?.folder === folder ? detailData : null

  useEffect(() => {
    if (!albumNavigation || !selectedFolders.some((item) => item.folder === albumNavigation.folder) || !detail) return
    const frame = window.requestAnimationFrame(() => {
      const screen = detailScreen.current
      const currentTrack = screen?.querySelector<HTMLElement>('[data-current-track="true"]')
      if (!screen || !currentTrack) return

      const screenBounds = screen.getBoundingClientRect()
      const trackBounds = currentTrack.getBoundingClientRect()
      const fullyVisible = trackBounds.top >= screenBounds.top && trackBounds.bottom <= screenBounds.bottom
      if (fullyVisible) return

      const trackTop = trackBounds.top - screenBounds.top + screen.scrollTop
      const centeredTop = trackTop - (screen.clientHeight - currentTrack.offsetHeight) / 2
      screen.scrollTo({
        top: Math.max(0, centeredTop),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [albumNavigation, detail, folder, selectedFolders])

  const parent = folder?.includes('/') ? folder.slice(0, folder.lastIndexOf('/')) : undefined
  const live = isLive(status)
  const compactTrackNumber = !live && formatTrackNumber(status?.current_media?.track_number)
  const currentFolderName = status?.current_folder?.split(/[\\/]/).filter(Boolean).pop()
  const compactDiscMatch = currentFolderName?.match(/(?:^|[\s_-])disc\s+(\d+)$/i)
  const compactFolderName = compactDiscMatch ? currentFolderName?.replace(/[\s_-]*disc\s+\d+$/i, '').trim() : currentFolderName
  const detailTrackGroups = detail?.map((item, index) => ({
    detail: item,
    disc: discNumber(selectedFolders[index]?.name ?? item.folder.split(/[\\/]/).pop() ?? ''),
  })) ?? []
  const detailTrackCount = detail?.reduce((count, item) => count + item.tracks.length, 0) ?? 0
  const detailSubfolders = detail?.flatMap((item) => item.subfolders) ?? []
  const detailTitle = selectedFolders[0] ? baseAlbumName(selectedFolders[0].name) : folder?.split(/[\\/]/).pop() || ''
  const detailArtwork = detail?.find((item) => item.artwork_url)?.artwork_url || selectedFolders.find((item) => item.artwork_url)?.artwork_url

  const openFolder = (group: FolderGroup) => {
    const foldersToOpen = group.folders
    setDetailLoading(true)
    setDetailError(null)
    setDetailQuery('')
    if (detailScreen.current) detailScreen.current.scrollTop = 0
    setSelectedFolders(foldersToOpen)
    setFolder(foldersToOpen[0].folder)
  }

  const navigateTo = (nextFolder?: string) => {
    if (nextFolder) setDetailLoading(true)
    setDetailError(null)
    setDetailQuery('')
    if (detailScreen.current) detailScreen.current.scrollTop = 0
    setSelectedFolders(nextFolder ? [{ folder: nextFolder, name: nextFolder.split(/[\\/]/).pop() || nextFolder }] : [])
    setFolder(nextFolder)
  }

  const renderFolders = (folders: CatalogFolder[], search: string, onSearch: (value: string) => void) => {
    if (folders.length === 0) return null
    const folderGroups = groupFolders(folders)
    const filtered = folderGroups.filter((group) => group.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
    return <>
      <label className="search-box">
        <Icon name="search" />
        <span className="sr-only">Buscar álbum ou pasta</span>
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar na coleção" type="search" />
      </label>
      <div className="album-grid">
        {filtered.map((group) => {
          const item = group.folders[0]
          const isActive = group.folders.some((entry) => status?.current_folder === entry.folder)
          const hasDiscFolders = group.folders.some((entry) => discNumber(entry.name))
          const parentPath = item.folder.split(/[\\/]/).slice(0, -1).join(' / ')
          const subtitle = [parentPath, group.folders.length > 1 ? `${group.folders.length} discos` : discNumber(item.name) ? `Disco ${discNumber(item.name)}` : ''].filter(Boolean).join(' · ')
          return (
          <article key={group.key} data-folders={group.folders.map((entry) => entry.folder).join('|')} className={`album-card${isActive ? ' album-card--active' : ''}`}>
            <button className="album-open" onClick={() => openFolder(group)} aria-label={`Abrir pasta ${group.name}`}>
              <span className="album-cover">
                <Artwork src={item.artwork_url || group.folders.find((entry) => entry.artwork_url)?.artwork_url} alt="" />
                {isActive && <span className="playing-pill"><Icon name="music" /> Tocando</span>}
              </span>
              <strong>{group.name}</strong>
              {subtitle && <span>{subtitle}</span>}
            </button>
            {hasDiscFolders ? (
              <div className="folder-play-menu-wrap" ref={quickPlayGroup === group.key ? quickPlayMenuRef : undefined}>
                <button className="folder-quick-play" disabled={live || Boolean(pending)} onClick={() => setQuickPlayGroup((current) => current === group.key ? null : group.key)} aria-label={`Escolher disco para tocar ${group.name}`} aria-expanded={quickPlayGroup === group.key} title={`Tocar ${group.name}`}><Icon name="play" /></button>
                {quickPlayGroup === group.key && <div className="folder-play-menu" role="group" aria-label={`Discos de ${group.name}`}>
                  {group.folders.map((discFolder) => <button key={discFolder.folder} disabled={live || Boolean(pending)} onClick={() => { setQuickPlayGroup(null); void onSelectFolder(discFolder.folder) }}>{discNumber(discFolder.name) ? `Disco ${discNumber(discFolder.name)}` : 'Pasta'}</button>)}
                </div>}
              </div>
            ) : <button className="folder-quick-play" disabled={live || Boolean(pending)} onClick={() => void onSelectFolder(item.folder)} aria-label={`Tocar pasta ${group.name}`} title={`Tocar ${group.name}`}><Icon name="play" /></button>}
          </article>
        )})}
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
              <h1 id="albums-title">Coleção</h1>
              <p>{groupFolders(root.folders).length} álbuns · {root.track_count} faixas</p>
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
          <div className="albums-heading albums-heading--detail">
            <div className="detail-heading-main">
              <div className="detail-album-cover">
                <Artwork src={detailArtwork} alt={`Capa de ${detailTitle}`} />
              </div>
              <div className="detail-heading-copy">
                <h1 id="detail-title">{detailTitle}</h1>
                <p>{detailTrackCount} faixas{selectedFolders.length > 1 ? ` · ${selectedFolders.length} discos` : detailSubfolders.length ? ` · ${detailSubfolders.length} pastas` : ''}</p>
              </div>
            </div>
          </div>
          {renderFolders(detailSubfolders, detailQuery, setDetailQuery)}
          {detailTrackGroups.map(({ detail: trackDetail, disc }) => trackDetail.tracks.length > 0 && (
            <section className="track-disc-group" key={trackDetail.folder} aria-label={disc ? `Disco ${disc}` : undefined}>
              {disc && <h2 className="track-disc-heading">Disco {disc}</h2>}
              <div className="track-list" aria-label={disc ? `Faixas do Disco ${disc}` : 'Faixas'}>
              {trackDetail.tracks.map((item) => {
                const selected = status?.current_media?.path === item.metadata?.path || status?.current_media?.filename === item.track
                return (
                  <button key={`${item.index}-${item.track}`} data-current-track={selected ? 'true' : undefined} className={selected ? 'track-row track-row--active' : 'track-row'} disabled={live || Boolean(pending)} onClick={() => void onSelectTrack(trackDetail.folder, item.track)}>
                    <span className="track-number">{formatTrackNumber(item.metadata?.track_number)}</span>
                    <span className="track-copy"><strong>{item.metadata?.title || item.name || item.track}</strong><span>{item.metadata?.artist || item.metadata?.album_artist || trackDetail.folder}</span></span>
                    {item.metadata?.duration_seconds != null && <span className="track-duration">{Math.floor(item.metadata.duration_seconds / 60)}:{String(Math.floor(item.metadata.duration_seconds % 60)).padStart(2, '0')}</span>}
                  </button>
                )
              })}
              </div>
            </section>
          ))}
          {detail.every((item) => item.subfolders.length === 0 && item.tracks.length === 0) && <div className="empty-search">Esta pasta está vazia.</div>}
        </>}
      </section>

      {visible && createPortal(<div className="mini-player">
        <button className="mini-player-cover" disabled={!status?.current_folder || !status.current_media || live} onClick={onOpenAlbum} aria-label={`Abrir álbum ${status?.current_media?.album || status?.current_folder || 'atual'}`}>
          <Artwork src={status?.current_media?.artwork?.available ? status.current_media.artwork.url : undefined} cacheKey={status?.current_media?.path} live={live} alt="" />
        </button>
        <button className="mini-player-open" onClick={onOpenNow} aria-label="Abrir tela Agora pelo player compacto">
          <span className="mini-player-copy">
            <strong>{live ? 'Ao vivo' : status?.current_media?.title || status?.current_media?.filename || 'Nada tocando'}</strong>
            <span>{live ? 'Sinal externo conectado' : joinArtist(status)}</span>
            {!live && (compactFolderName || compactDiscMatch || compactTrackNumber) && (
              <span className="mini-player-meta">
                {compactFolderName && <span className="mini-player-folder">{compactFolderName}</span>}
                {compactDiscMatch && <span className="mini-player-badge">Disco {compactDiscMatch[1]}</span>}
                {compactTrackNumber && <span className="mini-player-badge">Faixa {compactTrackNumber}</span>}
              </span>
            )}
          </span>
        </button>
        <PlayerControls compact paused={Boolean(status?.paused)} disabled={!status || live || Boolean(pending)} pending={pending} onAction={onAction} />
      </div>, document.body)}
    </>
  )
}
