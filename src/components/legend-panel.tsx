import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LegendPanel() {
  const t = useTranslations('Legend')

  return (
    <Card className="atlas-panel rounded-lg py-3">
      <CardHeader className="py-2.5 px-3">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--atlas-faint)]">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-3 pb-3 text-[10px] text-[var(--atlas-muted)]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[var(--atlas-type)]/50" />
            <span className="font-medium">{t('typeRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[var(--atlas-green)]" />
            <span className="font-medium">{t('evoRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[var(--atlas-yellow)]" />
            <span className="font-medium">{t('formRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[var(--atlas-purple)]" />
            <span className="font-medium">{t('abilityRel')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-[var(--atlas-orange)]" />
            <span className="font-medium">{t('moveRel')}</span>
          </div>
        </div>

        <div className="my-1 h-px bg-[var(--atlas-border)]" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full bg-[var(--atlas-text)] ring-2 ring-white/10" />
            <span className="font-medium">{t('pkmNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 rotate-45 bg-[var(--atlas-type)]" />
            <span className="font-medium">{t('typeNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 [clip-path:polygon(50%_0%,_61%_35%,_98%_35%,_68%_57%,_79%_91%,_50%_70%,_21%_91%,_32%_57%,_2%_35%,_39%_35%)] bg-[var(--atlas-purple)]" />
            <span className="font-medium">{t('abilityNode')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-2 [clip-path:polygon(50%_0%,_100%_50%,_50%_100%,_0%_50%)] bg-[var(--atlas-orange)]" />
            <span className="font-medium">{t('moveNode')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
