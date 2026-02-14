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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-violet-200/20 dark:bg-violet-900/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 pt-20 sm:pt-32 pb-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800/50 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Бесплатно и без ограничений
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-[1.1] mb-6">
              Создавай вишлисты.<br />
              <span className="bg-gradient-to-r from-primary-600 to-violet-600 dark:from-primary-400 dark:to-violet-400 bg-clip-text text-transparent">
                Получай то, что хочешь.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Собери желания в одном месте, поделись ссылкой с друзьями — и каждый подарок будет точным попаданием.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={isInitialized && isAuthenticated ? '/profile' : '/auth/register'}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
              >
                {isInitialized && isAuthenticated ? 'В профиль' : 'Начать бесплатно'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  Уже есть аккаунт? Войти
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 sm:py-28 border-t border-neutral-100 dark:border-neutral-800">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                Как это работает
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
                Три шага — и ваши друзья всегда знают, что вам подарить
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                { num: '01', title: 'Создай вишлист', desc: 'Добавь подарки вручную или вставь ссылку — название, цена и фото подтянутся автоматически', icon: '✨' },
                { num: '02', title: 'Поделись ссылкой', desc: 'Друзья смогут зарезервировать подарок в один клик, даже без регистрации', icon: '🔗' },
                { num: '03', title: 'Получи подарок', desc: 'Никаких дублей и ненужных сюрпризов — каждый подарок точно тот, что ты хотел', icon: '🎁' },
              ].map(step => (
                <div key={step.num} className="relative p-6 rounded-2xl bg-white/50 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50 hover:border-neutral-300 dark:hover:border-neutral-600 transition group">
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <div className="text-xs font-bold text-primary-500 dark:text-primary-400 mb-2 tracking-wider">{step.num}</div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof / Benefits */}
        <section className="py-20 sm:py-28 bg-neutral-50/80 dark:bg-neutral-900/50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                  Забудьте про «Что тебе подарить?»
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                  Друзья видят ваш список и выбирают из того, что вы действительно хотите. Никаких неловких моментов, только радость.
                </p>
                <ul className="space-y-3">
                  {[
                    'Неограниченное количество вишлистов',
                    'Совместный сбор на дорогие подарки',
                    'Работает без регистрации для гостей',
                    'Парсинг ссылок с маркетплейсов',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300 text-sm">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <div className="w-64 h-80 rounded-3xl bg-gradient-to-br from-primary-100 to-violet-100 dark:from-primary-900/40 dark:to-violet-900/40 border border-primary-200/50 dark:border-primary-800/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎁</div>
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Ваш идеальный подарок</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 sm:py-28">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              Попробуйте прямо сейчас
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-10 leading-relaxed">
              Создание аккаунта занимает 30 секунд. Вишлисты, друзья, совместные сборы — всё бесплатно.
            </p>
            {!isAuthenticated && (
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-lg font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition shadow-xl shadow-neutral-900/10 dark:shadow-white/5"
              >
                Создать вишлист бесплатно
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            &copy; {new Date().getFullYear()} Wishlist
          </p>
          <div className="flex items-center gap-6 text-xs text-neutral-400 dark:text-neutral-500">
            <a href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition">Соглашение</a>
            <a href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition">Конфиденциальность</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
