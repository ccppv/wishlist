'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import CreateWishlistModal from '@/components/CreateWishlistModal'
import AddFriendsModal from '@/components/AddFriendsModal'
import QRCodeModal from '@/components/QRCodeModal'
import NotificationsDropdown from '@/components/NotificationsDropdown'
import WishlistSettingsModal from '@/components/wishlists/WishlistSettingsModal'
import FriendsListModal from '@/components/FriendsListModal'
import FollowersListModal from '@/components/FollowersListModal'
import WishlistActionMenu from '@/components/WishlistActionMenu'
import ThemeToggle from '@/components/ThemeToggle'
import { useTheme } from '@/components/ThemeProvider'

function MobileThemeButton() {
  const { theme, setTheme } = useTheme()
  const labels = { light: 'Светлая тема', dark: 'Тёмная тема', system: 'Системная тема' }
  const icons = {
    light: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    dark: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    system: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  }
  const next = () => {
    const order: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    setTheme(order[(order.indexOf(theme) + 1) % 3])
  }
  return (
    <button onClick={next} className="w-full flex items-center gap-3 px-5 py-3.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition">
      <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[theme]} />
      </svg>
      <span className="text-[15px]">{labels[theme]}</span>
    </button>
  )
}
import type { Wishlist } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user, token, logout, isInitialized } = useAuthStore()
  const [wishlists, setWishlists] = useState<Wishlist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false)
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false)
  const [showFriendsListModal, setShowFriendsListModal] = useState(false)
  const [showFollowersListModal, setShowFollowersListModal] = useState(false)
  const [friendRequestsCount, setFriendRequestsCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [editingWishlist, setEditingWishlist] = useState<Wishlist | null>(null)
  const [showBurger, setShowBurger] = useState(false)

  useEffect(() => {
    if (!isInitialized) return
    if (!token) { router.push('/auth/login'); return }
    if (user && !user.onboarding_completed) { router.push('/auth/onboarding'); return }
    fetchWishlists()
  }, [token, user, router, isInitialized])

  const fetchWishlists = async () => {
    try {
      const response = await apiClient.get('/wishlists/')
      setWishlists(response.data)
    } catch (error) {
      console.error('Error fetching wishlists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const response = await apiClient.get('/friendships/requests')
      setFriendRequestsCount(response.data.length)
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }

  const fetchFriendshipCounts = async () => {
    try {
      const response = await apiClient.get('/friendships/stats/counts')
      setFriendsCount(response.data.friends_count)
      setFollowersCount(response.data.followers_count)
    } catch (error) {
      console.error('Error fetching friendship counts:', error)
    }
  }

  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'friend_request') {
      fetchFriendRequests()
      fetchFriendshipCounts()
      if (message.action === 'updated' && message.status === 'accepted') fetchWishlists()
    }
    if (message.type === 'wishlist' || message.type === 'wishlist_item') fetchWishlists()
  }, [])

  useWebSocket(handleWebSocketMessage)

  useEffect(() => {
    if (token && user?.onboarding_completed) {
      fetchFriendRequests()
      fetchFriendshipCounts()
      const interval = setInterval(() => { fetchFriendRequests(); fetchFriendshipCounts() }, 30000)
      return () => clearInterval(interval)
    }
  }, [token, user])

  const handleLogout = () => { logout(); router.push('/') }
  const handleWishlistCreated = (w: Wishlist) => setWishlists([w, ...wishlists])
  const handleDeleteWishlist = async (id: number) => {
    if (!confirm('Удалить этот вишлист?')) return
    try { await apiClient.delete(`/wishlists/${id}`); setWishlists(wishlists.filter(w => w.id !== id)) }
    catch { alert('Ошибка при удалении') }
  }
  const handleEditWishlist = (w: Wishlist) => setEditingWishlist(w)

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-neutral-300 dark:border-neutral-600 border-t-neutral-800 dark:border-t-neutral-300 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="bg-header border border-gray-200/40 dark:border-neutral-700 rounded-2xl shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white hover:opacity-80 transition">
              Wishlist
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link href="/gifts" className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition" title="Подарки друзьям">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </Link>
              <Link href="/settings" className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition" title="Настройки">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button onClick={() => setShowAddFriendsModal(true)} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition" title="Найти друга">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
              <div className="relative">
                <button onClick={() => setShowFriendRequestsModal(!showFriendRequestsModal)}
                  className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition relative" title="Уведомления">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {friendRequestsCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                    </span>
                  )}
                </button>
                <NotificationsDropdown isOpen={showFriendRequestsModal} onClose={() => setShowFriendRequestsModal(false)}
                  onUpdate={() => { fetchFriendRequests(); fetchFriendshipCounts() }} />
              </div>
              <button onClick={() => setShowQRCodeModal(true)} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition" title="QR-код">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              <ThemeToggle />
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />
              <button onClick={handleLogout} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 text-sm transition">
                Выйти
              </button>
            </nav>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center gap-0.5">
              <div className="relative">
                <button onClick={() => setShowFriendRequestsModal(!showFriendRequestsModal)}
                  className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {friendRequestsCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                    </span>
                  )}
                </button>
                <NotificationsDropdown isOpen={showFriendRequestsModal} onClose={() => setShowFriendRequestsModal(false)}
                  onUpdate={() => { fetchFriendRequests(); fetchFriendshipCounts() }} />
              </div>
              <button onClick={() => setShowQRCodeModal(true)} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              <button onClick={() => setShowBurger(true)} className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {showBurger && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowBurger(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="font-semibold text-neutral-900 dark:text-white">Меню</span>
              <button onClick={() => setShowBurger(false)} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 py-1">
              {[
                { href: '/settings', label: 'Настройки', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                { href: '/gifts', label: 'Подарки друзьям', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
              ].map(item => (
                <Link key={item.href} href={item.href} onClick={() => setShowBurger(false)}
                  className="flex items-center gap-3 px-5 py-3.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition">
                  <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span className="text-[15px]">{item.label}</span>
                </Link>
              ))}
              <button onClick={() => { setShowBurger(false); setShowAddFriendsModal(true) }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition">
                <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="text-[15px]">Найти друга</span>
              </button>
              <MobileThemeButton />
            </nav>
            <div className="border-t border-neutral-100 dark:border-neutral-700 px-5 py-4">
              <button onClick={() => { setShowBurger(false); handleLogout() }}
                className="w-full py-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition">
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4">
        {/* Profile card */}
        <section className="flex flex-col items-center pt-10 pb-8 sm:pt-12 sm:pb-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700 flex items-center justify-center overflow-hidden shadow-sm">
            {user.avatar_url ? (
              <img src={getAvatarUrl(user.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-9 h-9 sm:w-11 sm:h-11 text-neutral-300 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
            {user.full_name || user.username}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-400 dark:text-neutral-500">@{user.username}</p>

          <div className="flex items-center gap-5 mt-4">
            <button onClick={() => setShowFriendsListModal(true)} className="text-center group">
              <span className="block text-base font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 transition">{friendsCount}</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">друзей</span>
            </button>
            <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <button onClick={() => setShowFollowersListModal(true)} className="text-center group">
              <span className="block text-base font-semibold text-neutral-900 dark:text-white group-hover:text-primary-600 transition">{followersCount}</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">подписчиков</span>
            </button>
          </div>
        </section>

        {/* Wishlists */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Вишлисты</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Создать
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-neutral-200 dark:border-neutral-600 border-t-neutral-600 dark:border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : wishlists.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <svg className="w-12 h-12 text-neutral-300 dark:text-neutral-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-5">Создайте первый вишлист</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Создать вишлист
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlists.map(wishlist => {
                const daysLeft = wishlist.event_date
                  ? Math.ceil((new Date(wishlist.event_date).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <div key={wishlist.id} className="group relative bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm rounded-2xl border border-neutral-200/40 dark:border-neutral-700 hover:border-neutral-200/70 dark:hover:border-neutral-600 hover:shadow-md transition-all overflow-visible">
                    <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <WishlistActionMenu
                        wishlistId={wishlist.id}
                        shareToken={wishlist.share_token}
                        onEdit={() => handleEditWishlist(wishlist)}
                        onDelete={() => handleDeleteWishlist(wishlist.id)}
                      />
                    </div>
                    <a href={`/wishlists/${wishlist.id}`} className="flex flex-col">
                      <div className="aspect-square w-full flex items-center justify-center rounded-t-2xl bg-neutral-50/80 dark:bg-neutral-800 overflow-hidden">
                        {wishlist.cover_emoji ? (
                          <span className="text-4xl sm:text-5xl">{wishlist.cover_emoji}</span>
                        ) : wishlist.cover_image_url ? (
                          <img src={getAvatarUrl(wishlist.cover_image_url) || ''} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-8 h-8 text-neutral-200 dark:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate leading-snug">
                          {wishlist.title}
                        </h4>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                          {wishlist.items_count ?? 0} {(() => {
                            const n = wishlist.items_count ?? 0
                            if (n % 10 === 1 && n % 100 !== 11) return 'подарок'
                            if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'подарка'
                            return 'подарков'
                          })()}
                        </p>
                        {wishlist.wishlist_type === 'event' && wishlist.event_date && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {new Date(wishlist.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && (
                              <span className="text-primary-500 ml-1.5">
                                {daysLeft === 0 ? 'сегодня' : daysLeft === 1 ? 'завтра' : `через ${daysLeft} дн.`}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            &copy; {new Date().getFullYear()} Wishlist
          </p>
        </div>
      </footer>

      {/* ── Modals ── */}
      <CreateWishlistModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={handleWishlistCreated} />
      <AddFriendsModal isOpen={showAddFriendsModal} onClose={() => setShowAddFriendsModal(false)} username={user.username} />
      <QRCodeModal isOpen={showQRCodeModal} onClose={() => setShowQRCodeModal(false)} username={user.username} />
      {editingWishlist && (
        <WishlistSettingsModal wishlist={editingWishlist} isOpen={!!editingWishlist}
          onClose={() => setEditingWishlist(null)} onUpdate={() => { fetchWishlists(); setEditingWishlist(null) }} />
      )}
      <FriendsListModal isOpen={showFriendsListModal} onClose={() => setShowFriendsListModal(false)} />
      <FollowersListModal isOpen={showFollowersListModal} onClose={() => setShowFollowersListModal(false)} />
    </div>
  )
}
