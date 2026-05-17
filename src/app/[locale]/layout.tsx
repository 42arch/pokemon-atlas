import type { Metadata } from 'next'
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google'
import { setRequestLocale, getMessages, getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { cn } from '@/lib/utils'
import { routing } from '@/i18n/routing'
import '../globals.css'

const BASE_URL = 'https://pokemon-atlas.vercel.app'


const bricolage = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-heading' })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: locale === 'zh' ? '/' : `/${locale}`,
      languages: {
        zh: '/',
        en: '/en',
        ja: '/ja',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: BASE_URL + (locale === 'zh' ? '' : `/${locale}`),
      siteName: 'Pokémon Atlas',
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
      type: 'website',
      images: [
        {
          url: '/screenshot.png',
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/screenshot.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              'name': locale === 'zh' ? '宝可梦图谱' : locale === 'ja' ? 'ポケモンアトラス' : 'Pokémon Atlas',
              'alternateName': 'Pokémon Atlas',
              'url': BASE_URL + (locale === 'zh' ? '' : `/${locale}`),
              'description': locale === 'zh' 
                ? '通过宝可梦图谱自由探索庞大的宝可梦宇宙。这是一个交互式的视觉图鉴与关系网络，包含属性归属、进化链、特性及招式习得等丰富数据。' 
                : locale === 'ja' 
                ? 'タイプ、進化ライン、特性、習得わざなどのインタラクティブなビジュアル図鑑と関係マップを提供します。'
                : 'Explore the vast, interconnected universe of Pokémon with Pokémon Atlas. An interactive, visual Pokédex and relationship graph featuring types, abilities, moves, and evolution chains.',
              'applicationCategory': 'EducationalApplication',
              'operatingSystem': 'All',
              'browserRequirements': 'Requires JavaScript. Requires WebGL or Canvas support.',
              'offers': {
                '@type': 'Offer',
                'price': '0',
                'priceCurrency': 'USD'
              }
            })
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
