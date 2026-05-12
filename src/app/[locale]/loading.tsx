import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('Common.stats')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060816] text-white">
      <div className="border border-white/10 bg-black/40 px-6 py-4 text-sm tracking-[0.22em] text-white/72 backdrop-blur-xl">
        {t('loading')}
      </div>
    </div>
  )
}
