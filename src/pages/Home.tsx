import { ArrowRight, Bike, MapPinned, MessageCircle, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ecosystemBlocks = [
  {
    title: 'Mi Garage',
    icon: Bike,
    to: '/app/garage',
    cardClass: 'border-t-moto-orange',
    iconClass: 'bg-moto-orange/15 text-moto-orange',
    linkClass: 'text-moto-orange hover:text-moto-orange-dark',
    description: 'Todo lo relacionado con el cuidado y la hoja de vida de tus motos.',
    items: ['Resumen', 'Historial', 'Agenda', 'Documentos', 'Gastos'],
  },
  {
    title: 'Rutas',
    icon: MapPinned,
    to: '/app/explore',
    cardClass: 'border-t-sky-400',
    iconClass: 'bg-sky-400/15 text-sky-300',
    linkClass: 'text-sky-300 hover:text-sky-200',
    description: 'Herramientas para descubrir, preparar y administrar tus recorridos.',
    items: ['Descubrir rutas', 'Mis rutas', 'Crear ruta', 'Rutas guardadas'],
  },
  {
    title: 'Comunidad',
    icon: MessageCircle,
    to: '/app/messages',
    cardClass: 'border-t-violet-400',
    iconClass: 'bg-violet-400/15 text-violet-300',
    linkClass: 'text-violet-300 hover:text-violet-200',
    description: 'Espacios para conectar y compartir con otros moteros.',
    items: ['Actividad', 'Clubes', 'Mis clubes', 'Moteros'],
  },
  {
    title: 'Tienda',
    icon: ShoppingBag,
    to: '/app/marketplace',
    cardClass: 'border-t-emerald-400',
    iconClass: 'bg-emerald-400/15 text-emerald-300',
    linkClass: 'text-emerald-300 hover:text-emerald-200',
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
            <article key={block.title} className={`flex flex-col rounded-3xl border border-t-4 border-white/5 bg-moto-darker p-5 shadow-lg shadow-black/10 ${block.cardClass}`}>
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${block.iconClass}`}>
                <block.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-bold">
                <Link to={block.to} className={`inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${block.linkClass}`}>
                  {block.title}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-400">{block.description}</p>
              <ul className="mt-5 divide-y divide-white/5 border-t border-white/5 text-sm text-gray-300">
                {block.items.map((item) => <li key={item} className="py-2.5">{item}</li>)}
              </ul>
              <Link
                to={block.to}
                className="mt-auto inline-flex min-h-11 items-center justify-between rounded-xl bg-moto-orange/10 px-4 font-semibold text-moto-orange transition-colors hover:bg-moto-orange hover:text-moto-darker focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange"
              >
                Abrir {block.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
