'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import type { User } from '@/types'

interface AddFriendsModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
}

export default function AddFriendsModal({ isOpen, onClose, username }: AddFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [friendStatuses, setFriendStatuses] = useState<Record<number, { status: string; loading: boolean }>>({})

  if (!isOpen) return null

  const profileLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/u/${username}`
    : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await apiClient.get(`/users/search?query=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data)
      
      // Check friendship status for each user
      const statuses: Record<number, { status: string; loading: boolean }> = {}
      for (const user of response.data) {
        try {
          const statusResponse = await apiClient.get(`/friendships/status/${user.id}`)
          statuses[user.id] = { status: statusResponse.data.status, loading: false }
        } catch (error) {
          statuses[user.id] = { status: 'none', loading: false }
        }
      }
      setFriendStatuses(statuses)
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddFriend = async (userId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    setFriendStatuses(prev => ({
      ...prev,
      [userId]: { ...prev[userId], loading: true }
    }))

    try {
      await apiClient.post('/friendships/', { friend_id: userId })
      setFriendStatuses(prev => ({
        ...prev,
        [userId]: { status: 'pending', loading: false }
      }))
    } catch (error) {
      console.error('Add friend error:', error)
      setFriendStatuses(prev => ({
        ...prev,
        [userId]: { ...prev[userId], loading: false }
      }))
    }
  }

  const handleUserClick = (clickedUsername: string) => {
    window.location.href = `/u/${clickedUsername}`
  }

  const getFriendButtonContent = (userId: number) => {
    const friendStatus = friendStatuses[userId]
    
    if (!friendStatus) {
      return { text: 'Добавить', className: 'bg-primary-600 hover:bg-primary-700 text-white', disabled: false }
    }

    if (friendStatus.loading) {
      return { 
        text: '...', 
        className: 'bg-gray-400 text-white cursor-not-allowed', 
        disabled: true 
      }
    }

    switch (friendStatus.status) {
      case 'accepted':
        return { text: 'Друзья', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default', disabled: true }
      case 'pending':
        return { text: 'Заявка отправлена', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 cursor-default', disabled: true }
      case 'self':
        return { text: 'Это вы', className: 'bg-gray-200 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 cursor-default', disabled: true }
      default:
        return { text: 'Добавить', className: 'bg-primary-600 hover:bg-primary-700 text-white', disabled: false }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Добавить друзей</h2>
            <button onClick={onClose} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search by Username */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Поиск по имени пользователя
            </label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Введите @username"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition text-gray-900"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user) => {
                  const buttonContent = getFriendButtonContent(user.id)
                  
                  return (
                    <div
                      key={user.id}
                      className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition"
                    >
                      <button
                        onClick={() => handleUserClick(user.username)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-gray-600 dark:text-neutral-400 font-medium">{user.username[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{user.full_name || user.username}</p>
                          <p className="text-sm text-gray-500 dark:text-neutral-400 truncate">@{user.username}</p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleAddFriend(user.id, e)}
                        disabled={buttonContent.disabled}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-shrink-0 ${buttonContent.className}`}
                      >
                        {buttonContent.text}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400 text-center">Пользователи не найдены</p>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-neutral-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-neutral-800 text-gray-500 dark:text-neutral-400">или</span>
            </div>
          </div>

          {/* Share Profile Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Поделиться ссылкой на профиль
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileLink}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-neutral-300'
                }`}
              >
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">Ссылка скопирована</p>
            )}
          </div>

          {/* Info */}
          <div className="mt-5 p-3.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Отправьте ссылку друзьям, чтобы они могли найти вас и видеть ваши вишлисты
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
