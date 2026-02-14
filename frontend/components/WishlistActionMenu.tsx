'use client'

import { useState, useRef, useEffect } from 'react'

interface WishlistActionMenuProps {
  wishlistId: number
  shareToken: string
  onEdit: () => void
  onDelete: () => void
}

export default function WishlistActionMenu({ wishlistId, shareToken, onEdit, onDelete }: WishlistActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleShare = () => {
    const shareLink = `${window.location.origin}/wl/${shareToken}`
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setIsOpen(false)
    }, 1500)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Three Dots Button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 py-0.5 z-50">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleShare()
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700 transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-gray-900 dark:text-white text-xs">{copied ? '✓ Скопировано!' : 'Поделиться'}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(false)
              onEdit()
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-neutral-700 transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-gray-900 dark:text-white text-xs">Редактировать</span>
          </button>

          <div className="border-t border-gray-100 dark:border-neutral-700 my-0.5"></div>

          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(false)
              onDelete()
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-red-600 dark:text-red-400 text-xs">Удалить</span>
          </button>
        </div>
      )}
    </div>
  )
}
