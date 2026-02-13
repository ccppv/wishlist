'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const { setAuth } = useAuthStore()

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      router.push('/auth/register')
    }
  }, [email, router])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // only digits

    const newCode = [...code]
    newCode[index] = value.slice(-1) // take last digit
    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (value && index === 5 && newCode.every(d => d !== '')) {
      handleSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(pasted)
    }
  }

  const handleSubmit = async (fullCode?: string) => {
    const codeStr = fullCode || code.join('')
    if (codeStr.length !== 6) {
      setError('Введите 6-значный код')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await apiClient.post('/auth/verify-email', {
        email,
        code: codeStr,
      })

      const { access_token, user } = response.data
      setAuth(access_token, user)

      if (!user.onboarding_completed) {
        router.push('/auth/onboarding')
      } else {
        router.push('/profile')
      }
    } catch (err: any) {
      const raw = err.response?.data?.detail
      const errorMessage = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Ошибка верификации'
      setError(errorMessage)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    try {
      await apiClient.post('/auth/resend-code', { email })
      setSuccessMessage('Код отправлен повторно')
      setResendCooldown(60)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      const raw = err.response?.data?.detail
      setError(typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Не удалось отправить код')
    }
  }

  if (!email) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Подтвердите email</h1>
          <p className="text-gray-600 text-sm">
            Мы отправили 6-значный код на<br />
            <span className="font-medium text-gray-900">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-gray-900"
              disabled={isLoading}
            />
          ))}
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={isLoading || code.some(d => d === '')}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors mb-4"
        >
          {isLoading ? 'Проверка...' : 'Подтвердить'}
        </button>

        <div className="text-center">
          <p className="text-gray-600 text-sm mb-2">Не получили код?</p>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm disabled:text-gray-400"
          >
            {resendCooldown > 0
              ? `Отправить повторно (${resendCooldown}с)`
              : 'Отправить повторно'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/auth/register" className="text-sm text-gray-500 hover:text-gray-700">
            ← Изменить email
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Загрузка...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
