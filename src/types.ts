export type Artwork = {
  available: boolean
  url: string
  source?: string
  content_type?: string
}

export type Media = {
  path: string
  filename: string
  title?: string
  artist?: string
  album_artist?: string
  album?: string
  duration_seconds?: number
  artwork?: Artwork
}

export type RadioStatus = {
  mode: string
  live_connected: boolean
  paused: boolean
  pause_phase?: string
  current_folder?: string
  track_index?: number
  track_count?: number
  position_seconds?: number
  current_media: Media | null
}

export type CatalogFolder = {
  folder: string
  track_index?: number
  name: string
  artwork_url?: string
}

export type CatalogTrack = {
  index: number
  global_index?: number
  name: string
  track: string
  metadata?: Media
}

export type CatalogRoot = {
  catalog_root?: string
  track_count: number
  folder_count: number
  folders: CatalogFolder[]
}

export type CatalogDetail = {
  catalog_root?: string
  folder: string
  exists: boolean
  artwork_url?: string
  subfolders: CatalogFolder[]
  tracks: CatalogTrack[]
}

export type ControlAction =
  | 'previous'
  | 'restart'
  | 'pause'
  | 'play'
  | 'next'
  | 'previous-folder'
  | 'next-folder'
