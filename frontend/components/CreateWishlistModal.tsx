'use client'

import { useState, useRef } from 'react'
import { apiClient } from '@/lib/api-client'
import type { Wishlist } from '@/types'

interface CreateWishlistModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (wishlist: Wishlist) => void
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

export default function CreateWishlistModal({ isOpen, onClose, onSuccess }: CreateWishlistModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    wishlist_type: 'permanent',
    event_name: '',
    event_date: '',
    visibility: 'friends_only' as 'by_link' | 'friends_only' | 'public'
  })
  const [isEvent, setIsEvent] = useState(false)
  const [coverType, setCoverType] = useState<'emoji' | 'image'>('emoji')
  const [selectedEmoji, setSelectedEmoji] = useState('🎁')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>('')
  const [showCoverMenu, setShowCoverMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [emojiSearch, setEmojiSearch] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Макс 5MB'); return }
    if (!file.type.startsWith('image/')) { setError('Только изображения'); return }
    setCoverImage(file)
    setCoverType('image')
    setError('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.title.trim()) { setError('Введите название вишлиста'); return }
    if (isEvent && !formData.event_date) { setError('Выберите дату'); return }

    setIsLoading(true)
    try {
      const submitData = new FormData()
      submitData.append('title', formData.title)
      if (formData.description.trim()) submitData.append('description', formData.description.trim())
      submitData.append('wishlist_type', isEvent ? 'event' : 'permanent')
      submitData.append('visibility', formData.visibility)
      if (isEvent) {
        submitData.append('event_name', formData.title)
        submitData.append('event_date', formData.event_date)
      }
      if (coverType === 'emoji') {
        submitData.append('cover_emoji', selectedEmoji)
      } else if (coverImage) {
        submitData.append('cover_image', coverImage)
      }

      const response = await apiClient.post('/wishlists/', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      onSuccess(response.data)
      handleClose()
    } catch (err: any) {
      const raw = err.response?.data?.detail
      setError(typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((e: any) => e.msg || String(e)).join('; ') : 'Ошибка при создании вишлиста')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ title: '', description: '', wishlist_type: 'permanent', event_name: '', event_date: '', visibility: 'friends_only' })
    setIsEvent(false)
    setCoverType('emoji')
    setSelectedEmoji('🎁')
    setCoverImage(null)
    setCoverPreview('')
    setShowCoverMenu(false)
    setShowEmojiPicker(false)
    setEmojiCategory(0)
    setEmojiSearch('')
    setError('')
    onClose()
  }

  // All emojis for search
  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis)
  const filteredEmojis = emojiSearch.trim() ? allEmojis : EMOJI_CATEGORIES[emojiCategory].emojis

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Создать вишлист</h2>
              <button onClick={handleClose} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              {/* Cover — square with mini dropdown */}
              <div className="flex flex-col items-center relative" ref={coverRef}>
                <div
                  onClick={() => setShowCoverMenu(!showCoverMenu)}
                  className="w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 border-gray-200 dark:border-neutral-700 hover:border-primary-500 transition flex items-center justify-center bg-gray-50 dark:bg-neutral-800"
                >
                  {coverType === 'emoji' ? (
                    <span className="text-3xl">{selectedEmoji}</span>
                  ) : coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎁</span>
                  )}
                </div>

                {/* Mini dropdown under avatar */}
                {showCoverMenu && (
                  <div className="absolute top-24 z-20 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden w-36">
                    <button
                      type="button"
                      onClick={() => { setShowEmojiPicker(true); setShowCoverMenu(false) }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
                    >
                      <span className="text-lg">😊</span>
                      <span className="text-gray-900 dark:text-white">Эмодзи</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-neutral-700" />
                    <button
                      type="button"
                      onClick={() => { fileInputRef.current?.click(); setShowCoverMenu(false) }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 flex items-center gap-2 text-sm"
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
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  id="title" type="text" required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900"
                  placeholder="Например: Мой вишлист"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="desc" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Описание</label>
                <textarea
                  id="desc" rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 resize-none"
                  placeholder="Можешь написать размер своей одежды"
                />
              </div>

              {/* Event toggle + date */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">К празднику</label>
                  <button type="button" onClick={() => setIsEvent(!isEvent)}
                    className={`relative w-11 h-6 rounded-full ${isEvent ? 'bg-primary-600' : 'bg-gray-300 dark:bg-neutral-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white dark:bg-neutral-200 rounded-full shadow transition-transform ${isEvent ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
                {isEvent && (
                  <div className="mt-2">
                    <input type="date" value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 dark:bg-neutral-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900" />
                  </div>
                )}
              </div>

              {/* Visibility dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">Приватность</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 dark:text-white bg-white dark:bg-neutral-700 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
                >
                  <option value="public">Виден всем</option>
                  <option value="friends_only">Виден для друзей</option>
                  <option value="by_link">Доступен по ссылке</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition">
                  Отмена
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-medium rounded-xl transition">
                  {isLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
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
                <input
                  type="text" value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Поиск эмодзи"
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-neutral-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className={`p-2 text-2xl rounded-xl transition-all hover:scale-110 hover:bg-gray-100 dark:hover:bg-neutral-700 ${
                      selectedEmoji === emoji && coverType === 'emoji' ? 'bg-primary-100 dark:bg-primary-900/30 scale-110 ring-2 ring-primary-500' : ''
                    }`}>
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
