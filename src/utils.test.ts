import { describe, expect, it } from 'vitest'
import type { RadioStatus } from './types'
import { formatTime, isLive, joinArtist } from './utils'

const status: RadioStatus = {
  mode: 'fallback-catalog',
  live_connected: false,
  paused: false,
  current_media: null,
}

describe('player helpers', () => {
  it('formats elapsed time for tracks and long broadcasts', () => {
    expect(formatTime(12.9)).toBe('0:12')
    expect(formatTime(3671)).toBe('1:01:11')
    expect(formatTime(undefined)).toBe('—:—')
  })

  it('detects live mode from either backend signal', () => {
    expect(isLive({ ...status, live_connected: true })).toBe(true)
    expect(isLive({ ...status, mode: 'live-uplink' })).toBe(true)
    expect(isLive(status)).toBe(false)
  })

  it('uses artist, album artist and station name in that order', () => {
    expect(joinArtist({ ...status, current_media: { path: 'a', filename: 'a', artist: 'Artist', album_artist: 'DJ' } })).toBe('Artist')
    expect(joinArtist({ ...status, current_media: { path: 'a', filename: 'a', album_artist: 'DJ' } })).toBe('DJ')
    expect(joinArtist(status)).toBe('Survivor Radio')
  })
})
