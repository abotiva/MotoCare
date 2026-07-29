import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  Bike,
  CalendarClock,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  MapPinned,
  Menu,
  MessageCircle,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Users,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  ['Funcionalidades', 'funcionalidades'],
  ['Cómo funciona', 'como-funciona'],
  ['Planes', 'planes'],
  ['Preguntas frecuentes', 'faq'],
] as const

const coreFeatures = [
  { icon: Bike, title: 'Mi Garage', description: 'Organiza cada moto con una hoja de vida independiente y mantén siempre una principal en foco.' },
  { icon: Wrench, title: 'Historial de mantenimiento', description: 'Registra servicios, kilometraje, costos y soportes.' },
  { icon: CalendarClock, title: 'Próximos servicios', description: 'Anticipa mantenimientos por fecha o kilometraje.' },
  { icon: FileCheck2, title: 'Documentos y vencimientos', description: 'Controla SOAT, tecnomecánica y documentos de la moto.' },
  { icon: Receipt, title: 'Control de gastos', description: 'Entiende cuánto inviertes en el cuidado de tu moto.' },
]

const ecosystem = [
  { icon: MapPinned, title: 'Rutas', description: 'Planea recorridos y descubre nuevas experiencias.' },
  { icon: Users, title: 'Clubes', description: 'Conecta con grupos que comparten tu pasión.' },
  { icon: MessageCircle, title: 'Comunidad', description: 'Comparte historias, aprendizajes y recomendaciones.' },
  { icon: ShoppingBag, title: 'Tienda', description: 'Encuentra motos, repuestos, equipamiento y servicios.' },
]

const plans = [
  {
    name: 'Free',
    description: 'Para iniciar la hoja de vida de tu moto.',
    features: ['1 moto en Mi Garage', 'Historial de mantenimiento', 'Recordatorios por fecha y kilometraje', 'Control básico de documentos'],
  },
  {
    name: 'Premium',
    description: 'Más control sobre tus motos y más herramientas para vivir la comunidad.',
    features: ['Varias motos en Mi Garage', 'Elige tu moto principal', 'Informes de mantenimiento y gastos', 'Carga de archivos GPX', 'Creación de clubes y publicaciones', 'Acceso a experiencias y rutas Premium disponibles'],
    featured: true,
  },
  {
    name: 'Business',
    description: 'Para negocios que publican en el ecosistema.',
    features: ['Perfil comercial', 'Publicaciones comerciales', 'Gestión orientada a la tienda', 'Identificación visible como negocio'],
  },
]

const faqs = [
  ['¿MotoCare es gratis?', 'Sí. El plan Free permite empezar la hoja de vida, registrar mantenimientos y crear recordatorios.'],
  ['¿Puedo registrar más de una moto?', 'El plan Free incluye una moto. Con Premium puedes administrar varias motos y elegir cuál será la principal.'],
  ['¿Qué documentos puedo guardar?', 'Puedes controlar SOAT, revisión tecnomecánica y otros documentos. La carga de archivos privados requiere Premium.'],
  ['¿Cómo funcionan los recordatorios?', 'Puedes programarlos por fecha, kilometraje o ambos. MotoCare compara esos datos con el estado actual de la moto.'],
  ['¿Mis documentos son privados?', 'Sí. Los archivos se consultan mediante acceso autenticado y enlaces temporales, no mediante URLs públicas permanentes.'],
  ['¿Qué incluye Premium?', 'Incluye carga privada de documentos, informes, GPX y funciones ampliadas de clubes y publicaciones, según las restricciones actuales de la aplicación.'],
]

export function LandingPage() {
  const navigate = useNavigate()
  const { user, isLoading: isLoadingAuth } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-moto-dark text-white">
      <nav className={`fixed inset-x-0 top-0 z-50 border-b transition-colors ${scrolled ? 'border-white/10 bg-moto-dark/95 backdrop-blur-xl' : 'border-transparent bg-moto-dark/70'}`} aria-label="Navegación principal">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link to="/" aria-label="MotoCare, inicio"><MotoCareLogo /></Link>
          <div className="hidden items-center gap-7 lg:flex">
            {navItems.map(([label, id]) => <button key={id} type="button" onClick={() => scrollTo(id)} className="text-sm text-gray-300 hover:text-white">{label}</button>)}
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => navigate('/app/home')}>Continuar a MotoCare</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Iniciar sesión</Button>
                <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => navigate('/login?mode=signup')}>Registrarse</Button>
              </>
            )}
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/5 lg:hidden" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-moto-darker p-4 lg:hidden">
            {navItems.map(([label, id]) => <button key={id} type="button" onClick={() => scrollTo(id)} className="block min-h-11 w-full rounded-xl px-3 text-left text-gray-300 hover:bg-white/5">{label}</button>)}
            <div className="mt-3 grid gap-2">
              {user
                ? <Button className="bg-moto-orange text-moto-darker" onClick={() => navigate('/app/home')}>Continuar a MotoCare</Button>
                : <><Button variant="outline" onClick={() => navigate('/login')}>Iniciar sesión</Button><Button className="bg-moto-orange text-moto-darker" onClick={() => navigate('/login?mode=signup')}>Registrarse</Button></>}
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="relative overflow-hidden pb-16 pt-28 sm:pt-36 lg:pb-24">
          <div className="absolute inset-0"><img src="/hero-motorcycle.jpg" alt="" className="h-full w-full object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-dark/95 to-moto-dark/60" /></div>
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <p className="font-semibold text-moto-orange">Tu moto. Tu historia. Tu ruta.</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">Todo lo que vive un motero, en un solo lugar.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-300">Cuida tus motos, descubre nuevas rutas y comparte experiencias con clubes y moteros que viven la misma pasión.</p>
              <p className="mt-3 max-w-2xl text-sm font-medium text-gray-400">MotoCare conecta tu moto, tus rutas y tu comunidad.</p>
              <div className="mt-8 max-w-sm">
                {user ? (
                  <Button size="lg" className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => navigate('/app/home')}>Continuar a MotoCare <ArrowRight className="ml-2 h-5 w-5" /></Button>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-moto-darker/80 p-3 backdrop-blur">
                    <Button size="lg" disabled={isLoadingAuth} className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => navigate('/login')}>Iniciar sesión <ArrowRight className="ml-2 h-5 w-5" /></Button>
                    <Button size="lg" disabled={isLoadingAuth} variant="ghost" className="mt-2 w-full text-white hover:bg-white/5" onClick={() => navigate('/login?mode=signup')}>Registrarse</Button>
                  </div>
                )}
                <Button size="lg" variant="outline" className="mt-3 w-full border-white/20" onClick={() => scrollTo('pilares')}>Descubrir MotoCare</Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="overflow-hidden rounded-3xl border border-white/15 bg-moto-darker p-2 shadow-2xl shadow-moto-orange/10">
                <img src="/app-mockup.jpg" alt="Vista del dashboard de MotoCare con el estado de una moto" className="max-h-[32rem] w-full rounded-2xl object-cover object-top" />
              </div>
              <div className="absolute -bottom-5 left-4 rounded-2xl border border-white/10 bg-moto-darker/95 p-4 shadow-xl sm:-left-5">
                <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-moto-orange" />Moto al día</p><p className="mt-1 text-xs text-gray-400">Próximo servicio programado</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pilares" className="border-y border-white/5 bg-moto-darker py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center"><p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Un ecosistema para moteros</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Tu moto, tus rutas y tu comunidad conectadas.</h2></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: Bike, title: 'Mi Garage', description: 'Lleva el historial, los mantenimientos, documentos y gastos de tus motos.' },
                { icon: MapPinned, title: 'Rutas', description: 'Descubre recorridos, crea tus propias rutas y compártelas con otros moteros.' },
                { icon: Users, title: 'Comunidad', description: 'Únete a clubes, comparte experiencias y conecta con personas que viven la moto como tú.' },
              ].map((pillar) => <article key={pillar.title} className="rounded-3xl border border-white/5 bg-moto-dark p-6"><pillar.icon className="h-8 w-8 text-moto-orange" /><h3 className="mt-8 text-2xl font-bold">{pillar.title}</h3><p className="mt-3 leading-7 text-gray-400">{pillar.description}</p></article>)}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">El problema</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-5xl">La historia de tu moto no debería estar repartida entre facturas, chats y recuerdos.</h2>
            <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-5">
              {['Mantenimientos olvidados', 'Vencimientos inesperados', 'Facturas perdidas', 'Gastos sin control', 'Historial difícil de demostrar'].map((item) => <div key={item} className="rounded-2xl border border-white/5 bg-moto-darker p-4 text-sm text-gray-300">{item}</div>)}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-moto-darker py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">Cómo funciona</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                ['01', 'Registra tu moto', 'Agrega sus datos, kilometraje y documentos importantes.'],
                ['02', 'Construye su historia', 'Guarda mantenimientos, costos, notas y soportes.'],
                ['03', 'Recibe alertas', 'Anticipa servicios y vencimientos antes de que sean un problema.'],
              ].map(([number, title, description]) => <article key={number} className="rounded-3xl border border-white/5 bg-moto-dark p-6"><span className="text-3xl font-bold text-moto-orange">{number}</span><h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-2 text-gray-400">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Funcionalidades principales</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Todo lo importante para cuidar tu moto.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {coreFeatures.map((feature) => <article key={feature.title} className="rounded-3xl border border-white/5 bg-moto-darker p-6"><feature.icon className="h-7 w-7 text-moto-orange" /><h3 className="mt-8 text-lg font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-gray-400">{feature.description}</p></article>)}
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {['Evita vencimientos', 'Planea gastos', 'Conserva soportes', 'Facilita la venta', 'Consulta desde cualquier lugar'].map((benefit) => <p key={benefit} className="flex items-center gap-2 text-sm text-gray-300"><Check className="h-5 w-5 text-moto-orange" />{benefit}</p>)}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Ecosistema MotoCare</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Cuando quieras ir más lejos.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ecosystem.map((item) => <article key={item.title} className="rounded-2xl border border-white/5 bg-moto-darker p-5"><item.icon className="h-6 w-6 text-gray-400" /><h3 className="mt-6 font-bold">{item.title}</h3><p className="mt-2 text-sm text-gray-500">{item.description}</p></article>)}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
              { icon: Users, title: 'Tu club, siempre conectado.', description: 'Administra miembros, comparte rutas, publica avisos y mantén a tu comunidad informada.', cta: 'Explorar clubes' },
              { icon: MapPinned, title: 'La próxima ruta empieza aquí.', description: 'Encuentra recorridos recomendados, conoce sus detalles y guarda tus favoritos.', cta: 'Descubrir rutas' },
              { icon: MessageCircle, title: 'Rodar es mejor cuando se comparte.', description: 'Publica experiencias, comparte fotografías y conoce moteros cerca de ti.', cta: 'Conocer la comunidad' },
            ].map((item) => (
              <article key={item.title} className="flex flex-col rounded-3xl border border-white/5 bg-moto-darker p-6">
                <item.icon className="h-8 w-8 text-moto-orange" />
                <h2 className="mt-7 text-2xl font-bold">{item.title}</h2>
                <p className="mt-3 flex-1 leading-7 text-gray-400">{item.description}</p>
                <Button variant="outline" className="mt-7 w-full border-white/15" onClick={() => navigate('/login')}>{item.cta}</Button>
              </article>
            ))}
          </div>
        </section>

        <section id="planes" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center"><p className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Planes</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Elige cómo vivir MotoCare.</h2></div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => <article key={plan.name} className={`rounded-3xl border p-6 ${plan.featured ? 'border-moto-orange bg-moto-orange/10' : 'border-white/5 bg-moto-darker'}`}><div className="flex items-center justify-between"><h3 className="text-2xl font-bold">{plan.name}</h3>{plan.featured && <span className="rounded-full bg-moto-orange px-3 py-1 text-xs font-bold text-moto-darker">Más control</span>}</div><p className="mt-3 text-sm text-gray-400">{plan.description}</p><ul className="mt-8 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="h-5 w-5 shrink-0 text-moto-orange" />{feature}</li>)}</ul></article>)}
            </div>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-moto-darker text-gray-300"><tr><th className="p-4">Mi Garage</th><th className="p-4">Free</th><th className="p-4">Premium</th><th className="p-4">Business</th></tr></thead>
                <tbody className="divide-y divide-white/10">
                  <tr><th className="p-4 font-medium">Motos registradas</th><td className="p-4">1 moto</td><td className="p-4">Varias motos</td><td className="p-4">No disponible</td></tr>
                  <tr><th className="p-4 font-medium">Moto principal</th><td className="p-4">La única registrada</td><td className="p-4">Selección manual</td><td className="p-4">No aplica</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-moto-darker py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div><ShieldCheck className="h-10 w-10 text-moto-orange" /><h2 className="mt-5 text-3xl font-bold">Tu información sigue siendo tuya.</h2><p className="mt-4 leading-7 text-gray-400">MotoCare protege la hoja de vida con acceso autenticado. Los documentos privados se consultan mediante enlaces temporales y tú mantienes el control sobre tus datos.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">{[['Acceso autenticado', Bike], ['Información privada', ShieldCheck], ['Documentos temporales', FileText], ['Control del usuario', WalletCards]].map(([label, Icon]) => { const SecurityIcon = Icon as typeof Bike; return <div key={label as string} className="rounded-2xl bg-moto-dark p-4"><SecurityIcon className="h-5 w-5 text-moto-orange" /><p className="mt-4 font-semibold">{label as string}</p></div> })}</div>
          </div>
        </section>

        <section id="faq" className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-8 divide-y divide-white/10 rounded-3xl border border-white/10 bg-moto-darker px-5">
              {faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{question}<ChevronDown className="h-5 w-5 text-moto-orange transition-transform group-open:rotate-180" /></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-moto-orange/20 bg-moto-orange/10 p-8 text-center sm:p-14">
            <BellRing className="mx-auto h-10 w-10 text-moto-orange" /><h2 className="mt-5 text-3xl font-bold sm:text-5xl">Empieza hoy la historia de tu moto.</h2><p className="mx-auto mt-4 max-w-2xl text-gray-300">Controla mantenimientos, documentos y próximos servicios desde un solo lugar.</p><Button size="lg" className="mt-8 bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={() => navigate('/login?mode=signup')}>Crear cuenta gratis</Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-moto-darker py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <MotoCareLogo /><p className="text-sm text-gray-500">© 2026 MotoCare. Todos los derechos reservados.</p><p className="text-sm text-gray-500">Tu moto. Tu historia. Tu ruta.</p>
        </div>
      </footer>
    </div>
  )
}
