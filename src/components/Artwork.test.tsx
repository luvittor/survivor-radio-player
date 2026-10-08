import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Artwork } from './Artwork'

describe('Artwork', () => {
  it('versiona a capa e usa o placeholder quando a imagem falha', () => {
    render(<Artwork src="/artwork/current" cacheKey="Pasta/faixa.mp3" alt="Capa" />)
    const image = screen.getByAltText('Capa')
    expect(image).toHaveAttribute('src', '/api/artwork/current?media=Pasta%2Ffaixa.mp3')
    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/icon.png')
  })

  it('usa o SVG live e recua para o PNG live se necessário', () => {
    render(<Artwork live src="/artwork/current" alt="Live" />)
    const image = screen.getByAltText('Live')
    expect(image).toHaveAttribute('src', '/live.svg')
    fireEvent.error(image)
    expect(image).toHaveAttribute('src', '/live.png')
  })
})
