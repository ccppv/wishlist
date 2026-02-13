'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface Contributor {
  name: string
  amount: number
}

interface WishlistInfo {
  id: number
  title: string
  event_date: string | null
  wishlist_type: string
  owner_username: string
  owner_fullname?: string | null
}

interface ReservedItem {
  id: number
  title: string
  description?: string
  url?: string
  image_url?: string
  images?: string[]
  price?: number
  currency?: string
  wishlist_id: number
  is_reserved: boolean
  is_purchased: boolean
  created_at: string
  reserved_at?: string
  collected_amount?: number
  contributors?: Contributor[]
  wishlist?: WishlistInfo
  my_contribution?: number
  days_until_event?: number | null
  is_pinned?: boolean
}

export default function GiftsPage() {
  const router = useRouter()
  const { token, isInitialized } = useAuthStore()
  const [items, setItems] = useState<ReservedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [swipedItemId, setSwipedItemId] = useState<number | null>(null)

  useEffect(() => {
    if (!isInitialized) return
    if (!token) { router.push('/auth/login'); return }
    fetchReservations()
  }, [token, isInitialized])

  const fetchReservations = async () => {
    try {
      const response = await apiClient.get('/items/my-reservations')
      setItems(response.data)
    } catch (error: any) {
      console.error('[GIFTS] Error:', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelReservation = async (itemId: number) => {
    if (!confirm('Отменить бронь на этот подарок?')) return
    try {
      await apiClient.delete(`/items/${itemId}/reserve`)
      setItems(prev => prev.filter(i => i.id !== itemId))
      setSwipedItemId(null)
    } catch {
      alert('Ошибка при отмене брони')
    }
  }

  const handleTogglePin = (itemId: number) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_pinned: !i.is_pinned } : i))
    setSwipedItemId(null)
  }

  const getImg = (item: ReservedItem) => {
    if (item.images?.length) return getAvatarUrl(item.images[0])
    if (item.image_url) return getAvatarUrl(item.image_url)
    return null
  }

  if (!isInitialized) return null

  const pinned = items.filter(i => i.is_pinned)
  const rest = items.filter(i => !i.is_pinned)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="bg-header border border-gray-200/40 rounded-2xl shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.push('/profile')} className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Подарки друзьям</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <svg className="w-12 h-12 text-neutral-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <p className="text-neutral-500 text-sm mb-1">Пока пусто</p>
            <p className="text-neutral-400 text-xs">Забронируйте подарки в вишлистах друзей</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pinned.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-widest text-neutral-400 font-medium px-1 mb-1">Закреплённые</p>
                {pinned.map(item => (
                  <GiftCard
                    key={item.id}
                    item={item}
                    img={getImg(item)}
                    onCancel={handleCancelReservation}
                    onTogglePin={handleTogglePin}
                    isSwipedOpen={swipedItemId === item.id}
                    onSwipeChange={open => setSwipedItemId(open ? item.id : null)}
                  />
                ))}
                {rest.length > 0 && (
                  <div className="pt-2" />
                )}
              </>
            )}
            {rest.map(item => (
              <GiftCard
                key={item.id}
                item={item}
                img={getImg(item)}
                onCancel={handleCancelReservation}
                onTogglePin={handleTogglePin}
                isSwipedOpen={swipedItemId === item.id}
                onSwipeChange={open => setSwipedItemId(open ? item.id : null)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 text-center">
        <p className="text-[11px] text-neutral-400">&copy; {new Date().getFullYear()} Wishlist</p>
      </footer>
    </div>
  )
}


/* ── Gift Card ── */

interface GiftCardProps {
  item: ReservedItem
  img: string | null
  onCancel: (id: number) => void
  onTogglePin: (id: number) => void
  isSwipedOpen: boolean
  onSwipeChange: (open: boolean) => void
}

function GiftCard({ item, img, onCancel, onTogglePin, isSwipedOpen, onSwipeChange }: GiftCardProps) {
  const [touchStartX, setTouchStartX] = useState(0)
  const [deltaX, setDeltaX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const ACTIONS_WIDTH = 144

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setSwiping(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return
    const dx = e.touches[0].clientX - touchStartX
    // Allow left swipe (negative), limit right swipe when open
    if (isSwipedOpen) {
      setDeltaX(Math.max(-ACTIONS_WIDTH, Math.min(ACTIONS_WIDTH, dx)))
    } else {
      setDeltaX(Math.min(0, Math.max(-ACTIONS_WIDTH - 20, dx)))
    }
  }

  const onTouchEnd = () => {
    const threshold = 50
    if (isSwipedOpen) {
      onSwipeChange(deltaX < threshold)
    } else {
      onSwipeChange(deltaX < -threshold)
    }
    setSwiping(false)
    setDeltaX(0)
  }

  // Calculate visual offset
  let offset = 0
  if (swiping) {
    offset = isSwipedOpen ? -ACTIONS_WIDTH + deltaX : deltaX
    offset = Math.max(-ACTIONS_WIDTH, Math.min(0, offset))
  } else {
    offset = isSwipedOpen ? -ACTIONS_WIDTH : 0
  }

  const currency = item.currency || '₽'

  return (
    <div className="relative rounded-2xl sm:overflow-visible overflow-hidden">
      {/* Swipe actions (mobile) */}
      <div className="absolute right-0 top-0 bottom-0 flex sm:hidden" style={{ width: ACTIONS_WIDTH }}>
        <button
          onClick={() => onTogglePin(item.id)}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-primary-500 active:bg-primary-600 text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            {item.is_pinned ? (
              // Unpin
              <>
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M12 17v5" />
                <path d="M9 9v1.76a2 2 0 01-1.11 1.79l-1.78.89A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79L16 12.56" />
                <path d="M15 4.672a2 2 0 00-1.11-.79L12 3.5l-1.89.382A2 2 0 009 5.672V9" />
              </>
            ) : (
              <>
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.89A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.89A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5.76z" />
              </>
            )}
          </svg>
          <span className="text-[10px] font-medium">{item.is_pinned ? 'Открепить' : 'Закрепить'}</span>
        </button>
        <button
          onClick={() => onCancel(item.id)}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 active:bg-red-600 text-white transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          <span className="text-[10px] font-medium">Отменить</span>
        </button>
      </div>

      {/* Card */}
      <div
        className="relative bg-white/70 backdrop-blur-sm border border-neutral-200/40 rounded-2xl p-4 touch-pan-y z-[1]"
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(.2,.9,.3,1)',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex gap-3.5">
          {/* Image */}
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl bg-neutral-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {img ? (
              <img src={img} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-7 h-7 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-1 hover:text-primary-600 transition">
                    {item.title}
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-neutral-900 leading-snug line-clamp-1">{item.title}</p>
                )}
                {item.wishlist && (
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                    {item.wishlist.owner_fullname || item.wishlist.owner_username}
                    <span className="mx-1">·</span>
                    {item.wishlist.title}
                  </p>
                )}
              </div>

              {/* Desktop three-dot menu */}
              <div ref={menuRef} className="relative hidden sm:block flex-shrink-0">
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl bg-white/90 backdrop-blur-lg shadow-xl border border-white/50 z-20 w-48 py-1">
                    <button
                      onClick={() => { onTogglePin(item.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-neutral-700 hover:bg-black/5"
                    >
                      <svg className="w-[18px] h-[18px] text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5" />
                        <path d="M9 10.76a2 2 0 01-1.11 1.79l-1.78.89A2 2 0 005 15.24V17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.89A2 2 0 0115 10.76V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5.76z" />
                      </svg>
                      {item.is_pinned ? 'Открепить' : 'Закрепить'}
                    </button>
                    <div className="h-px bg-neutral-200/60 mx-2 my-0.5" />
                    <button
                      onClick={() => { setMenuOpen(false); onCancel(item.id) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-500/10"
                    >
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      Отменить бронь
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {item.my_contribution != null && item.my_contribution > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  {item.my_contribution} {currency}
                </span>
              )}
              {item.price != null && item.price > 0 && item.collected_amount != null && (
                <span className="text-xs text-neutral-400">
                  {item.collected_amount} / {item.price} {currency}
                </span>
              )}
              {item.days_until_event != null && item.days_until_event >= 0 && item.days_until_event <= 60 && (
                <span className={`text-xs font-medium ${item.days_until_event <= 3 ? 'text-red-500' : 'text-primary-500'}`}>
                  {item.days_until_event === 0 ? 'Сегодня' : item.days_until_event === 1 ? 'Завтра' : `через ${item.days_until_event} дн.`}
                </span>
              )}
              {item.is_purchased && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Куплен
                </span>
              )}
            </div>

            {/* Progress bar */}
            {item.price != null && item.price > 0 && item.collected_amount != null && (
              <div className="mt-2.5 h-1 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (Number(item.collected_amount) / item.price) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
