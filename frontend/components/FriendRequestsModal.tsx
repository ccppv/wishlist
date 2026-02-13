'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface FriendRequest {
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

interface FriendRequestsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FriendRequestsModal({ isOpen, onClose }: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get('/friendships/requests')
      setRequests(response.data)
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (requestId: number) => {
    setProcessingIds(prev => new Set(prev).add(requestId))
    try {
      await apiClient.patch(`/friendships/${requestId}`, { status: 'accepted' })
      setRequests(prev => prev.filter(req => req.id !== requestId))
    } catch (error) {
      console.error('Error accepting friend request:', error)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleReject = async (requestId: number) => {
    setProcessingIds(prev => new Set(prev).add(requestId))
    try {
      await apiClient.delete(`/friendships/${requestId}`)
      setRequests(prev => prev.filter(req => req.id !== requestId))
    } catch (error) {
      console.error('Error rejecting friend request:', error)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Заявки в друзья</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500">Нет новых заявок в друзья</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const isProcessing = processingIds.has(request.id)
                
                return (
                  <div
                    key={request.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {request.friend.avatar_url ? (
                          <img
                            src={getAvatarUrl(request.friend.avatar_url) || ''}
                            alt={request.friend.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 font-medium text-lg">
                            {request.friend.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {request.friend.full_name || request.friend.username}
                        </p>
                        <p className="text-sm text-gray-500 truncate">@{request.friend.username}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(request.requested_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
                      >
                        {isProcessing ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Загрузка...
                          </div>
                        ) : (
                          '✓ Принять'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 font-medium rounded-lg transition"
                      >
                        ✕ Отклонить
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full mt-6 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
