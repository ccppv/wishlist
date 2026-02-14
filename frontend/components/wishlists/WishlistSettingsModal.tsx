'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'
import type { Wishlist } from '@/types'

interface WishlistSettingsModalProps {
  wishlist: Wishlist
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const EMOJI_CATEGORIES: { icon: string; name: string; emojis: string[] }[] = [
  { icon: '🎁', name: 'Подарки', emojis: ['🎁', '🎀', '🎊', '🎉', '🎈', '🎂', '🎄', '🎃', '🎆', '🎇', '🧧', '🪅', '🪄', '🎑', '🎍', '🎋', '🎏', '🎎', '🎐', '🧨'] },
  { icon: '😊', name: 'Смайлы', emojis: ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '🫨', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😵', '🤯', '🥱', '😎', '🤓', '🧐'] },
  { icon: '❤️', name: 'Эмоции', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '✨', '⭐', '🌟', '💫', '🌈', '🎵', '🎶', '🎼'] },
  { icon: '👋', name: 'Руки', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿'] },
  { icon: '🛍️', name: 'Покупки', emojis: ['🛍️', '👗', '👠', '👟', '👜', '💄', '💍', '👑', '🧸', '🎮', '🎯', '🎨', '📸', '💻', '📱', '⌚', '🎧', '🕹️', '🏆', '🥇', '👒', '🧢', '🎒', '👓', '🕶️', '🥽', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👙', '👘', '🥻', '🩱', '🩲', '🩳'] },
  { icon: '🍕', name: 'Еда', emojis: ['🍕', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🎂', '🥂', '🍾', '☕', '🧋', '🍿', '🍱', '🍣', '🌮', '🍔', '🥐', '🍓', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🌽', '🥕', '🥦'] },
  { icon: '🐱', name: 'Животные', emojis: ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞'] },
  { icon: '✈️', name: 'Путешествия', emojis: ['✈️', '🌍', '🗺️', '🏖️', '🏔️', '🌴', '🏕️', '🎢', '🚀', '🛸', '🚗', '🚲', '⛵', '🏠', '🏰', '🗼', '🗽', '🌅', '🌄', '🌊', '🚂', '🚆', '🚊', '🚁', '🛶', '⛽', '🚏', '🗿', '🏛️', '⛩️'] },
  { icon: '🌸', name: 'Природа', emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '💐', '🌿', '🍀', '🌳', '🌲', '🌴', '🌵', '🌾', '🌱', '🪴', '🍁', '🍂', '🍃', '🪹', '🪺', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌈', '🔥', '💧'] },
  { icon: '⚽', name: 'Спорт', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎳', '⛳', '🏓', '🥊', '🏋️', '🧘', '🏊', '🚴', '⛷️', '🏂', '🤸', '🎿', '🛹', '🏄', '🤿', '🏇', '🧗', '🤺', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️'] },
  { icon: '📚', name: 'Учёба', emojis: ['📚', '📖', '✏️', '🖊️', '📝', '🎓', '🔬', '🔭', '🧪', '🧬', '💡', '🧠', '📐', '🖌️', '🎻', '🎹', '🎸', '🥁', '🎼', '📰', '🔔', '📣', '📢', '🔑', '🗝️', '🔒', '🔓', '🏷️', '📎', '✂️'] },
]

export default function WishlistSettingsModal({ wishlist, isOpen, onClose, onUpdate }: WishlistSettingsModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState(wishlist.title)
  const [description, setDescription] = useState(wishlist.description || '')
  const [isEvent, setIsEvent] = useState(wishlist.wishlist_type === 'event')
  const [eventDate, setEventDate] = useState(wishlist.event_date || '')
  const [visibility, setVisibility] = useState(wishlist.visibility)

  // Cover state
  const [coverType, setCoverType] = useState<'emoji' | 'image'>(wishlist.cover_image_url ? 'image' : 'emoji')
  const [selectedEmoji, setSelectedEmoji] = useState(wishlist.cover_emoji || '🎁')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState(wishlist.cover_image_url ? getAvatarUrl(wishlist.cover_image_url) || '' : '')
  const [showCoverMenu, setShowCoverMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [emojiSearch, setEmojiSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Sync with wishlist props
  useEffect(() => {
    setTitle(wishlist.title)
    setDescription(wishlist.description || '')
    setIsEvent(wishlist.wishlist_type === 'event')
    setEventDate(wishlist.event_date || '')
    setVisibility(wishlist.visibility)
    setCoverType(wishlist.cover_image_url ? 'image' : 'emoji')
    setSelectedEmoji(wishlist.cover_emoji || '🎁')
    setCoverPreview(wishlist.cover_image_url ? getAvatarUrl(wishlist.cover_image_url) || '' : '')
  }, [wishlist])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Макс 5MB'); return }
    if (!file.type.startsWith('image/')) { alert('Только изображения'); return }

    setCoverImage(file)
    setCoverType('image')
    const reader = new FileReader()
    reader.onloadend = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)
    setShowCoverMenu(false)
  }

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji)
    setCoverType('emoji')
    setCoverImage(null)
    setCoverPreview('')
    setShowEmojiPicker(false)
    setShowCoverMenu(false)
  }

  const handleSave = async () => {
    if (!title.trim()) { alert('Введите название вишлиста'); return }
    if (isEvent && !eventDate) { alert('Выберите дату'); return }

    setIsSaving(true)
    try {
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        wishlist_type: isEvent ? 'event' : 'permanent',
        visibility,
      }

      // Handle cover type changes
      if (coverType === 'emoji') {
        updateData.cover_emoji = selectedEmoji
        updateData.cover_image_url = null
      } else if (coverType === 'image' && !coverImage) {
        // Switching to existing image or keeping current image
        // Don't change cover fields
      } else if (coverType === 'image' && coverImage) {
        // New image will be uploaded separately
        updateData.cover_emoji = null
      }

      if (isEvent) {
        updateData.event_name = title
        updateData.event_date = eventDate
      } else {
        updateData.event_name = null
        updateData.event_date = null
      }

      await apiClient.patch(`/wishlists/${wishlist.id}`, updateData)

      // If a new cover image was uploaded, send it separately
      if (coverType === 'image' && coverImage) {
        const fd = new FormData()
        fd.append('cover_image', coverImage)
        await apiClient.patch(`/wishlists/${wishlist.id}/cover-image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onUpdate()
      onClose()
    } catch (err: any) {
      console.error('Error updating wishlist:', err)
      alert(err.response?.data?.detail || 'Ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await apiClient.delete(`/wishlists/${wishlist.id}`)
      router.push('/profile')
    } catch (err) {
      console.error('Error deleting wishlist:', err)
      alert('Ошибка при удалении вишлиста')
    } finally {
      setIsDeleting(false)
    }
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/wl/${wishlist.share_token}` : ''
  const copyShareLink = () => { navigator.clipboard.writeText(shareUrl); alert('Ссылка скопирована!') }

  // All emojis for search
  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis)
  const filteredEmojis = emojiSearch.trim() 
    ? allEmojis.filter(emoji => emoji.toLowerCase().includes(emojiSearch.toLowerCase()))
    : EMOJI_CATEGORIES[emojiCategory].emojis;

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-200">Настройки</h2>
              <button onClick={onClose} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Cover — square with mini dropdown */}
              <div className="flex flex-col items-center relative" ref={coverRef}>
                <div
                  onClick={() => setShowCoverMenu(!showCoverMenu)}
                  className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer border-2 border-gray-200 dark:border-neutral-700 hover:border-primary-500 transition flex items-center justify-center bg-gray-50 dark:bg-neutral-700"
                >
                  {coverType === 'emoji' ? (
                    <span className="text-2xl">{selectedEmoji}</span>
                  ) : coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🎁</span>
                  )}
                </div>

                {/* Mini dropdown under avatar */}
                {showCoverMenu && (
                  <div className="absolute top-20 z-20 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden w-32">
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(true); setShowCoverMenu(false) }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                    >
                      <span className="text-lg">😊</span>
                      <span className="text-gray-900 dark:text-white">Эмодзи</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-neutral-700" />
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setShowCoverMenu(false) }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                    >
                      <span className="text-lg">🖼️</span>
                      <span className="text-gray-900 dark:text-white">Фото</span>
                    </button>
                  </div>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Название <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text" required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white dark:bg-neutral-700 text-sm"
                  placeholder="Например: Мой вишлист"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 text-sm resize-none"
                  placeholder="Можешь написать размер своей одежды"
                />
              </div>

              {/* Event toggle + date */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">К празднику</label>
                  <button type="button" onClick={() => setIsEvent(!isEvent)}
                    className={`relative w-11 h-6 rounded-full ${isEvent ? 'bg-primary-600' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEvent ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {isEvent && (
                  <div className="mt-2">
                    <input type="date" value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 text-sm" />
                  </div>
                )}
              </div>

              {/* Visibility dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приватность</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 text-sm bg-white appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
                >
                  <option value="public">Виден всем</option>
                  <option value="friends_only">Виден для друзей</option>
                  <option value="by_link">Доступен по ссылке</option>
                </select>
              </div>

              {/* Share Link */}
              {shareUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка для друзей</label>
                  <div className="flex gap-2">
                    <input
                      type="text" value={shareUrl} readOnly
                      className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm"
                    />
                    <button onClick={copyShareLink}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium">
                      Копировать
                    </button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button onClick={handleSave} disabled={isSaving || !title.trim()}
                className="w-full px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white text-sm font-medium rounded-xl transition">
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>

              {/* Delete Section */}
              <div className="pt-3 border-t border-neutral-100">
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 transition">
                    Удалить вишлист
                  </button>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-3">
                      Вы уверены? Все подарки в этом вишлисте будут удалены безвозвратно.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                        Отмена
                      </button>
                      <button onClick={handleDelete} disabled={isDeleting}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300">
                        {isDeleting ? 'Удаление...' : 'Удалить'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apple-style Emoji Picker — fullscreen overlay */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowEmojiPicker(false)} />
          <div className="relative bg-white dark:bg-neutral-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Эмодзи</h3>
                <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-full">
                  <svg className="w-5 h-5 text-gray-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Search */}
              <div className="relative mb-2">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Поиск эмодзи"
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-neutral-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 border-0"
                />
              </div>
              {/* Category icons row */}
              {!emojiSearch && (
                <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <button key={i} type="button" onClick={() => setEmojiCategory(i)}
                      className={`p-2 text-xl rounded-lg transition flex-shrink-0 ${emojiCategory === i ? 'bg-primary-100 dark:bg-primary-900/30' : 'hover:bg-gray-100 dark:hover:bg-neutral-700'}`}
                      title={cat.name}>
                      {cat.icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {!emojiSearch && (
                <p className="text-xs font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-2 px-1">
                  {EMOJI_CATEGORIES[emojiCategory].name}
                </p>
              )}
              <div className="grid grid-cols-8 gap-0.5">
                {filteredEmojis.map((emoji, idx) => (
                  <button key={`${emoji}-${idx}`} type="button" onClick={() => handleEmojiSelect(emoji)}
                    className={`p-2 text-2xl rounded-xl transition-all hover:scale-110 hover:bg-gray-100 dark:hover:bg-neutral-700 ${selectedEmoji === emoji && coverType === 'emoji' ? 'bg-primary-100 dark:bg-primary-900/30 scale-110 ring-2 ring-primary-500' : ''}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
