'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api-client'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setAuth, logout, setInitialized } = useAuthStore()

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    const initAuth = async () => {
      // If we have a token from persisted state, verify it's still valid
      if (token) {
        try {
          // Verify token by fetching current user data
          const response = await apiClient.get('/users/me')
          // Token is valid, update user data (in case it changed on server)
          setAuth(token, response.data)
        } catch (error) {
          // Token is invalid or expired, clear auth state
          console.error('Token verification failed:', error)
          logout()
        }
      }
      
      // Mark initialization as complete
      setInitialized(true)
    }
    
    initAuth()
  }, []) // Run only once on mount

  return <>{children}</>
}
