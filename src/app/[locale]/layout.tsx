import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google'
import { setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { cn } from '@/lib/utils'
import { routing } from '@/i18n/routing'
import '../globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-heading' })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: 'Pokémon Atlas',
  description: 'A visual atlas for Pokémon, their types, and evolution chains.',
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  // Enable static rendering
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={cn('h-full', 'antialiased', 'font-sans', instrumentSans.variable, bricolage.variable, geistMono.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
