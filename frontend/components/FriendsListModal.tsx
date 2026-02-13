'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface Friend {
  id: number
  status: string
  friend: {
    id: number
    username: string
    full_name: string | null
    avatar_url: string | null
  }
  requested_at: string
  accepted_at: string | null
}

interface FriendsListModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FriendsListModal({ isOpen, onClose }: FriendsListModalProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchFriends()
    }
  }, [isOpen])

  const fetchFriends = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/friendships/')
      setFriends(response.data)
    } catch (error) {
      console.error('Error fetching friends:', error)
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-neutral-900">Друзья</h2>
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="w-10 h-10 text-neutral-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-neutral-500 text-sm">Пока нет друзей</p>
              <p className="text-neutral-400 text-xs mt-1">Найдите друзей через поиск</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friendship) => (
                <button
                  key={friendship.id}
                  onClick={() => handleUserClick(friendship.friend.username)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {friendship.friend.avatar_url ? (
                      <img
                        src={getAvatarUrl(friendship.friend.avatar_url) || ''}
                        alt={friendship.friend.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 font-medium text-lg">
                        {friendship.friend.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {friendship.friend.full_name || friendship.friend.username}
                    </p>
                    <p className="text-sm text-gray-500 truncate">@{friendship.friend.username}</p>
                    {friendship.accepted_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Друзья с {new Date(friendship.accepted_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
