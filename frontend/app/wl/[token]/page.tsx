'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import type { Wishlist, Item } from '@/types'
import { getAvatarUrl } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

/* ── Inline image carousel ───────────────────────────────────── */
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(0)

  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length) }
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length) }

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) { diff > 0 ? setIdx((i) => (i + 1) % images.length) : setIdx((i) => (i - 1 + images.length) % images.length) }
  }

  return (
    <div className="relative w-full h-full" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={getAvatarUrl(images[idx]) || ''} alt={alt} className="w-full h-full object-cover" />
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm z-10">‹</button>
          <button onClick={next} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm z-10">›</button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function PublicWishlistPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const token = params.token as string
  const { isAuthenticated } = useAuthStore()

  const invalidToken = !token || token === 'undefined' || (typeof token === 'string' && token.trim() === '')
  const wrongRoute = typeof pathname === 'string' && !pathname.startsWith('/wl/')

  useEffect(() => {
    if (invalidToken || wrongRoute) router.replace('/')
  }, [invalidToken, wrongRoute, router])

  const [wishlist, setWishlist] = useState<Wishlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & sort
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default')

  // Reservation modal
  const [reserveItem, setReserveItem] = useState<Item | null>(null)
  const [guestName, setGuestName] = useState('')
  const [reserveMode, setReserveMode] = useState<'full' | 'partial'>('full')
  const [partialAmount, setPartialAmount] = useState('')
  const [isReserving, setIsReserving] = useState(false)

  // Unreserve
  const [unreservingId, setUnreservingId] = useState<number | null>(null)

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null)

  const fetchWishlist = useCallback(async () => {
    if (invalidToken || wrongRoute) return
    try {
      const res = await apiClient.get(`/wishlists/share/${token}`)
      setWishlist(res.data)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404 || status === '404') {
        router.replace('/')
        setLoading(false)
        return
      }
      setError(err?.response?.data?.detail || 'Вишлист не найден')
    } finally {
      setLoading(false)
    }
  }, [token, router, invalidToken, wrongRoute])

  // Connect anonymous WebSocket
  useEffect(() => {
    if (typeof window === 'undefined' || invalidToken || wrongRoute) return
    let active = true
    let retries = 0
    const maxRetries = 10

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || (
      window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    ) + '//' + window.location.host
    const channel = `share_${token}`

    function connect() {
      if (!active) return
      try {
        const ws = new WebSocket(`${wsUrl}/api/v1/ws/${channel}`)
        wsRef.current = ws
        ws.onopen = () => { retries = 0 }
        ws.onmessage = () => { fetchWishlist() }
        ws.onerror = () => {}
        ws.onclose = () => {
          wsRef.current = null
          if (!active || retries >= maxRetries) return
          const delay = Math.min(3000 * Math.pow(2, retries), 30000)
          retries++
          setTimeout(connect, delay)
        }
      } catch {}
    }

    connect()
    return () => {
      active = false
      if (wsRef.current) { try { wsRef.current.close() } catch {} }
      wsRef.current = null
    }
  }, [token, fetchWishlist, invalidToken, wrongRoute])

  useEffect(() => { if (!invalidToken && !wrongRoute) fetchWishlist() }, [fetchWishlist, invalidToken, wrongRoute])

  const handleReserve = async () => {
    if (!reserveItem) return
    // Guests must enter name; auth users don't need to
    if (!isAuthenticated && !guestName.trim()) { alert('Введите ваше имя'); return }

    setIsReserving(true)
    try {
      const body: any = {}
      if (!isAuthenticated) body.name = guestName.trim()
      if (reserveMode === 'partial') {
        const amt = parseFloat(partialAmount)
        if (isNaN(amt) || amt <= 0) { alert('Введите корректную сумму'); setIsReserving(false); return }
        body.amount = amt
      } else {
        body.amount = reserveItem.price || null
      }
      await apiClient.post(`/items/${reserveItem.id}/reserve`, body)
      setReserveItem(null)
      setPartialAmount('')
      setReserveMode('full')
      fetchWishlist()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Ошибка при бронировании')
    } finally { setIsReserving(false) }
  }

  const handleUnreserve = async (itemId: number) => {
    if (!confirm('Отменить ваше бронирование этого подарка?')) return
    setUnreservingId(itemId)
    try {
      // For auth users — backend identifies by token. For guests — pass name.
      const params = !isAuthenticated && guestName.trim() ? `?name=${encodeURIComponent(guestName.trim())}` : ''
      await apiClient.delete(`/items/${itemId}/reserve${params}`)
      fetchWishlist()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Ошибка при отмене бронирования')
    } finally { setUnreservingId(null) }
  }

  useEffect(() => {
    if (reserveItem && reserveItem.collected_amount > 0) {
      setReserveMode('partial')
    } else {
      setReserveMode('full')
    }
  }, [reserveItem])

  if (invalidToken || wrongRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !wishlist) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 px-3 pt-3">
          <div className="bg-header border border-gray-200/40 rounded-2xl shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <Link href={isAuthenticated ? '/profile' : '/'} className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Назад</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <svg className="w-14 h-14 text-neutral-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-neutral-700 mb-1">Вишлист не найден</p>
          <p className="text-sm text-neutral-500">{error}</p>
        </main>
      </div>
    )
  }

  // Filter & sort items
  let items = wishlist.items || []
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase()
    items = items.filter(i => i.title.toLowerCase().includes(q))
  }
  if (sortBy === 'price_asc') {
    items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0))
  } else if (sortBy === 'price_desc') {
    items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0))
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="bg-header border border-gray-200/40 rounded-2xl shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            {isAuthenticated ? (
              <Link href="/profile" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Назад</span>
              </Link>
            ) : (
              <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">На главную</span>
              </Link>
            )}
            <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900 hover:opacity-80 transition">Wishlist</Link>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {/* Wishlist header — cover only as avatar */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-50/80 border border-neutral-200/40 flex items-center justify-center overflow-hidden flex-shrink-0">
            {wishlist.cover_emoji ? (
              <span className="text-3xl sm:text-4xl">{wishlist.cover_emoji}</span>
            ) : wishlist.cover_image_url ? (
              <img src={getAvatarUrl(wishlist.cover_image_url) || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">{wishlist.title}</h1>
            {wishlist.description && <p className="mt-1 text-sm text-neutral-500">{wishlist.description}</p>}
          </div>
        </div>

        {/* Search & Sort */}
        {(wishlist.items || []).length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl bg-white/80 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-4 py-2.5 border border-neutral-200 rounded-xl bg-white/80 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              <option value="default">По умолчанию</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
            </select>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <svg className="w-12 h-12 text-neutral-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-neutral-500 text-sm">{searchQuery ? 'Ничего не найдено' : 'Список пока пуст'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => {
              const isFullyReserved = item.is_reserved
              const hasPartial = item.collected_amount > 0 && !isFullyReserved
              const progress = item.price ? (item.collected_amount / item.price) * 100 : 0

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl overflow-hidden transition-all border ${
                    isFullyReserved
                      ? 'bg-neutral-50 border-neutral-200/60 opacity-75'
                      : hasPartial
                      ? 'bg-amber-50/50 border-amber-200/60 hover:shadow-md cursor-pointer'
                      : 'bg-white/70 backdrop-blur-sm border-neutral-200/40 hover:border-neutral-200/70 hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => !isFullyReserved && setReserveItem(item)}
                >
                  <div className="relative aspect-square bg-neutral-100">
                    {(item.images && item.images.length > 1) ? (
                      <ImageCarousel images={item.images} alt={item.title} />
                    ) : (item.images && item.images.length > 0) || item.image_url ? (
                      <img src={getAvatarUrl((item.images && item.images[0]) || item.image_url || '') || ''} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-200">
                        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {item.priority === 'high' && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 bg-neutral-800 text-white px-2 py-1 rounded-lg text-[10px] font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        Важно
                      </span>
                    )}
                    {isFullyReserved && (
                      <div className="absolute inset-0 bg-neutral-900/30 flex items-center justify-center">
                        <span className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-700">Зарезервировано</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-neutral-900 text-sm line-clamp-2 min-h-[2.5rem]">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-primary-600 transition inline-flex items-center gap-1">
                          {item.title}
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : item.title}
                    </h3>
                    {item.price != null && (
                      <p className="text-sm font-semibold text-neutral-800 mt-1">
                        {Number(item.price).toLocaleString('ru-RU')} {item.currency || '₽'}
                      </p>
                    )}
                    {hasPartial && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        {item.contributors && item.contributors.length > 0 ? (
                          <div className="text-xs text-yellow-700 mt-1">
                            {item.contributors.map((c, i) => (
                              <span key={i}>{c.name}{c.amount ? ` — ${Number(c.amount).toLocaleString('ru-RU')} ${item.currency || '₽'}` : ''}{i < item.contributors!.length - 1 ? ', ' : ''}</span>
                            ))}
                          </div>
                        ) : item.reserved_by_name ? (
                          <p className="text-xs text-yellow-700 mt-1">забронировал {item.reserved_by_name}</p>
                        ) : null}
                      </div>
                    )}
                    {isFullyReserved && (
                      item.contributors && item.contributors.length > 0 ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.contributors.map((c, i) => (
                            <span key={i}>{c.name}{c.amount ? ` — ${Number(c.amount).toLocaleString('ru-RU')} ${item.currency || '₽'}` : ''}{i < item.contributors!.length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>
                      ) : item.reserved_by_name ? (
                        <p className="text-xs text-gray-500 mt-1">забронировал {item.reserved_by_name}</p>
                      ) : null
                    )}

                    {/* Action buttons */}
                    {!isFullyReserved && !hasPartial && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReserveItem(item) }}
                        className="w-full mt-2 py-2 rounded-xl font-medium text-sm transition bg-neutral-900 text-white hover:bg-neutral-800"
                      >
                        Забронировать
                      </button>
                    )}
                    {hasPartial && (
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setReserveItem(item) }}
                          className="flex-1 py-2 rounded-xl font-medium text-sm transition bg-neutral-900 text-white hover:bg-neutral-800"
                        >
                          Добавить вклад
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnreserve(item.id) }}
                          disabled={unreservingId === item.id}
                          className="p-2 rounded-xl text-sm transition border border-neutral-200 text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                          title="Отменить бронь"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {isFullyReserved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnreserve(item.id) }}
                        disabled={unreservingId === item.id}
                        className="w-full mt-2 py-2 rounded-xl font-medium text-sm transition border border-neutral-200 text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                      >
                        {unreservingId === item.id ? '...' : 'Отменить бронь'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-neutral-400">&copy; {new Date().getFullYear()} Wishlist</p>
        </div>
      </footer>

      {/* Reservation Modal */}
      {reserveItem && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setReserveItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">{reserveItem.title}</h3>
            {reserveItem.price && (
              <p className="text-neutral-700 font-semibold mb-4">
                {Number(reserveItem.price).toLocaleString('ru-RU')} {reserveItem.currency || '₽'}
                {reserveItem.collected_amount > 0 && (
                  <span className="text-sm font-normal text-neutral-500 ml-2">
                    (собрано {Number(reserveItem.collected_amount).toLocaleString('ru-RU')})
                  </span>
                )}
              </p>
            )}

            {reserveItem.contributors && reserveItem.contributors.length > 0 && (
              <div className="mb-3 p-3 bg-neutral-50 rounded-xl">
                <p className="text-xs font-medium text-neutral-600 mb-1">Уже скинулись</p>
                {reserveItem.contributors.map((c, i) => (
                  <p key={i} className="text-xs text-neutral-600">
                    {c.name} — {Number(c.amount).toLocaleString('ru-RU')} {reserveItem.currency || '₽'}
                  </p>
                ))}
              </div>
            )}

            {!isAuthenticated && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Ваше имя</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Как вас зовут?"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900" />
              </div>
            )}

            {reserveItem.collected_amount > 0 ? (
              <div className="mb-4 p-3 bg-neutral-50 rounded-xl">
                <span className="text-sm text-neutral-600">Режим: Скинуться</span>
              </div>
            ) : (
              <div className="flex gap-2 mb-4">
                <button onClick={() => setReserveMode('full')}
                  className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${reserveMode === 'full' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                  Полностью
                </button>
                <button onClick={() => setReserveMode('partial')}
                  className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${reserveMode === 'partial' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
                  Скинуться
                </button>
              </div>
            )}

            {reserveMode === 'partial' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Сумма (макс. {Number((reserveItem.price || 0) - reserveItem.collected_amount).toLocaleString()} {reserveItem.currency || '₽'})
                </label>
                <input type="number" value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setReserveItem(null)} className="flex-1 py-2.5 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition">
                Отмена
              </button>
              <button onClick={handleReserve} disabled={isReserving || (!isAuthenticated && !guestName.trim())}
                className="flex-1 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition">
                {isReserving ? '...' : 'Забронировать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
