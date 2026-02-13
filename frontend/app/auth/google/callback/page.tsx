'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        google_denied: 'Вход через Google был отменён',
        no_code: 'Ошибка авторизации Google',
        google_token_failed: 'Не удалось получить токен от Google',
        google_userinfo_failed: 'Не удалось получить данные от Google',
        no_email: 'Google не предоставил email',
      }
      setError(errorMessages[errorParam] || 'Ошибка входа через Google')
      setTimeout(() => router.push('/auth/login'), 3000)
      return
    }

    if (token) {
      // We have a token from the backend, fetch user data
      handleGoogleAuth(token)
    } else {
      router.push('/auth/login')
    }
  }, [searchParams])

  const handleGoogleAuth = async (token: string) => {
    try {
      // Temporarily set the token to make authenticated request
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const user = response.data
      setAuth(token, user)

      if (!user.onboarding_completed) {
        router.push('/auth/onboarding')
      } else {
        router.push('/profile')
      }
    } catch (err) {
      setError('Ошибка авторизации. Попробуйте снова.')
      setTimeout(() => router.push('/auth/login'), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Ошибка</h1>
            <p className="text-gray-600">{error}</p>
            <p className="text-gray-400 text-sm mt-2">Перенаправление...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Вход через Google</h1>
            <p className="text-gray-600">Авторизация...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  )
}
