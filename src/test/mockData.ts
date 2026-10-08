import type { CatalogDetail, CatalogFolder, CatalogTrack, Media, RadioStatus } from '../types'

const media = (folder: string, filename: string, title: string, artist: string, duration: number): Media => ({
  path: `${folder}/${filename}`,
  filename,
  title,
  artist,
  album_artist: 'Survivor DJs',
  album: folder,
  duration_seconds: duration,
  artwork: { available: true, url: '/artwork/current', source: 'embedded-track', content_type: 'image/png' },
})

export const mockLibrary: Record<string, Media[]> = {
  'Flash Balada': [
    media('Flash Balada', '01 Because You Loved Me.mp3', 'Because You Loved Me', 'Suzann Rye', 290),
    media('Flash Balada', '02 Total Eclipse of the Heart.mp3', 'Total Eclipse of the Heart', 'Bonnie Tyler', 267),
  ],
  'Metro Tech 3': [media('Metro Tech 3', '01 Neon.mp3', 'Neon', 'The Circuit', 213)],
  'Metro Tech 10': [media('Metro Tech 10', '01 Voltage.mp3', 'Voltage', 'Night Grid', 198)],
}

export const mockFolders: CatalogFolder[] = [
  { folder: 'Metro Tech 10', name: 'Metro Tech 10', artwork_url: '/artwork/album?folder=Metro%20Tech%2010' },
  { folder: 'Flash Balada', name: 'Flash Balada', artwork_url: '/artwork/album?folder=Flash%20Balada' },
  { folder: 'Metro Tech 3', name: 'Metro Tech 3', artwork_url: '/artwork/album?folder=Metro%20Tech%203' },
]

export const makeTracks = (folder: string): CatalogTrack[] => (mockLibrary[folder] || []).map((item, index) => ({
  index,
  global_index: index,
  name: item.title || item.filename,
  track: item.filename,
  metadata: item,
}))

export const makeFolderDetail = (folder: string): CatalogDetail => ({
  catalog_root: '/music',
  folder,
  exists: Boolean(mockLibrary[folder]),
  artwork_url: `/artwork/album?folder=${encodeURIComponent(folder)}`,
  subfolders: [],
  tracks: makeTracks(folder),
})

export const initialStatus = (): RadioStatus => ({
  mode: 'fallback-catalog',
  live_connected: false,
  paused: false,
  pause_phase: 'playing',
  current_folder: 'Flash Balada',
  track_index: 0,
  track_count: Object.values(mockLibrary).flat().length,
  position_seconds: 12,
  current_media: mockLibrary['Flash Balada'][0],
})
