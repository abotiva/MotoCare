import { Bike, MapPinned, MessageCircle, ShoppingBag } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const ecosystemBlocks = [
  {
    title: 'Mi Garage',
    icon: Bike,
    description: 'Todo lo relacionado con el cuidado y la hoja de vida de tus motos.',
    items: ['Resumen', 'Historial', 'Agenda', 'Documentos', 'Gastos'],
  },
  {
    title: 'Rutas',
    icon: MapPinned,
    description: 'Herramientas para descubrir, preparar y administrar tus recorridos.',
    items: ['Descubrir rutas', 'Mis rutas', 'Crear ruta', 'Rutas guardadas'],
  },
  {
    title: 'Comunidad',
    icon: MessageCircle,
    description: 'Espacios para conectar y compartir con otros moteros.',
    items: ['Actividad', 'Clubes', 'Mis clubes', 'Moteros'],
  },
  {
    title: 'Tienda',
    icon: ShoppingBag,
    description: 'Productos, servicios y experiencias para vivir la moto.',
    items: ['Motos', 'Repuestos', 'Equipamiento', 'Servicios', 'Rutas Premium'],
  },
]

export function Home() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'motero'

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 sm:p-6 lg:pb-8">
      <header>
        <p className="text-sm font-medium text-moto-orange">MotoCare conecta tu moto, tus rutas y tu comunidad.</p>
        <h1 className="mt-1 text-3xl font-bold">Hola, {firstName}</h1>
      </header>

      <section className="mt-8" aria-labelledby="ecosystem-title">
        <div>
          <p className="text-sm text-gray-500">Todo el ecosistema, de un vistazo</p>
          <h2 id="ecosystem-title" className="mt-1 text-2xl font-bold">¿Qué quieres gestionar hoy?</h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ecosystemBlocks.map((block) => (
            <article key={block.title} className="rounded-3xl border border-white/5 bg-moto-darker p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-moto-orange/15">
                <block.icon className="h-6 w-6 text-moto-orange" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{block.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">{block.description}</p>
              <ul className="mt-5 divide-y divide-white/5 border-t border-white/5 text-sm text-gray-300">
                {block.items.map((item) => <li key={item} className="py-2.5">{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
