import type { Metadata } from 'next'
import { Mulish } from 'next/font/google'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'

const mulish = Mulish({ subsets: ['latin', 'cyrillic'], weight: ['300', '400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'Wishlist - Share Your Wishes',
  description: 'Social wishlist application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={mulish.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
