import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { MotoCareLogo } from '@/components/MotoCareLogo'
import { Button } from '@/components/ui/button'
import {
  BenefitsSection,
  FaqSection,
  FeaturesSection,
  FinalCta,
  HeroSection,
  HowItWorksSection,
  PricingSection,
  ProblemSection,
  SecuritySection,
} from '@/components/landing/LandingSections'

const navItems = [
  ['Funcionalidades', 'funcionalidades'],
  ['Cómo funciona', 'como-funciona'],
  ['Planes', 'planes'],
  ['Preguntas frecuentes', 'preguntas'],
] as const

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 32)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isMenuOpen])

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-moto-dark text-white">
      <header>
        <nav
          aria-label="Navegación principal"
          className={`fixed inset-x-0 top-0 z-50 border-b transition-all ${
            isScrolled || isMenuOpen
              ? 'border-white/10 bg-moto-darker/95 shadow-xl backdrop-blur-xl'
              : 'border-transparent bg-moto-darker/45 backdrop-blur-sm'
          }`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
            <button type="button" aria-label="Ir al inicio" onClick={() => scrollToSection('inicio')}>
              <MotoCareLogo />
            </button>

            <div className="hidden items-center gap-6 lg:flex">
              {navItems.map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="rounded-md px-1 py-2 text-sm text-gray-300 transition hover:text-moto-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild className="bg-moto-orange font-semibold text-moto-darker hover:bg-moto-orange-dark">
                <Link to="/login?mode=signup">Crear cuenta gratis</Link>
              </Button>
            </div>

            <button
              type="button"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange lg:hidden"
            >
              {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>

          {isMenuOpen && (
            <div id="mobile-navigation" className="border-t border-white/10 bg-moto-darker px-4 py-5 lg:hidden">
              <div className="mx-auto flex max-w-7xl flex-col gap-2">
                {navItems.map(([label, id]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollToSection(id)}
                    className="rounded-lg px-3 py-3 text-left text-gray-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moto-orange"
                  >
                    {label}
                  </button>
                ))}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>Iniciar sesión</Link>
                  </Button>
                  <Button asChild className="bg-moto-orange text-moto-darker hover:bg-moto-orange-dark">
                    <Link to="/login?mode=signup" onClick={() => setIsMenuOpen(false)}>Crear cuenta gratis</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <BenefitsSection />
        <PricingSection />
        <SecuritySection />
        <FaqSection />
        <FinalCta />
      </main>

      <footer className="border-t border-white/10 bg-moto-darker py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-end lg:px-8">
          <div>
            <MotoCareLogo />
            <p className="mt-3 text-sm text-gray-400">Tu moto. Tu historia. Tu ruta.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-gray-400 md:justify-end">
            {navItems.map(([label, id]) => (
              <button key={id} type="button" onClick={() => scrollToSection(id)} className="hover:text-moto-orange">
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 md:col-span-2 md:text-right">
            © {new Date().getFullYear()} MotoCare. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
