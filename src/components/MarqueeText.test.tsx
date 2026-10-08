import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarqueeText } from './MarqueeText'

describe('MarqueeText', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ativa movimento apenas quando o texto não cabe', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('marquee-line') ? 100 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('marquee-line__text') ? 280 : 0
    })

    const { container } = render(<MarqueeText>Um título propositalmente muito comprido</MarqueeText>)
    const viewport = container.querySelector('.marquee-line')
    const text = container.querySelector<HTMLElement>('.marquee-line__text')

    await waitFor(() => expect(viewport).toHaveClass('marquee-line--active'))
    expect(text?.style.getPropertyValue('--marquee-distance')).toBe('-180px')
    expect(viewport).toHaveAttribute('title', 'Um título propositalmente muito comprido')
  })
})
