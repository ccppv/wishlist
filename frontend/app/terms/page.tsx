import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export default function TermsPage() {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'content', 'terms.md'),
    'utf-8'
  )

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            ← На главную
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Политика конфиденциальности
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:text-neutral-600 dark:prose-p:text-neutral-400 prose-li:text-neutral-600 dark:prose-li:text-neutral-400 prose-strong:text-neutral-900 dark:prose-strong:text-white">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
    </div>
  )
}
