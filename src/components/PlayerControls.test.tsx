import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlayerControls } from './PlayerControls'

describe('PlayerControls', () => {
  it('envia todas as ações do player', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<PlayerControls paused={false} disabled={false} onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: 'Faixa anterior' }))
    await user.click(screen.getByRole('button', { name: 'Reiniciar faixa' }))
    await user.click(screen.getByRole('button', { name: 'Pausar' }))
    await user.click(screen.getByRole('button', { name: 'Próxima faixa' }))

    expect(onAction.mock.calls.map(([action]) => action)).toEqual(['previous', 'restart', 'pause', 'next'])
  })

  it('troca pause por play, suporta modo compacto e bloqueio', () => {
    const { rerender } = render(<PlayerControls compact paused disabled={false} onAction={vi.fn()} pending="play" />)
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByRole('button', { name: 'Reiniciar faixa' })).not.toBeInTheDocument()

    rerender(<PlayerControls compact paused disabled onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeDisabled()
  })
})
