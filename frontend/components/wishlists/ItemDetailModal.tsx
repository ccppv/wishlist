'use client'

import { useState } from 'react'
import type { Item } from '@/types'
import { apiClient } from '@/lib/api-client'
import { getAvatarUrl } from '@/lib/utils'

interface ItemDetailModalProps {
  item: Item
  isOwner: boolean
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function ItemDetailModal({ item, isOwner, isOpen, onClose, onUpdate }: ItemDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isReserving, setIsReserving] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [showPartialInput, setShowPartialInput] = useState(false)
  const [guestName, setGuestName] = useState('')

  const images = (item.images && item.images.length > 0) ? item.images : (item.image_url ? [item.image_url] : [])
  const isFullyReserved = item.is_reserved && item.collected_amount >= (item.price || 0)
  const remainingAmount = (item.price || 0) - item.collected_amount

  if (!isOpen) return null

  const handleFullReservation = async () => {
    if (isFullyReserved) return
    if (!guestName.trim()) { alert('Введите ваше имя'); return }
    setIsReserving(true)
    try {
      await apiClient.post(`/items/${item.id}/reserve`, { amount: item.price, name: guestName.trim() })
      onUpdate(); onClose()
    } catch (err: any) { alert(err?.response?.data?.detail || 'Ошибка при бронировании') }
    finally { setIsReserving(false) }
  }

  const handlePartialReservation = async () => {
    const amount = parseFloat(partialAmount)
    if (isNaN(amount) || amount <= 0) { alert('Введите корректную сумму'); return }
    if (amount > remainingAmount) { alert(`Максимальная сумма: ${remainingAmount.toLocaleString()} ${item.currency || '₽'}`); return }
    if (!guestName.trim()) { alert('Введите ваше имя'); return }
    setIsReserving(true)
    try {
      await apiClient.post(`/items/${item.id}/reserve`, { amount, name: guestName.trim() })
      onUpdate(); onClose()
    } catch (err: any) { alert(err?.response?.data?.detail || 'Ошибка при бронировании') }
    finally { setIsReserving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{item.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          {images.length > 0 && (
            <div className="relative mb-4 rounded-xl overflow-hidden bg-gray-100">
              <div className="aspect-square">
                <img src={getAvatarUrl(images[currentImageIndex]) || ''} alt={item.title} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(p => p === 0 ? images.length - 1 : p - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-1.5 hover:bg-opacity-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => setCurrentImageIndex(p => p === images.length - 1 ? 0 : p + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 rounded-full p-1.5 hover:bg-opacity-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-2 h-2 rounded-full transition ${i === currentImageIndex ? 'bg-white w-5' : 'bg-white bg-opacity-50'}`} />)}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="mb-3">
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-gray-900 hover:text-primary-600 transition inline-flex items-center gap-1.5">
                {item.title}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            ) : <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>}
          </div>
          {item.description && <p className="text-gray-600 mb-4 text-sm">{item.description}</p>}
          {item.price && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-2xl font-bold text-primary-600">{Number(item.price).toLocaleString('ru-RU')} {item.currency || '₽'}</div>
              {item.collected_amount > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Собрано: {Number(item.collected_amount).toLocaleString()} {item.currency || '₽'}</span>
                    <span>Осталось: {remainingAmount.toLocaleString()} {item.currency || '₽'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${isFullyReserved ? 'bg-green-500' : 'bg-yellow-500'}`} style={{width: `${Math.min(100, (item.collected_amount / (item.price || 1)) * 100)}%`}} />
                  </div>
                  {item.reserved_by_name && <p className="text-xs text-gray-500 mt-1">забронировал {item.reserved_by_name}</p>}
                </div>
              )}
            </div>
          )}
          {isFullyReserved && !isOwner && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5 text-center">
              <div className="text-3xl mb-1">✓</div>
              <div className="text-lg font-bold text-green-700">Подарок зарезервирован</div>
              {item.reserved_by_name && <div className="text-sm text-green-600 mt-1">забронировал {item.reserved_by_name}</div>}
            </div>
          )}
          {!isOwner && !isFullyReserved && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ваше имя</label>
                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Как вас зовут?" className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400" />
              </div>
              {!showPartialInput ? (
                <>
                  <button onClick={handleFullReservation} disabled={isReserving || !guestName.trim()} className="w-full py-3 px-6 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
                    {isReserving ? 'Бронирование...' : '✓ Забронировать полностью'}
                  </button>
                  <button onClick={() => setShowPartialInput(true)} className="w-full py-3 px-6 border-2 border-primary-600 text-primary-600 rounded-lg font-bold hover:bg-primary-50 transition">
                    👥 Скинуться вместе
                  </button>
                </>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Сумма вклада (макс. {remainingAmount.toLocaleString()} {item.currency || '₽'})</label>
                  <div className="flex gap-2 mb-3">
                    <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} max={remainingAmount} placeholder="0" className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 text-gray-900" />
                    <span className="flex items-center text-gray-600 font-medium">{item.currency || '₽'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPartialInput(false); setPartialAmount('') }} className="flex-1 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50">Отмена</button>
                    <button onClick={handlePartialReservation} disabled={isReserving || !partialAmount || !guestName.trim()} className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                      {isReserving ? '...' : 'Подтвердить'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {isOwner && <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center text-gray-500"><p>Это ваш подарок</p></div>}
        </div>
      </div>
    </div>
  )
}
