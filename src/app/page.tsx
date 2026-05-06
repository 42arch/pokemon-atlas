'use client'

import dynamic from 'next/dynamic'

const PokemonGraph = dynamic(() => import('@/components/PokemonGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#060816] text-white">
      <div className="border border-white/10 bg-black/40 px-6 py-4 text-sm tracking-[0.22em] text-white/72 backdrop-blur-xl">
        正在装载图谱界面...
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <PokemonGraph />
    </main>
  )
}
