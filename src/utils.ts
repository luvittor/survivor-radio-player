import type { RadioStatus } from './types'

const naturalCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
})

export function naturalCompare(left: string, right: string): number {
  return naturalCollator.compare(left, right)
}

export function isLive(status: RadioStatus | null): boolean {
  return Boolean(status?.live_connected || status?.mode?.toLowerCase().includes('live'))
}

export function formatTime(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—:—'
  const value = Math.floor(seconds)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = value % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

export function joinArtist(status: RadioStatus | null): string {
  const media = status?.current_media
  return media?.artist || media?.album_artist || 'Survivor Radio'
}
