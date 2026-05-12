import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LegendPanel() {
  const t = useTranslations('Legend')
  
  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-white/40">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3 px-3 text-[10px] text-white/60">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#273143]" />
            <span>{t('typeRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#7df2c0]" />
            <span>{t('evoRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#f59e0b]" />
            <span>{t('formRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#a855f7]/40" />
            <span>{t('abilityRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-[#ff5e3d]/40" />
            <span>{t('moveRel')}</span>
          </div>
        </div>

        <div className="h-px bg-white/5 my-1" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-white ring-2 ring-white/10" />
            <span>{t('pkmNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rotate-45 bg-[#89b4ff]" />
            <span>{t('typeNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 [clip-path:polygon(50%_0%,_61%_35%,_98%_35%,_68%_57%,_79%_91%,_50%_70%,_21%_91%,_32%_57%,_2%_35%,_39%_35%)] bg-[#a855f7]" />
            <span>{t('abilityNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 [clip-path:polygon(50%_0%,_100%_50%,_50%_100%,_0%_50%)] bg-[#ff5e3d]" />
            <span>{t('moveNode')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
