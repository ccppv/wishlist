'use client'

import Link from 'next/link'
import LandingHeader from '@/components/LandingHeader'
import { useAuthStore } from '@/store/auth'

export default function Home() {
  const { isAuthenticated, isInitialized } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 pt-16 sm:pt-24 pb-20 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight leading-tight mb-6">
            Привет, это Wishlist — сервис для создания вишлистов
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Поделись своими желаниями с друзьями и получай только «те самые» подарки. Это бесплатно и в неограниченном количестве.
          </p>
          <Link
            href={isInitialized && isAuthenticated ? '/profile' : '/auth/register'}
            className="inline-block px-8 py-3.5 rounded-xl text-base font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition"
          >
            {isInitialized && isAuthenticated ? 'В профиль' : 'Создать вишлист'}
          </Link>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-20 border-t border-neutral-100">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-neutral-900 text-center mb-12">
              Как это работает?
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
                  <span className="text-sm font-semibold text-neutral-600">1</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Создай список желаний</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Добавляй нужные подарки с ссылками на интернет-магазины
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
                  <span className="text-sm font-semibold text-neutral-600">2</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Поделись с друзьями</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Отправь им ссылку и каждый сможет забронировать подарок без регистрации
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-2xl bg-neutral-100 items-center justify-center mb-4">
                  <span className="text-sm font-semibold text-neutral-600">3</span>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Готово! Наслаждайся!</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Ты получаешь крутые подарки, а друзья не задаются вопросом «Что дарить?»
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-20 bg-neutral-50/50">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
              Получай только желанные подарки
            </h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Никаких глупых и нелепых сюрпризов! Добавь ссылку и получи гарантированно то, что хотел в нужном виде, цвете и качестве.
            </p>
            {!isAuthenticated && (
              <Link
                href="/auth/register"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium border border-neutral-300 text-neutral-700 hover:bg-white hover:border-neutral-400 transition"
              >
                Хочу вишлист
              </Link>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
              Собери все желания в одном месте
            </h2>
            <p className="text-neutral-600 mb-8 leading-relaxed">
              Больше не придётся вспоминать, куда ты сохранил желаемое — для этого есть Wishlist с неограниченным количеством списков.
            </p>
            {!isAuthenticated && (
              <Link
                href="/auth/register"
                className="inline-block px-8 py-3.5 rounded-xl text-base font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition"
              >
                Создать аккаунт бесплатно
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t border-neutral-100">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-neutral-400">
            &copy; {new Date().getFullYear()} Wishlist
          </p>
        </div>
      </footer>
    </div>
  )
}
