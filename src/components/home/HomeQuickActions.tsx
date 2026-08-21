import { BookOpen, Compass, MapPinned, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
  { label: 'Registrar mantenimiento', detail: 'Guarda un servicio realizado', to: '/app/my-bikes?action=add-maintenance#history', icon: Wrench, primary: true },
  { label: 'Salir de ruta', detail: 'Prepara tu próximo recorrido', to: '/app/map', icon: MapPinned, primary: false },
  { label: 'Explorar lugares', detail: 'Descubre rutas de la comunidad', to: '/app/explore', icon: Compass, primary: false },
  { label: 'Ver mi historia', detail: 'Consulta la hoja de vida', to: '/app/my-bikes#history', icon: BookOpen, primary: false },
] as const

export function HomeQuickActions() {
  return <section aria-labelledby="quick-actions-title"><div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-moto-orange">A un toque</p><h2 id="quick-actions-title" className="mt-1 text-xl font-bold">Acciones rápidas</h2></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">{actions.map((action) => <Link key={action.label} to={action.to} className={`group flex min-h-36 flex-col justify-between rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-moto-orange lg:min-h-0 lg:flex-row lg:items-center lg:justify-start lg:gap-4 ${action.primary ? 'border-moto-orange/40 bg-moto-orange text-moto-darker hover:bg-moto-orange-light' : 'border-white/10 bg-moto-gray hover:border-white/20 hover:bg-white/[0.06]'}`}>
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${action.primary ? 'bg-moto-darker/15' : 'bg-white/[0.06] text-moto-orange'}`}><action.icon className="h-5 w-5" aria-hidden="true" /></div>
      <div className="mt-4 min-w-0 lg:mt-0"><h3 className="text-sm font-bold leading-5 sm:text-base">{action.label}</h3><p className={`mt-1 hidden text-xs leading-5 sm:block ${action.primary ? 'text-moto-darker/75' : 'text-gray-400'}`}>{action.detail}</p></div>
    </Link>)}</div>
  </section>
}
