'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { User, Wishlist } from '@/types'

export default function UserProfilePage() {
  const params = useParams()
  const username = params.username as string

  const [user, setUser] = useState<User | null>(null)
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: string
    friendship_id: number | null
    requested_by_me: boolean
  } | null>(null)
  const [isAddingFriend, setIsAddingFriend] = useState(false)

  const fetchFriendshipStatus = useCallback(async (userId: number) => {
    try {
      const statusResponse = await apiClient.get(`/friendships/status/${userId}`)
      setFriendshipStatus(statusResponse.data)
    } catch {
      setFriendshipStatus(null)
    }
  }, [])

  const fetchWishlists = useCallback(async (uname: string) => {
    try {
      const wishlistsResponse = await apiClient.get(`/users/${uname}/wishlists`)
      setWishlists(wishlistsResponse.data)
    } catch {
      setWishlists([])
    }
  }, [])

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'friend_request' && user) {
      fetchFriendshipStatus(user.id)
    }
    if (message.type === 'wishlist' && user && message.owner_id === user.id) {
      fetchWishlists(user.username)
    }
  }, [user, fetchFriendshipStatus, fetchWishlists])

  useWebSocket(handleWebSocketMessage)

  useEffect(() => {
    if (!username) return

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const userResponse = await apiClient.get(`/users/${username}`)
        const u = userResponse.data
        setUser(u)
        await fetchWishlists(username)
        await fetchFriendshipStatus(u.id)
      } catch (err: any) {
        setError(err.response?.status === 404 ? 'Пользователь не найден' : 'Ошибка загрузки')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [username, fetchWishlists, fetchFriendshipStatus])

  const handleAddFriend = async () => {
    if (!user) return
    setIsAddingFriend(true)
    try {
      await apiClient.post('/friendships/', { friend_id: user.id })
      setFriendshipStatus({ status: 'pending', friendship_id: null, requested_by_me: true })
    } catch {
      // ignore
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleRemoveFriend = async () => {
    if (!friendshipStatus?.friendship_id) return
    if (!confirm('Удалить из друзей?')) return
    setIsAddingFriend(true)
    try {
      await apiClient.delete(`/friendships/${friendshipStatus.friendship_id}`)
      setFriendshipStatus({ status: 'none', friendship_id: null, requested_by_me: false })
    } catch {
      // ignore
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleAcceptFriend = async () => {
    if (!friendshipStatus?.friendship_id) return
    setIsAddingFriend(true)
    try {
      await apiClient.patch(`/friendships/${friendshipStatus.friendship_id}`, { status: 'accepted' })
      setFriendshipStatus({ status: 'accepted', friendship_id: friendshipStatus.friendship_id, requested_by_me: false })
    } catch {
      // ignore
    } finally {
      setIsAddingFriend(false)
    }
  }

  const handleRejectFriend = async () => {
    if (!friendshipStatus?.friendship_id) return
    setIsAddingFriend(true)
    try {
      await apiClient.delete(`/friendships/${friendshipStatus.friendship_id}`)
      setFriendshipStatus({ status: 'none', friendship_id: null, requested_by_me: false })
    } catch {
      // ignore
    } finally {
      setIsAddingFriend(false)
    }
  }

  const renderFriendAction = () => {
    if (!friendshipStatus || friendshipStatus.status === 'self') return null

    const btnBase = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition'

    if (isAddingFriend) {
      return (
        <button disabled className={`${btnBase} border border-neutral-300 dark:border-neutral-600 text-neutral-400 dark:text-neutral-500 cursor-not-allowed`}>
          <span className="w-4 h-4 border-[2px] border-neutral-300 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-300 rounded-full animate-spin" />
          Загрузка
        </button>
      )
    }

    switch (friendshipStatus.status) {
      case 'accepted':
        return (
          <button onClick={handleRemoveFriend} className={`${btnBase} border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            В друзьях
          </button>
        )
      case 'pending':
        if (friendshipStatus.requested_by_me) {
          return (
            <button disabled className={`${btnBase} border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-default`}>
              Заявка отправлена
            </button>
          )
        }
        return (
          <div className="flex gap-2">
            <button onClick={handleAcceptFriend} className={`${btnBase} bg-neutral-900 text-white hover:bg-neutral-800`}>
              Принять
            </button>
            <button onClick={handleRejectFriend} className={`${btnBase} border border-neutral-300 text-neutral-700 hover:bg-neutral-50`}>
              Отклонить
            </button>
          </div>
        )
      case 'blocked':
        return (
          <button disabled className={`${btnBase} border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 cursor-default`}>
            Заблокирован
          </button>
        )
      default:
        return (
          <button onClick={handleAddFriend} className={`${btnBase} bg-neutral-900 text-white hover:bg-neutral-800`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить в друзья
          </button>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-neutral-300 dark:border-neutral-600 border-t-neutral-800 dark:border-t-neutral-200 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-neutral-900">
        <header className="sticky top-0 z-30 px-3 pt-3">
          <div className="bg-header border border-gray-200/40 dark:border-neutral-700/50 rounded-2xl shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <Link href="/profile" className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Назад</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <svg className="w-14 h-14 text-neutral-300 dark:text-neutral-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-1">{error || 'Пользователь не найден'}</p>
          <Link href="/profile" className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
            Вернуться к профилю
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="bg-header border border-gray-200/40 dark:border-neutral-700/50 rounded-2xl shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/profile" className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Назад</span>
            </Link>
            <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900 hover:opacity-80 transition">Wishlist</Link>
            <div className="w-16" />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4">
        {/* Profile */}
        <section className="flex flex-col items-center pt-10 pb-8 sm:pt-12 sm:pb-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/70 border border-neutral-200/60 flex items-center justify-center overflow-hidden shadow-sm">
            {user.avatar_url ? (
              <img src={getAvatarUrl(user.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-9 h-9 sm:w-11 sm:h-11 text-neutral-300 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {user.full_name || user.username}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-400 dark:text-neutral-500">@{user.username}</p>

          {renderFriendAction() && (
            <div className="mt-5">
              {renderFriendAction()}
            </div>
          )}
        </section>

        {/* Wishlists */}
        <section className="pb-10">
          <h3 className="text-lg font-semibold text-neutral-900 mb-5">Вишлисты</h3>

          {wishlists.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <svg className="w-12 h-12 text-neutral-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-neutral-500 text-sm">Пока нет вишлистов</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlists.map(wishlist => {
                const daysLeft = wishlist.event_date
                  ? Math.ceil((new Date(wishlist.event_date).getTime() - Date.now()) / 86400000)
                  : null
                const n = wishlist.items_count ?? 0
                const plural = n % 10 === 1 && n % 100 !== 11 ? 'подарок' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'подарка' : 'подарков'
                const hasShareLink = wishlist.share_token && wishlist.share_token !== 'undefined' && String(wishlist.share_token).trim() !== ''
                const cn = `group block bg-white/60 backdrop-blur-sm rounded-2xl border border-neutral-200/40 overflow-hidden ${hasShareLink ? 'hover:border-neutral-200/70 hover:shadow-md transition-all' : ''}`
                const cardContent = (
                  <>
                    <div className="aspect-square w-full flex items-center justify-center rounded-t-2xl bg-neutral-50/80 overflow-hidden">
                      {wishlist.cover_emoji ? (
                        <span className="text-4xl sm:text-5xl">{wishlist.cover_emoji}</span>
                      ) : wishlist.cover_image_url ? (
                        <img src={getAvatarUrl(wishlist.cover_image_url) || ''} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <h4 className="text-sm font-semibold text-neutral-900 truncate leading-snug">{wishlist.title}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{n} {plural}</p>
                      {wishlist.wishlist_type === 'event' && wishlist.event_date && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {new Date(wishlist.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                            <span className="text-primary-500 ml-1.5">
                              {daysLeft === 0 ? 'сегодня' : daysLeft === 1 ? 'завтра' : `через ${daysLeft} дн.`}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </>
                )

                return hasShareLink ? (
                  <a key={wishlist.id} href={`/wl/${wishlist.share_token}`} className={cn}>{cardContent}</a>
                ) : (
                  <div key={wishlist.id} className={cn}>{cardContent}</div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-neutral-400">&copy; {new Date().getFullYear()} Wishlist</p>
        </div>
      </footer>
    </div>
  )
}
