'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { Wishlist, Item } from '@/types'
import ItemCard from '@/components/wishlists/ItemCard'
import AddItemModal from '@/components/wishlists/AddItemModal'
import WishlistSettingsModal from '@/components/wishlists/WishlistSettingsModal'

export default function WishlistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const wishlistId = params.id as string
  const { user, isAuthenticated, isInitialized } = useAuthStore()

  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Multi-select
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await apiClient.get(`/wishlists/${wishlistId}`)
      setWishlist(res.data)
    } catch (err) {
      console.error(err)
      router.push('/profile')
    } finally {
      setLoading(false)
    }
  }, [wishlistId, router])

  // Listen for real-time updates
  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === 'wishlist_item' && String(msg.wishlist_id) === wishlistId) {
      fetchWishlist()
    }
  }, [wishlistId, fetchWishlist])
  useWebSocket(handleWsMessage)

  useEffect(() => {
    if (!isInitialized) return // wait for auth hydration
    if (isAuthenticated) fetchWishlist()
    else router.push('/auth/login')
  }, [isInitialized, isAuthenticated, fetchWishlist, router])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Удалить ${selectedIds.size} подарков?`)) return
    setIsDeleting(true)
    try {
      await apiClient.post('/items/delete-batch', Array.from(selectedIds))
      setSelectedIds(new Set())
      setSelectMode(false)
      fetchWishlist()
    } catch (err) {
      console.error(err)
      alert('Ошибка при удалении')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!wishlist) return null

  const items: Item[] = wishlist.items || []

  const isEmpty = items.length === 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage:
          'radial-gradient(circle at top left, rgba(229,231,235,0.8), transparent 55%), radial-gradient(circle at bottom right, rgba(209,213,219,0.8), transparent 55%), linear-gradient(to bottom, #f9fafb, #e5e7eb)',
      }}
    >
      <div className="flex-1 max-w-4xl flex flex-col w-full mx-auto px-4 py-8">
        <div className="flex-1 rounded-2xl px-1 sm:px-2 py-3 sm:py-4">
          {/* Title block */}
          <div className="mb-4 text-center px-4">
            <h1 className="text-2xl font-semibold text-gray-900">{wishlist.title}</h1>
            {wishlist.description && (
              <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">{wishlist.description}</p>
            )}
          </div>

          {/* Top controls */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/profile')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-white/60 hover:text-gray-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Назад</span>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isEmpty && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-neutral-300 text-neutral-700 bg-white/80 hover:bg-neutral-50 hover:border-neutral-400 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Добавить подарок</span>
                </button>
              )}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/wl/${wishlist.share_token}`
                  navigator.clipboard.writeText(url)
                  alert('Ссылка скопирована!')
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                title="Поделиться"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
              {!isEmpty && (
                <button
                  onClick={() => {
                    setSelectMode(!selectMode)
                    setSelectedIds(new Set())
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectMode ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectMode ? 'Отмена' : 'Выбрать'}
                </button>
              )}
            </div>
          </div>

          {/* Multi-select toolbar */}
          {selectMode && selectedIds.size > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-red-700">Выбрано: {selectedIds.size}</span>
              <button
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-300"
              >
                {isDeleting ? 'Удаление...' : 'Удалить выбранные'}
              </button>
            </div>
          )}

          {/* Items grid */}
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-5">
                <svg
                  className="w-12 h-12 text-neutral-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="8"
                    width="18"
                    height="13"
                    rx="2"
                    className="stroke-current"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12 4V21"
                    className="stroke-current"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3 11H21"
                    className="stroke-current"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.5 4.5C9.5 3.39543 8.60457 2.5 7.5 2.5C6.39543 2.5 5.5 3.39543 5.5 4.5C5.5 5.05228 5.94772 5.5 6.5 5.5H9.5V4.5Z"
                    className="stroke-current"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M14.5 4.5C14.5 3.39543 15.3954 2.5 16.5 2.5C17.6046 2.5 18.5 3.39543 18.5 4.5C18.5 5.05228 18.0523 5.5 17.5 5.5H14.5V4.5Z"
                    className="stroke-current"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <p className="text-neutral-500 text-sm mb-6">Список пуст</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-neutral-300 text-neutral-700 bg-white/80 hover:bg-neutral-50 hover:border-neutral-400 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Добавить подарок</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  isOwner={true}
                  onUpdate={fetchWishlist}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="mt-auto pt-10 text-center text-[11px] text-neutral-500/80">
          Сделано с заботой о подарках · x1k.ru
        </footer>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddItemModal
          wishlistId={parseInt(wishlistId)}
          onClose={() => setShowAddModal(false)}
          onCreated={fetchWishlist}
        />
      )}
      {showSettings && wishlist && (
        <WishlistSettingsModal
          wishlist={wishlist}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdate={fetchWishlist}
        />
      )}
    </div>
  )
}
