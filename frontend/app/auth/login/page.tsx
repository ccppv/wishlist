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
  const [agreed, setAgreed] = useState(false)

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
      const params = new URLSearchParams()
      params.append('username', formData.username)
      params.append('password', formData.password)

      const response = await apiClient.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
    <div className="min-h-screen bg-[var(--bg-cloud)] flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-[400px] space-y-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Вход</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Войдите в свой аккаунт</p>
        </div>

        {/* Google Sign-In */}
        <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-800/80 border border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500 text-gray-700 dark:text-neutral-200 font-medium py-3.5 rounded-xl transition-colors"
      >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200/80 dark:border-neutral-600/80"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-[var(--bg-cloud)] text-gray-400 dark:text-neutral-500">или</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-gray-600 dark:text-neutral-400">
              Имя пользователя или Email
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
              placeholder="username или email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-neutral-400">
                Пароль
              </label>
              <Link href="/auth/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Забыли пароль?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
              Я принимаю{' '}
              <a href="/terms" target="_blank" className="text-primary-600 dark:text-primary-400 hover:underline">соглашение</a>
              {' '}и{' '}
              <a href="/privacy" target="_blank" className="text-primary-600 dark:text-primary-400 hover:underline">политику</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading || !agreed}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          Нет аккаунта?{' '}
          <Link href="/auth/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </p>

        <p className="text-center">
          <Link href="/" className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-400">
            ← На главную
          </Link>
        </p>
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
