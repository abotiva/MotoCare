import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  MapPin,
  Menu,
  Route,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotoCareLogo } from '@/components/MotoCareLogo'

const featureCards = [
  { icon: ShieldCheck, title: 'Confianza', desc: 'Tu moto siempre bajo control.', path: '/app/my-bikes' },
  { icon: Clock3, title: 'Inteligencia', desc: 'Recordatorios que te cuidan.', path: '/app/my-bikes' },
  { icon: Route, title: 'Libertad', desc: 'Vive, registra y comparte tu ruta.', path: '/app/map' },
  { icon: Wrench, title: 'Mantenimiento', desc: 'Historial claro de cada servicio.', path: '/app/my-bikes' },
  { icon: ShoppingBag, title: 'Marketplace', desc: 'Compra y vende motos y repuestos.', path: '/app/marketplace' },
  { icon: MapPin, title: 'Rutas', desc: 'Descubre caminos de la comunidad.', path: '/app/explore' },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const enterApp = () => navigate('/app/home')

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-moto-dark text-white">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? 'border-b border-white/5 bg-moto-dark/90 backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between lg:h-20">
            <MotoCareLogo />

            <div className="hidden items-center gap-8 lg:flex">
              <button onClick={() => scrollToSection('features')} className="text-sm text-gray-300 transition-colors hover:text-white">
                Esencia
              </button>
              <button onClick={() => scrollToSection('product')} className="text-sm text-gray-300 transition-colors hover:text-white">
                App
              </button>
              <button onClick={() => scrollToSection('community')} className="text-sm text-gray-300 transition-colors hover:text-white">
                Comunidad
              </button>
            </div>

            <div className="hidden items-center gap-4 lg:flex">
              <Button variant="ghost" className="text-sm" onClick={enterApp}>
                Explorar
              </Button>
              <Button className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={enterApp}>
                Entrar a la App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <button className="p-2 lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-white/5 bg-moto-dark/95 backdrop-blur-xl lg:hidden">
            <div className="space-y-4 px-4 py-6">
              <button onClick={() => scrollToSection('features')} className="block w-full py-2 text-left text-gray-300">
                Esencia
              </button>
              <button onClick={() => scrollToSection('product')} className="block w-full py-2 text-left text-gray-300">
                App
              </button>
              <button onClick={() => scrollToSection('community')} className="block w-full py-2 text-left text-gray-300">
                Comunidad
              </button>
              <Button className="w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark" onClick={enterApp}>
                Entrar a la App
              </Button>
            </div>
          </div>
        )}
      </nav>

      <section className="relative flex min-h-[92vh] items-center overflow-hidden pb-16 pt-24">
        <div className="absolute inset-0">
          <img src="/hero-motorcycle.jpg" alt="Motociclista en ruta de montana" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-dark/85 to-moto-dark/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-moto-dark via-transparent to-moto-darker/40" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-moto-orange/30 bg-moto-orange/15 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-moto-orange" />
              <span className="text-sm font-medium text-moto-orange-light">Tu moto. Tu historia. Tu ruta.</span>
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-7xl">
                Cuida tu moto, vive tu <span className="text-gradient">ruta</span>.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-gray-300">
                MotoCare es la app inteligente que te ayuda a cuidar tu moto, registrar cada momento
                y disfrutar cada kilometro con tranquilidad.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="bg-moto-orange px-8 text-moto-darker hover:bg-moto-orange-dark animate-pulse-glow" onClick={enterApp}>
                <ArrowRight className="mr-2 h-5 w-5" />
                Comenzar
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10" onClick={() => scrollToSection('features')}>
                Ver esencia
              </Button>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                ['Cuida', 'Mantenimiento claro'],
                ['Registra', 'Historial y rutas'],
                ['Disfruta', 'Comunidad motera'],
              ].map(([value, label]) => (
                <div key={value}>
                  <div className="text-xl font-bold text-moto-orange sm:text-2xl">{value}</div>
                  <div className="mt-1 text-xs text-gray-400 sm:text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div id="product" className="hidden items-center justify-center lg:flex">
            <div className="relative animate-float">
              <img src="/app-mockup.jpg" alt="MotoCare App" className="max-h-[680px] rounded-[2rem] shadow-2xl shadow-moto-orange/20" />
              <div className="glass absolute -bottom-6 -left-6 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-moto-orange">
                    <ShieldCheck className="h-6 w-6 text-moto-darker" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Moto bajo control</div>
                    <div className="text-xs text-gray-400">recordatorios activos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-moto-orange">Esencia de marca</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              Confianza, inteligencia y <span className="text-gradient">libertad</span>.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <button
                key={feature.title}
                onClick={() => navigate(feature.path)}
                className="group rounded-2xl border border-white/5 bg-moto-gray p-6 text-left transition-all duration-300 hover:border-moto-orange/50"
              >
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-moto-orange/20 transition-colors group-hover:bg-moto-orange/30">
                  <feature.icon className="h-7 w-7 text-moto-orange" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
                <div className="mt-4 flex items-center text-sm text-moto-orange opacity-0 transition-opacity group-hover:opacity-100">
                  <span>Explorar</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-moto-orange/20 to-moto-orange-dark/20" />
        <div className="absolute inset-0 bg-moto-dark/80" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Deja tu huella en cada <span className="text-gradient">kilometro</span>.
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-300">
            Entra a MotoCare y empieza con lo esencial: tu moto, tus mantenimientos, tus rutas y tu comunidad.
          </p>

          <Button size="lg" className="bg-moto-orange px-10 py-6 text-lg text-moto-darker hover:bg-moto-orange-dark" onClick={enterApp}>
            <ArrowRight className="mr-2 h-6 w-6" />
            Entrar a la App
          </Button>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-moto-darker py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <MotoCareLogo />
          <p className="text-sm text-gray-500">(c) 2026 MotoCare. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-500">Tu moto. Tu historia. Tu ruta.</p>
        </div>
      </footer>
    </div>
  )
}
