'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { user, token, isInitialized, updateUser, logout } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!isInitialized) return

    if (!token) {
      router.push('/auth/login')
      return
    }

    if (user) {
      setFormData({
        full_name: user.full_name || '',
        username: user.username,
        email: user.email
      })
      if (user.avatar_url) {
        setAvatarPreview(getAvatarUrl(user.avatar_url) || '')
      }
    }
  }, [user, token, isInitialized, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Размер файла не должен превышать 5MB' })
      return
    }

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Можно загружать только изображения' })
      return
    }

    setAvatarFile(file)
    setMessage({ type: '', text: '' })

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const submitData = new FormData()
      submitData.append('full_name', formData.full_name)
      
      if (avatarFile) {
        submitData.append('avatar', avatarFile)
      }

      const response = await apiClient.patch('/users/me', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      updateUser(response.data)
      setMessage({ type: 'success', text: 'Изменения сохранены' })
      setAvatarFile(null)
    } catch (err: any) {
      const raw = err.response?.data?.detail
      const errorMessage = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Ошибка при сохранении'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      return
    }

    try {
      await apiClient.delete('/users/me')
      logout()
      router.push('/')
    } catch (err: any) {
      const raw = err.response?.data?.detail
      const errorMessage = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Ошибка при удалении аккаунта'
      setMessage({ type: 'error', text: errorMessage })
    }
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Success/Error Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Профиль</h2>

            {/* Avatar */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Фото профиля
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
                  >
                    Изменить фото
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG или GIF. Макс. 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="mb-4">
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Имя
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="Ваше имя"
              />
            </div>

            {/* Username (read-only) */}
            <div className="mb-4">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Имя пользователя
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-sm text-gray-500 mt-1">
                Имя пользователя нельзя изменить
              </p>
            </div>

            {/* Email (read-only) */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-sm text-gray-500 mt-1">
                Email нельзя изменить
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>

          {/* Privacy Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Приватность</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Профиль виден только друзьям</p>
                  <p className="text-sm text-gray-600">Только добавленные друзья могут видеть ваши вишлисты</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Уведомления</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email уведомления</p>
                  <p className="text-sm text-gray-600">Получать уведомления о резервировании подарков</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
            <h2 className="text-xl font-bold text-red-600 mb-2">Опасная зона</h2>
            <p className="text-gray-600 text-sm mb-4">
              Удаление аккаунта — необратимое действие. Все ваши данные будут удалены навсегда.
            </p>
            <button
              onClick={handleDeleteAccount}
              type="button"
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
            >
              Удалить аккаунт
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
