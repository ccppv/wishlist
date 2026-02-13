'use client'

import { useState, useEffect, useRef } from 'react'
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

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function NotificationsDropdown({ isOpen, onClose, onUpdate }: NotificationsDropdownProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) fetchRequests()
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Don't close if clicking on buttons inside the dropdown
      if (target.closest('button') && dropdownRef.current?.contains(target)) {
        return
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

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
      onUpdate()
    } catch (error) {
      console.error('Error accepting friend request:', error)
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(requestId); return s })
    }
  }

  const handleReject = async (requestId: number) => {
    setProcessingIds(prev => new Set(prev).add(requestId))
    try {
      await apiClient.delete(`/friendships/${requestId}`)
      setRequests(prev => prev.filter(req => req.id !== requestId))
      onUpdate()
    } catch (error) {
      console.error('Error rejecting friend request:', error)
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(requestId); return s })
    }
  }

  if (!isOpen) return null

  return (
    <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Уведомления</h3>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-500 text-sm">Уведомлений нет</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((request) => {
              const isProcessing = processingIds.has(request.id)
              return (
                <div key={request.id} className="p-3 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {request.friend.avatar_url ? (
                        <img src={getAvatarUrl(request.friend.avatar_url) || ''} alt={request.friend.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-600 font-medium">{request.friend.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {request.friend.full_name || request.friend.username}
                      </p>
                      <p className="text-xs text-gray-500">Хочет добавить в друзья</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    <button onClick={() => handleAccept(request.id)} disabled={isProcessing}
                      className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition">
                      {isProcessing ? '...' : 'Принять'}
                    </button>
                    <button onClick={() => handleReject(request.id)} disabled={isProcessing}
                      className="flex-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-400 text-gray-700 text-xs font-medium rounded-lg transition">
                      Отклонить
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
