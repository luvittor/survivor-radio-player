import type { SVGProps } from 'react'

type IconName =
  | 'albums'
  | 'back'
  | 'chevronLeft'
  | 'chevronRight'
  | 'disc'
  | 'gear'
  | 'music'
  | 'next'
  | 'pause'
  | 'play'
  | 'previous'
  | 'radio'
  | 'refresh'
  | 'restart'
  | 'search'

const paths: Record<IconName, React.ReactNode> = {
  albums: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5V3h10v2M8 12h8M12 8v8"/></>,
  back: <><path d="m15 18-6-6 6-6"/></>,
  chevronLeft: <path d="m15 18-6-6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  disc: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M21 12h-7"/></>,
  gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.08A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.25.62.85 1.02 1.52 1.03H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
  music: <><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
  next: <><path d="m5 5 10 7L5 19V5Z"/><path d="M19 5v14"/></>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  play: <path d="m7 4 13 8-13 8V4Z"/>,
  previous: <><path d="m19 5-10 7 10 7V5Z"/><path d="M5 5v14"/></>,
  radio: <><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/></>,
  refresh: <><path d="M20 6v5h-5"/><path d="M19 11a7.5 7.5 0 1 0 .2 3"/></>,
  restart: <><path d="M4 12a8 8 0 1 1 2.34 5.66"/><path d="M4 17v-5h5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
}

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}
