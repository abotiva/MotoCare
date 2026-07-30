import { ArrowRight, Bike, MapPinned, MessageCircle, ShoppingBag, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const homeSections = [
  {
    title: 'Mi Moto',
    description: 'Consulta la hoja de vida, mantenimientos, documentos y recordatorios de tu moto.',
    to: '/app/my-bikes',
    icon: Bike,
    accent: 'from-moto-orange/25 to-moto-orange/5',
    iconClass: 'bg-moto-orange text-moto-darker',
  },
  {
    title: 'Rutas',
    description: 'Planea recorridos, explora destinos y guarda tus próximas aventuras.',
    to: '/app/routes',
    icon: MapPinned,
    accent: 'from-sky-500/20 to-sky-500/5',
    iconClass: 'bg-sky-400 text-sky-950',
  },
  {
    title: 'Comunidad',
    description: 'Conversa con otros moteros, comparte experiencias y mantente cerca de tus clubes.',
    to: '/app/community',
    icon: MessageCircle,
    accent: 'from-violet-500/20 to-violet-500/5',
    iconClass: 'bg-violet-400 text-violet-950',
  },
  {
    title: 'Clubes',
    description: 'Administra tus clubes, conoce sus miembros y organiza nuevas rodadas en grupo.',
    to: '/app/clubs',
    icon: Users,
    accent: 'from-amber-500/20 to-amber-500/5',
    iconClass: 'bg-amber-400 text-amber-950',
  },
  {
    title: 'Tienda',
    description: 'Descubre motos, accesorios y publicaciones de la comunidad MotoCare.',
    to: '/app/marketplace',
    icon: ShoppingBag,
    accent: 'from-emerald-500/20 to-emerald-500/5',
    iconClass: 'bg-emerald-400 text-emerald-950',
  },
] as const

export function Home() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col p-4 pb-24 sm:p-6 lg:pb-6">
      <h1 className="sr-only">Inicio de MotoCare</h1>

      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        {homeSections.map((section) => (
          <Link
            key={section.title}
            to={section.to}
            className={`group relative flex min-h-52 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${section.accent} p-6 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-moto-orange focus:ring-offset-2 focus:ring-offset-moto-dark sm:p-8`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${section.iconClass}`}>
                <section.icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <ArrowRight
                className="h-6 w-6 text-gray-500 transition group-hover:translate-x-1 group-hover:text-white"
                aria-hidden="true"
              />
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold sm:text-3xl">{section.title}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-gray-300 sm:text-base">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-6 text-center">
        <Link
          to="/terms"
          className="rounded-md px-3 py-2 text-sm text-gray-500 transition hover:text-moto-orange focus:outline-none focus:ring-2 focus:ring-moto-orange"
        >
          Términos y condiciones
        </Link>
      </div>
    </div>
  )
}
