import PokemonGraph from '@/components/pokemon-graph'

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <main className="relative min-h-screen overflow-hidden">
      <PokemonGraph locale={locale} />
    </main>
  )
}
