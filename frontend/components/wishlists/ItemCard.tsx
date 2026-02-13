'use client'

import { useState, useRef, useEffect } from 'react'
import type { Item, Wishlist } from '@/types'
import { getAvatarUrl } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import ItemDetailModal from './ItemDetailModal'

/* ── Inline image carousel ───────────────────────────────────── */
function CardCarousel({ images, alt }: { images: string[]; alt: string }) {
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

/* ── Contributors display helper ─────────────────────────────── */
function ContributorsDisplay({ item, variant }: { item: Item; variant: 'partial' | 'full' }) {
  const colorClass = variant === 'partial' ? 'text-yellow-700' : 'text-gray-500'
  if (item.contributors && item.contributors.length > 0) {
    return (
      <div className={`text-xs ${colorClass} mt-1`}>
        {item.contributors.map((c, i) => (
          <span key={i}>{c.name}{c.amount ? ` — ${Number(c.amount).toLocaleString('ru-RU')} ${item.currency || '₽'}` : ''}{i < item.contributors!.length - 1 ? ', ' : ''}</span>
        ))}
      </div>
    )
  }
  if (item.reserved_by_name) {
    return <p className={`text-xs ${colorClass} mt-1`}>забронировал {item.reserved_by_name}</p>
  }
  return null
}

interface ItemCardProps {
  item: Item
  isOwner: boolean
  onUpdate: () => void
  selectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

export default function ItemCard({ item, isOwner, onUpdate, selectMode, isSelected, onToggleSelect }: ItemCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddToMenu, setShowAddToMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editPrice, setEditPrice] = useState(item.price?.toString() || '')
  const [editDescription, setEditDescription] = useState(item.description || '')
  const [editUrl, setEditUrl] = useState(item.url || '')
  const [isSaving, setIsSaving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null)
  const [isWishlistsLoading, setIsWishlistsLoading] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState<Set<number>>(new Set())

  const isFullyReserved = item.is_reserved
  const hasPartialReservation = item.collected_amount > 0 && !isFullyReserved
  const reservationProgress = item.price ? (item.collected_amount / item.price) * 100 : 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setShowAddToMenu(false)
        setSelectedTargets(new Set())
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadWishlists = async () => {
    if (wishlists !== null || isWishlistsLoading) return
    setIsWishlistsLoading(true)
    try {
      const res = await apiClient.get<Wishlist[]>('/wishlists')
      setWishlists(res.data)
    } catch (err) {
      console.error('Failed to load wishlists', err)
      alert('Не удалось загрузить списки')
    } finally {
      setIsWishlistsLoading(false)
    }
  }

  const handleClick = () => {
    if (selectMode && onToggleSelect) { onToggleSelect(); return }
    if (!isOwner && !isFullyReserved) setShowDetail(true)
  }

  const handleDelete = async () => {
    if (!confirm('Удалить этот подарок?')) return
    try { await apiClient.delete(`/items/${item.id}`); onUpdate() }
    catch { alert('Ошибка') }
    setShowMenu(false)
  }

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return
    setIsSaving(true)
    try {
      const d: any = { title: editTitle.trim() }
      if (editPrice) d.price = parseFloat(editPrice)
      if (editDescription) d.description = editDescription
      if (editUrl) d.url = editUrl
      await apiClient.patch(`/items/${item.id}`, d)
      onUpdate(); setIsEditing(false)
    } catch { alert('Ошибка') }
    finally { setIsSaving(false) }
  }
  const handleToggleTarget = (wishlistId: number) => {
    setSelectedTargets(prev => {
      const next = new Set(prev)
      if (next.has(wishlistId)) next.delete(wishlistId)
      else next.add(wishlistId)
      return next
    })
  }

  const handleApplyCopy = async () => {
    if (selectedTargets.size === 0) {
      setShowAddToMenu(false)
      setShowMenu(false)
      return
    }
    try {
      const ids = Array.from(selectedTargets)
      await Promise.all(
        ids.map(id =>
          apiClient.post(`/items/${item.id}/copy-to-wishlist`, { target_wishlist_id: id })
        )
      )
      alert('Подарок добавлен в выбранные списки')
    } catch (err: any) {
      console.error('Failed to copy item', err)
      alert(err?.response?.data?.detail || 'Не удалось добавить в списки')
    } finally {
      setShowAddToMenu(false)
      setShowMenu(false)
      setSelectedTargets(new Set())
    }
  }

  const imgSrc =
    item.images && item.images.length > 0
      ? getAvatarUrl(item.images[0])
      : item.image_url
      ? getAvatarUrl(item.image_url)
      : null
  const hasMultipleImages = item.images && item.images.length > 1

  // ── Owner View ──
  if (isOwner) {
    return (
      <div className="relative">
        <div
          onClick={handleClick}
          className={`rounded-xl border-2 overflow-hidden transition-all bg-white hover:shadow-lg ${
            selectMode ? 'cursor-pointer' : ''
          } ${isSelected ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-200'}`}
        >
          {selectMode && (
            <div className="absolute top-3 left-3 z-10">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                  isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300'
                }`}
              >
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          )}
          <div className="relative aspect-square bg-gray-100">
            {hasMultipleImages ? (
              <CardCarousel images={item.images!} alt={item.title} />
            ) : imgSrc ? (
              <img src={imgSrc || ''} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {item.priority === 'high' && (
              <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                🔥
              </span>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[2.5rem]">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="hover:text-primary-600 transition inline-flex items-center gap-1"
                    >
                      {item.title}
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                {item.price && (
                  <p className="text-base font-bold text-primary-600 mt-1">
                    {Number(item.price).toLocaleString('ru-RU', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })}{' '}
                    {item.currency || '₽'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {!selectMode && (
          <div ref={menuRef} className="absolute top-2 right-2">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowMenu(prev => !prev)
                setShowAddToMenu(false)
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition bg-white/80 shadow-sm"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 rounded-2xl bg-white/90 backdrop-blur-lg text-neutral-800 shadow-xl border border-white/50 z-30 w-60 py-1.5">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setIsEditing(true)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-black/5 text-left"
                >
                  <svg className="w-[18px] h-[18px] text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                  <span>Редактировать</span>
                </button>
                <button
                  onClick={async e => {
                    e.stopPropagation()
                    await loadWishlists()
                    setShowAddToMenu(prev => !prev)
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-black/5"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="w-[18px] h-[18px] text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                      <line x1="12" y1="11" x2="12" y2="17" />
                      <line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                    <span>Добавить в</span>
                  </span>
                  <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                {showAddToMenu && (
                  <div className="absolute top-1 left-full ml-2 w-64 rounded-2xl bg-white/90 backdrop-blur-lg text-neutral-800 shadow-xl border border-white/50 py-1.5">
                    <div className="px-4 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                      Добавить в списки желаний
                    </div>
                    {isWishlistsLoading && (
                      <div className="px-4 py-2 text-sm text-neutral-600">Загрузка...</div>
                    )}
                    {!isWishlistsLoading &&
                      wishlists &&
                      wishlists.filter(w => !w.is_archived && w.id !== item.wishlist_id).length === 0 && (
                        <div className="px-4 py-2 text-sm text-neutral-500">Нет других списков</div>
                      )}
                    {!isWishlistsLoading &&
                      wishlists &&
                      wishlists
                        .filter(w => !w.is_archived && w.id !== item.wishlist_id)
                        .map(w => {
                          const checked = selectedTargets.has(w.id)
                          return (
                            <button
                              key={w.id}
                              onClick={e => {
                                e.stopPropagation()
                                handleToggleTarget(w.id)
                              }}
                              className="w-full px-4 py-1.5 text-sm flex items-center gap-2 hover:bg-black/5"
                            >
                              <span
                                className={`flex items-center justify-center w-4 h-4 rounded-md border ${
                                  checked ? 'border-primary-400 bg-primary-500' : 'border-neutral-400 bg-transparent'
                                }`}
                              >
                                {checked && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M4.5 10.5L8 14L15.5 6.5"
                                      stroke="currentColor"
                                      strokeWidth="1.6"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </span>
                              <span className="truncate text-left">{w.title}</span>
                            </button>
                          )
                        })}
                    <div className="h-px bg-neutral-200/80 my-1" />
                    <div className="flex items-center justify-end gap-2 px-4 pb-1 pt-1">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setShowAddToMenu(false)
                          setSelectedTargets(new Set())
                        }}
                        className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-black/5 rounded-lg"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleApplyCopy()
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}
                <div className="h-px bg-neutral-200/80 my-1" />
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-500/10"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                  <span>Удалить</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isEditing && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsEditing(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Редактировать подарок</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена (₽)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка</label>
                  <input
                    type="url"
                    value={editUrl}
                    onChange={e => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editTitle.trim()}
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300"
                >
                  {isSaving ? '...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Guest View ──
  return (
    <div>
      <div onClick={handleClick} className={`rounded-xl border-2 overflow-hidden transition-all ${isFullyReserved ? 'bg-gray-100 border-gray-300 opacity-70 cursor-default' : hasPartialReservation ? 'bg-yellow-50 border-yellow-300 hover:shadow-lg cursor-pointer' : 'bg-white border-gray-200 hover:shadow-lg cursor-pointer'}`}>
        <div className="relative aspect-square bg-gray-100">
          {hasMultipleImages ? <CardCarousel images={item.images!} alt={item.title} /> : imgSrc ? <img src={imgSrc || ''} alt={item.title} className="w-full h-full object-cover" /> : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
          )}
          {item.priority === 'high' && <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">🔥 Важно</span>}
          {isFullyReserved && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-40 flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-full font-bold text-gray-700 text-sm">✓ Зарезервировано</div>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
            {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-primary-600 transition inline-flex items-center gap-1">{item.title}<svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a> : item.title}
          </h3>
          {item.price && <div className="text-lg font-bold text-primary-600 mb-2">{Number(item.price).toLocaleString('ru-RU', {minimumFractionDigits:0, maximumFractionDigits:1})} {item.currency || '₽'}</div>}
          {hasPartialReservation && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1"><span>Собрано</span><span>{Number(item.collected_amount).toLocaleString()} / {Number(item.price).toLocaleString()} {item.currency || '₽'}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full transition-all" style={{width: `${reservationProgress}%`}} /></div>
              <ContributorsDisplay item={item} variant="partial" />
            </div>
          )}
          {isFullyReserved && <ContributorsDisplay item={item} variant="full" />}
          {!isFullyReserved && (
            <button onClick={e => { e.stopPropagation(); setShowDetail(true) }} className={`w-full py-2 px-4 rounded-lg font-medium transition text-sm ${hasPartialReservation ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
              {hasPartialReservation ? 'Добавить вклад' : 'Забронировать'}
            </button>
          )}
        </div>
      </div>
      {showDetail && <ItemDetailModal item={item} isOwner={isOwner} isOpen={showDetail} onClose={() => setShowDetail(false)} onUpdate={onUpdate} />}
    </div>
  )
}
