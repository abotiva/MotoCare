import { Camera, Gauge } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import type { Motorcycle } from '@/types/database'

export function HomeMotorcycleHero({ motorcycle }: { motorcycle: Motorcycle }) {
  const hasCustomPhoto = Boolean(motorcycle.image_url && motorcycle.image_url !== '/hero-motorcycle.jpg')
  return (
    <section className="relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-white/10 bg-moto-gray shadow-2xl shadow-black/20 sm:min-h-[30rem]" aria-labelledby="home-motorcycle-title">
      <img src={motorcycle.image_url || '/hero-motorcycle.jpg'} alt={hasCustomPhoto ? `${motorcycle.brand} ${motorcycle.model}` : ''} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-moto-darker via-moto-darker/35 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><Badge className="mb-3 bg-moto-orange text-moto-darker hover:bg-moto-orange">Mi moto</Badge>
          <h2 id="home-motorcycle-title" className="break-words text-3xl font-black leading-tight text-white sm:text-5xl">{motorcycle.brand} {motorcycle.model}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-200 sm:text-base"><span>{motorcycle.year ?? 'Año sin registrar'}</span><span className="inline-flex items-center gap-2 font-semibold text-white"><Gauge className="h-4 w-4 text-moto-orange" aria-hidden="true" />{motorcycle.mileage.toLocaleString('es-CO')} km</span></div>
        </div>
        {!hasCustomPhoto && <Link to="/app/my-bikes" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-moto-orange sm:w-auto"><Camera className="mr-2 h-4 w-4" aria-hidden="true" />Agregar mi foto</Link>}
      </div></div>
    </section>
  )
}
