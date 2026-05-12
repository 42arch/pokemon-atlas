'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname, routing } from '@/navigation'
import { cn } from '@/lib/utils'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (nextLocale: string) => {
    // @ts-ignore - next-intl navigation types can be strict
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-md border border-white/10 w-fit">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={cn(
            "px-2 py-0.5 text-[9px] font-bold uppercase transition-all rounded",
            locale === l 
              ? "bg-[#89b4ff] text-black shadow-[0_0_8px_rgba(137,180,255,0.4)]" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
