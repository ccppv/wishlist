'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = base.includes('/api/v1') ? `${base}/auth/forgot-password` : `${base}/api/v1/auth/forgot-password`
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (r.ok) {
        setSent(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.detail || 'Сервис восстановления пароля пока в разработке.')
      }
    } catch {
      setError('Сервис восстановления пароля пока в разработке.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-cloud)] flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
            Восстановление пароля
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {sent
              ? 'Если аккаунт найден, на почту придёт ссылка для сброса пароля.'
              : 'Введите email — отправим ссылку для сброса пароля.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-neutral-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800/50 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none transition text-gray-900 dark:text-white"
                placeholder="email@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium py-3.5 rounded-xl transition-colors"
            >
              {isLoading ? 'Отправка...' : 'Отправить'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              Проверьте почту (включая папку «Спам»).
            </p>
            <Link
              href="/auth/login"
              className="inline-block text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Вернуться к входу
            </Link>
          </div>
        )}

        <p className="text-center">
          <Link href="/auth/login" className="text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-400">
            ← Назад к входу
          </Link>
        </p>
      </div>
    </div>
  )
}
