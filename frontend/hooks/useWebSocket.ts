import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'

interface WebSocketMessage {
  type: string
  action?: string
  status?: string
  from_user_id?: number
  from_username?: string
  friendship_id?: number
  wishlist_id?: number
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const { user, token } = useAuthStore()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const onMessageRef = useRef(onMessage)
  const activeRef = useRef(false) // controls whether reconnect is allowed
  const retriesRef = useRef(0)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!user || !token || !activeRef.current) return
    if (typeof window === 'undefined') return

    // Close existing connection silently
    if (wsRef.current) {
      const old = wsRef.current
      wsRef.current = null
      try { old.close() } catch {}
    }

    const envWs = process.env.NEXT_PUBLIC_WS_URL
    const baseWsUrl = envWs
      ? `${envWs}/api/v1/ws/${user.id}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws/${user.id}`
    
    // Add JWT token as query parameter
    const wsUrl = `${baseWsUrl}?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        retriesRef.current = 0
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          onMessageRef.current?.(message)
        } catch {}
      }

      ws.onerror = () => {} // onclose will handle reconnect

      ws.onclose = () => {
        wsRef.current = null
        if (!activeRef.current) return // intentional close, don't reconnect
        // Exponential backoff: 3s, 6s, 12s, max 30s
        const delay = Math.min(3000 * Math.pow(2, retriesRef.current), 30000)
        retriesRef.current++
        if (retriesRef.current > 10) return // give up after 10 attempts
        reconnectTimeoutRef.current = setTimeout(connect, delay)
      }

      wsRef.current = ws
    } catch {
      // WebSocket constructor can throw in some browsers
    }
  }, [user, token])

  useEffect(() => {
    activeRef.current = true
    retriesRef.current = 0

    if (user) {
      connect()
    }

    return () => {
      activeRef.current = false // prevent onclose from reconnecting
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
    }
  }, [user, connect])

  // Reconnect when page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user && activeRef.current && !wsRef.current) {
        retriesRef.current = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, connect])

  return wsRef.current
}
