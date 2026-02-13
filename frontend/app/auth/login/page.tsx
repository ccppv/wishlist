'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
const GOOGLE_LOGIN_URL = API_BASE.replace('/api/v1', '/api/auth/google/login')

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isInitialized, setAuth } = useAuthStore()
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isInitialized) return;
    if (user) {
      if (user.onboarding_completed) {
        router.push('/profile')
      } else {
        router.push('/auth/onboarding')
      }
    }
  }, [user, isInitialized, router])

  useEffect(() => {
    const googleError = searchParams.get('error')
    if (googleError) {
      const messages: Record<string, string> = {
        google_denied: 'Вход через Google был отменён',
        google_token_failed: 'Ошибка авторизации через Google',
        google_userinfo_failed: 'Не удалось получить данные от Google',
        no_email: 'Google не предоставил email',
        no_code: 'Ошибка авторизации',
      }
      setError(messages[googleError] || 'Ошибка входа через Google')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const formDataObj = new FormData()
      formDataObj.append('username', formData.username)
      formDataObj.append('password', formData.password)

      const response = await apiClient.post('/auth/login', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const { access_token, user } = response.data
      setAuth(access_token, user)

      if (!user.onboarding_completed) {
        router.push('/auth/onboarding')
      } else {
        router.push('/profile')
      }
    } catch (err: any) {
      const status = err.response?.status
      const raw = err.response?.data?.detail
      let detail = ''
      if (typeof raw === 'string') detail = raw
      else if (Array.isArray(raw) && raw.length > 0) detail = raw.map((e: any) => e.msg || String(e)).join('; ')

      if (status === 403 && detail.includes('не подтверждён')) {
        const emailOrUsername = formData.username
        router.push(`/auth/verify-email?email=${encodeURIComponent(emailOrUsername)}`)
        return
      }

      setError(detail || 'Неправильный логин или пароль')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_LOGIN_URL
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Вход</h1>
          <p className="text-gray-600">Войдите в свой аккаунт</p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">или</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Имя пользователя или Email
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="username или email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Нет аккаунта?{' '}
            <Link href="/auth/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
