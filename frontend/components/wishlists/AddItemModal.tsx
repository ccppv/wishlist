'use client'

import { useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface AddItemModalProps {
  wishlistId: number
  onClose: () => void
  onCreated: () => void
}

export default function AddItemModal({ wishlistId, onClose, onCreated }: AddItemModalProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleParseUrl = async () => {
    if (!url.trim()) return
    setIsParsing(true)
    try {
      const res = await apiClient.post('/items/parse-url', { url: url.trim() })
      const data = res.data
      if (data.title && !title) setTitle(data.title)
      if (data.price && !price) setPrice(String(data.price))
      if (data.description && !description) setDescription(data.description)
      if (data.images && data.images.length > 0 && images.length === 0) setImages(data.images)
      else if (data.image_url && images.length === 0) setImages([data.image_url])
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Не удалось распознать ссылку')
    } finally {
      setIsParsing(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await apiClient.post('/items/upload-image', formData)
        setImages(prev => [...prev, res.data.url])
      }
    } catch { alert('Ошибка загрузки фото') }
    finally { setIsUploading(false) }
  }

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!title.trim()) { alert('Введите название'); return }
    setIsSubmitting(true)
    try {
      const body: any = {
        title: title.trim(),
        currency: '₽',
      }
      if (url.trim()) body.url = url.trim()
      if (description.trim()) body.description = description.trim()
      if (price) body.price = parseFloat(price)
      if (images.length > 0) body.images = images
      await apiClient.post(`/items?wishlist_id=${wishlistId}`, body)
      onCreated()
      onClose()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Ошибка при добавлении')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">Добавить подарок</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* URL + parse button */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Ссылка на товар (необязательно)</label>
            <p className="text-xs text-gray-400">
              Вставь ссылку и мы попробуем подставить название, цену и фото автоматически.
            </p>
            <div className="flex gap-2 mt-1">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
              />
              <button
                onClick={handleParseUrl}
                disabled={isParsing || !url.trim()}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-xs font-medium whitespace-nowrap"
              >
                {isParsing ? 'Парсим...' : '🔍 Парсить'}
              </button>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото</label>
            {images.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={getAvatarUrl(img) || img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition">
              <span className="text-sm text-gray-500">
                {isUploading ? 'Загрузка...' : '📷 Загрузить фото с устройства'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Что хотите получить?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание (необязательно)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Размер, цвет, пожелания..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Примерная цена</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 text-sm"
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">₽</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? 'Добавление...' : '+ Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}
