'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isInitialized, updateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [fullName, setFullName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Wait for auth initialization
    if (!isInitialized) return;
    
    // Если пользователь не авторизован
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Если уже прошел онбординг
    if (user.onboarding_completed) {
      router.push('/profile')
      return
    }
  }, [user, isInitialized, router])

  // Show loading while initializing
  if (!isInitialized || !user || user.onboarding_completed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверка размера (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB')
      return
    }

    // Проверка типа
    if (!file.type.startsWith('image/')) {
      setError('Можно загружать только изображения')
      return
    }

    setAvatarFile(file)
    setError('')

    // Создаем preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Пожалуйста, введите имя')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('full_name', fullName)
      
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const response = await apiClient.post('/auth/onboarding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Обновляем данные пользователя
      updateUser(response.data)
      
      router.push('/profile')
    } catch (err: any) {
      const raw = err.response?.data?.detail
      const errorMessage = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Ошибка при завершении онбординга'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Добро пожаловать!</h1>
          <p className="text-gray-600 dark:text-neutral-400">Давайте настроим ваш профиль</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div 
              className="w-32 h-32 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition mb-4"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-16 h-16 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
            >
              {avatarPreview ? 'Изменить фото' : 'Загрузить фото'}
            </button>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Опционально, макс. 5MB</p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Ваше имя <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-gray-900 dark:bg-neutral-700 dark:text-white"
              placeholder="Иван Иванов"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isLoading ? 'Сохранение...' : 'Продолжить'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Вы сможете изменить эти данные позже в настройках профиля
          </p>
        </div>
      </div>
    </div>
  )
}
