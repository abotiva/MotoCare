import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  Compass,
  Crown,
  MapPinned,
  MessageCircle,
  PlusCircle,
  Route,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

type SectionMenuKind = 'routes' | 'community' | 'clubs'

type MenuOption = {
  title: string
  description: string
  to: string
  icon: LucideIcon
  iconClass: string
  accent: string
}

type MenuContent = {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  options: MenuOption[]
}

const sectionMenus: Record<SectionMenuKind, MenuContent> = {
  routes: {
    eyebrow: 'Todo para tu próxima rodada',
    title: 'Rutas',
    description: 'Elige qué quieres hacer: preparar un recorrido, descubrir rutas de otros moteros o acceder a rutas premium.',
    icon: MapPinned,
    options: [
      {
        title: 'Mis rutas',
        description: 'Crea una ruta, consulta tus recorridos guardados y actualiza su progreso.',
        to: '/app/map',
        icon: Route,
        iconClass: 'bg-sky-400 text-sky-950',
        accent: 'from-sky-500/20 to-sky-500/5',
      },
      {
        title: 'Explorar rutas',
        description: 'Descubre recorridos públicos, destinos y experiencias compartidas por la comunidad.',
        to: '/app/explore',
        icon: Compass,
        iconClass: 'bg-emerald-400 text-emerald-950',
        accent: 'from-emerald-500/20 to-emerald-500/5',
      },
      {
        title: 'Rutas premium',
        description: 'Encuentra rutas seleccionadas, archivos GPX y recorridos listos para viajar.',
        to: '/app/premium-routes',
        icon: Crown,
        iconClass: 'bg-amber-400 text-amber-950',
        accent: 'from-amber-500/20 to-amber-500/5',
      },
    ],
  },
  community: {
    eyebrow: 'Conecta con otros moteros',
    title: 'Comunidad',
    description: 'Comparte experiencias, descubre publicaciones y participa en los espacios de tus clubes.',
    icon: MessageCircle,
    options: [
      {
        title: 'Muro de la comunidad',
        description: 'Publica novedades, comparte tus rutas y conversa con otros miembros de MotoCare.',
        to: '/app/messages',
        icon: MessageCircle,
        iconClass: 'bg-violet-400 text-violet-950',
        accent: 'from-violet-500/20 to-violet-500/5',
      },
      {
        title: 'Explorar',
        description: 'Busca rutas, publicaciones y moteros fuera de tus círculos habituales.',
        to: '/app/explore',
        icon: Compass,
        iconClass: 'bg-sky-400 text-sky-950',
        accent: 'from-sky-500/20 to-sky-500/5',
      },
      {
        title: 'Clubes',
        description: 'Entra a tus grupos, revisa sus miembros y organiza rodadas privadas.',
        to: '/app/clubs',
        icon: Users,
        iconClass: 'bg-emerald-400 text-emerald-950',
        accent: 'from-emerald-500/20 to-emerald-500/5',
      },
    ],
  },
  clubs: {
    eyebrow: 'Rueda acompañado',
    title: 'Clubes',
    description: 'Administra tus clubes, crea uno nuevo y participa en sus conversaciones y rodadas.',
    icon: Users,
    options: [
      {
        title: 'Mis clubes',
        description: 'Consulta los clubes a los que perteneces, sus miembros y la información de cada grupo.',
        to: '/app/clubs/manage',
        icon: Users,
        iconClass: 'bg-emerald-400 text-emerald-950',
        accent: 'from-emerald-500/20 to-emerald-500/5',
      },
      {
        title: 'Crear y administrar',
        description: 'Crea un club, edita su perfil, gestiona miembros y define tu club principal.',
        to: '/app/clubs/manage?action=create',
        icon: PlusCircle,
        iconClass: 'bg-moto-orange text-moto-darker',
        accent: 'from-moto-orange/25 to-moto-orange/5',
      },
      {
        title: 'Actividad de clubes',
        description: 'Comparte mensajes y rutas en los espacios privados de los clubes a los que perteneces.',
        to: '/app/messages',
        icon: MessageCircle,
        iconClass: 'bg-violet-400 text-violet-950',
        accent: 'from-violet-500/20 to-violet-500/5',
      },
    ],
  },
}

export function SectionMenu({ kind }: { kind: SectionMenuKind }) {
  const section = sectionMenus[kind]
  const SectionIcon = section.icon

  return (
    <div className="mx-auto min-h-[calc(100dvh-4rem)] max-w-6xl p-4 pb-24 sm:p-6 lg:pb-8">
      <header className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-moto-orange text-moto-darker sm:h-16 sm:w-16">
            <SectionIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moto-orange">{section.eyebrow}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-4xl">{section.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">{section.description}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {section.options.map((option) => (
          <Link
            key={option.title}
            to={option.to}
            className={`group flex min-h-48 flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br ${option.accent} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-moto-orange focus:ring-offset-2 focus:ring-offset-moto-dark sm:p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${option.iconClass}`}>
                <option.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500 transition group-hover:translate-x-1 group-hover:text-white" aria-hidden="true" />
            </div>
            <div className="mt-7">
              <h2 className="text-xl font-bold">{option.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">{option.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
