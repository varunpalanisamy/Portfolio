import dynamic from 'next/dynamic'

const PokemonGame = dynamic(() => import('@/components/PokemonGame'), { ssr: false })

export default function Home() {
  return <PokemonGame />
}
