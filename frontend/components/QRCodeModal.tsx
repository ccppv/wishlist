'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
}

export default function QRCodeModal({ isOpen, onClose, username }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const profileLink = typeof window !== 'undefined' 
      ? `${window.location.origin}/u/${username}`
      : ''

    QRCode.toCanvas(canvasRef.current, profileLink, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }).catch(err => {
      console.error('QR code generation failed:', err)
    })
  }, [isOpen, username])

  if (!isOpen) return null

  const handleDownload = () => {
    if (!canvasRef.current) return
    
    const link = document.createElement('a')
    link.download = `qr-code-${username}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">QR-код</h2>
            <button onClick={onClose} className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center">
            <div className="rounded-2xl overflow-hidden">
              <canvas ref={canvasRef} className="w-56 h-56" />
            </div>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">@{username}</p>
          </div>

          <button
            onClick={handleDownload}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
