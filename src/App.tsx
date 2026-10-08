import { useState } from 'react'
import { runControl, selectFolder, selectTrack } from './api'
import { Albums } from './components/Albums'
import { Icon } from './components/Icons'
import { NowPlaying } from './components/NowPlaying'
import { useRadioStatus } from './hooks'
import type { ControlAction } from './types'

type Tab = 'now' | 'albums'

export default function App() {
  const [tab, setTab] = useState<Tab>('now')
  const [foldersMounted, setFoldersMounted] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { status, loading, error, refresh } = useRadioStatus()

  const perform = async (label: string, task: () => Promise<void>) => {
    setPending(label)
    setNotice(null)
    try {
      await task()
      await new Promise((resolve) => window.setTimeout(resolve, 350))
      await refresh()
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Não foi possível executar o comando')
    } finally {
      setPending(null)
    }
  }

  const handleAction = (action: ControlAction) => void perform(action, () => runControl(action))
  const handleFolder = (folder: string) => perform('select-folder', () => selectFolder(folder))
  const handleTrack = (folder: string, track: string) => perform('select-track', () => selectTrack(folder, track))
  const openFolders = () => {
    setFoldersMounted(true)
    setTab('albums')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setTab('now')} aria-label="Abrir Agora">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
          <span><strong>Survivor</strong><small>RADIO PLAYER</small></span>
        </button>
        <div className={`connection-dot${error ? ' connection-dot--error' : ''}`} title={error || 'Conectado ao Survivor'}><span /><span className="connection-label">{error ? 'Offline' : 'Na rede'}</span></div>
        <a className="settings-button" href="/" aria-label="Abrir interface administrativa" title="Administração"><Icon name="gear" /></a>
      </header>

      <main>
        <div hidden={tab !== 'now'}>
          <NowPlaying status={status} loading={loading} pending={pending} onAction={handleAction} />
        </div>
        {foldersMounted && (
          <div hidden={tab !== 'albums'}>
            <Albums status={status} pending={pending} onAction={handleAction} onSelectFolder={handleFolder} onSelectTrack={handleTrack} />
          </div>
        )}
      </main>

      {(notice || error) && <div className="toast" role="status"><Icon name="radio" /><span>{notice || `Sem conexão: ${error}`}</span><button onClick={() => { setNotice(null); void refresh(true) }} aria-label="Tentar novamente"><Icon name="refresh" /></button></div>}

      <nav className="tab-bar" aria-label="Navegação principal">
        <button className={tab === 'now' ? 'active' : ''} onClick={() => setTab('now')}><Icon name="radio" /><span>Agora</span></button>
        <button className={tab === 'albums' ? 'active' : ''} onClick={openFolders}><Icon name="albums" /><span>Pastas</span></button>
      </nav>
    </div>
  )
}
