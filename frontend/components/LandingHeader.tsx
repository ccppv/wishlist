'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getAvatarUrl } from '@/lib/utils'

export default function LandingHeader() {
  const router = useRouter()
  const { user, isAuthenticated, isInitialized, logout } = useAuthStore()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setShowMenu(false)
    logout()
    router.push('/')
  }

  if (!isInitialized) {
    return (
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
            Wishlist
          </Link>
          <div className="w-10 h-10" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900 hover:opacity-80 transition">
          Wishlist
        </Link>

        {isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full overflow-hidden border border-neutral-200 hover:border-neutral-300 transition focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {user.avatar_url ? (
                <img src={getAvatarUrl(user.avatar_url) || ''} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-neutral-600">{user.username[0].toUpperCase()}</span>
                </div>
              )}
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-52 py-1 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden">
                <Link
                  href="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition"
                >
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  В профиль
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition"
                >
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Настройки
                </Link>
                <Link
                  href="/gifts"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition"
                >
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  Подарки друзьям
                </Link>
                <div className="border-t border-neutral-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Выйти
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition"
          >
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}
