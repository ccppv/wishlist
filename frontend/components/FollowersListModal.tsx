'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface Follower {
  id: number
  status: string
  friend: {
    id: number
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  requested_at: string
}

interface FollowersListModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FollowersListModal({ isOpen, onClose }: FollowersListModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchFollowers()
    }
  }, [isOpen])

  const fetchFollowers = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/friendships/lists/followers')
      setFollowers(response.data)
    } catch (error) {
      console.error('Error fetching followers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserClick = (username: string) => {
    window.location.href = `/u/${username}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Подписчики</h2>
            <button onClick={onClose} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-neutral-200 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="w-10 h-10 text-neutral-300 dark:text-neutral-500 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Пока нет подписчиков</p>
            </div>
          ) : (
            <div className="space-y-3">
              {followers.map((follower) => (
                <button
                  key={follower.id}
                  onClick={() => handleUserClick(follower.friend.username)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {follower.friend.avatar_url ? (
                      <img
                        src={getAvatarUrl(follower.friend.avatar_url) || ''}
                        alt={follower.friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 dark:text-neutral-400 font-medium text-lg">
                        {follower.friend.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {follower.friend.full_name || follower.friend.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 truncate">@{follower.friend.username}</p>
                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                      Отправил заявку {new Date(follower.requested_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 dark:text-neutral-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          
        </div>
      </div>
    </div>
  )
}
