import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type MarqueeStyle = CSSProperties & {
  '--marquee-distance'?: string
  '--marquee-duration'?: string
}

export function MarqueeText({ children }: Props) {
  const viewportRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [style, setStyle] = useState<MarqueeStyle>()

  useLayoutEffect(() => {
    let frame = 0
    const measure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const viewport = viewportRef.current
        const text = textRef.current
        if (!viewport || !text) return
        const distance = Math.ceil(text.scrollWidth - viewport.clientWidth)
        setStyle(distance > 2 ? {
          '--marquee-distance': `-${distance}px`,
          '--marquee-duration': `${Math.min(14, Math.max(6, distance / 18 + 4))}s`,
        } : undefined)
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (textRef.current) observer.observe(textRef.current)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [children])

  return (
    <span ref={viewportRef} className={`marquee-line${style ? ' marquee-line--active' : ''}`} title={typeof children === 'string' ? children : undefined}>
      <span ref={textRef} className="marquee-line__text" style={style}>{children}</span>
    </span>
  )
}
