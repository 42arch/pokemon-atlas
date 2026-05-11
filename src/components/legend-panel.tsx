import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LegendPanel() {
  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">图例</CardTitle>
        <CardDescription className="text-white/55">深色是属性连接，绿色是进化连接。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-white/72">
        <div className="flex items-center gap-3">
          <span className="inline-block h-px w-10 bg-[#273143]" />
          <span>宝可梦与属性的归属关系</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block h-px w-10 bg-[#7df2c0]" />
          <span>默认宝可梦节点之间的进化投影</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block h-px w-10 bg-[#f59e0b]" />
          <span>形态之间的转换关系</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-3 rounded-full bg-white ring-2 ring-white/20" />
          <span>普通宝可梦节点</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-3 rotate-45 bg-[#89b4ff]" />
          <span>属性节点</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-3 [clip-path:polygon(50%_0%,_61%_35%,_98%_35%,_68%_57%,_79%_91%,_50%_70%,_21%_91%,_32%_57%,_2%_35%,_39%_35%)] bg-[#a855f7]" />
          <span>特性节点</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-3 [clip-path:polygon(50%_0%,_100%_50%,_50%_100%,_0%_50%)] bg-[#ff5e3d]" />
          <span>招式节点</span>
        </div>
      </CardContent>
    </Card>
  )
}
