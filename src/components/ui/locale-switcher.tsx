'use client'

import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { routing, usePathname, useRouter } from '@/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <div className="flex w-fit items-center gap-1 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-panel-soft)] p-1">
      {routing.locales.map(l => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={cn(
            'rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase transition-all',
            locale === l
              ? 'bg-[var(--atlas-yellow)] text-[#111511] shadow-[0_0_14px_rgba(246,201,69,0.25)]'
              : 'text-[var(--atlas-faint)] hover:bg-white/5 hover:text-[var(--atlas-text)]',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
