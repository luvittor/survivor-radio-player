import { useCallback, useEffect, useRef, useState } from 'react'
import { getStatus } from './api'
import type { RadioStatus } from './types'

// A faixa também pode mudar em outro dispositivo. Um intervalo curto mantém
// título, progresso e capa sincronizados sem depender da ação local.
const POLL_INTERVAL = 1000

export function useRadioStatus() {
  const [status, setStatus] = useState<RadioStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const nextStatus = await getStatus()
      if (!mounted.current) return
      setStatus(nextStatus)
      setError(null)
    } catch (reason) {
      if (!mounted.current) return
      setError(reason instanceof Error ? reason.message : 'Não foi possível conectar ao Survivor')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const initial = window.setTimeout(() => void refresh(), 0)
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL)
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted.current = false
      window.clearTimeout(initial)
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return { status, loading, error, refresh }
}
