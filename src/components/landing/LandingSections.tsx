import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bike,
  CalendarCheck,
  Check,
  CircleDollarSign,
  FileClock,
  FileText,
  History,
  LockKeyhole,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const signupPath = '/login?mode=signup'

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-moto-orange">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {description && <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">{description}</p>}
    </div>
  )
}

function IconCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-moto-gray/80 p-6 transition hover:-translate-y-1 hover:border-moto-orange/40">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-moto-orange/15 text-moto-orange">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-gray-400">{description}</p>
    </article>
  )
}

export function HeroSection() {
  const alerts = [
    { icon: FileClock, text: 'SOAT vence en 18 días', tone: 'text-amber-300' },
    { icon: Wrench, text: 'Cambio de aceite en 420 km', tone: 'text-moto-orange' },
    { icon: AlertTriangle, text: 'Cadena requiere lubricación', tone: 'text-red-300' },
  ]
  return (
    <section id="inicio" className="relative flex min-h-dvh items-center overflow-hidden pb-16 pt-28">
      <img src="/hero-motorcycle.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-moto-darker via-moto-dark/95 to-moto-dark/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-moto-dark via-transparent to-moto-darker/40" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-moto-orange/30 bg-moto-orange/10 px-4 py-2 text-sm font-semibold text-moto-orange-light">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Tu moto. Tu historia. Tu ruta.
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-7xl">
            Toda la historia de tu moto, <span className="text-gradient">siempre contigo.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
            Registra mantenimientos, controla tus documentos y recibe recordatorios antes de que algo importante se venza.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-moto-orange px-7 font-bold text-moto-darker hover:bg-moto-orange-dark">
              <Link to={signupPath}>Crear mi cuenta gratis <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-black/20 text-white hover:bg-white/10">
              <Link to="/login">Ya tengo una cuenta</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/15 bg-moto-darker/85 p-4 shadow-2xl shadow-moto-orange/10 backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-moto-orange">Mi garaje</p>
              <h2 className="mt-1 text-xl font-bold">Dominar 400 · 2024</h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-moto-orange/15 text-moto-orange">
              <Bike aria-hidden="true" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {alerts.map(({ icon: Icon, text, tone }) => (
              <div key={text} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
                <span className="text-sm font-medium sm:text-base">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-moto-orange px-4 py-3 text-moto-darker">
            <span className="font-bold">Estado general</span>
            <span className="rounded-full bg-moto-darker/15 px-3 py-1 text-sm font-bold">Al día</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ProblemSection() {
  const problems = [
    [Wrench, 'Mantenimientos olvidados.'],
    [FileClock, 'Documentos vencidos.'],
    [ReceiptText, 'Gastos sin control.'],
    [History, 'Historial perdido.'],
  ] as const
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Todo en su lugar" title="Tu moto tiene una historia. No debería estar repartida entre facturas, chats y recuerdos." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(([Icon, label]) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-red-300/10 bg-red-300/[0.04] p-5">
              <Icon className="h-6 w-6 shrink-0 text-red-300" aria-hidden="true" />
              <p className="font-semibold text-gray-200">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorksSection() {
  const steps = [
    ['01', Bike, 'Registra tu moto.', 'Agrega los datos esenciales y crea su perfil digital.'],
    ['02', FileText, 'Agrega su historial y documentos.', 'Organiza servicios, facturas y fechas importantes.'],
    ['03', BellRing, 'Recibe alertas y mantén todo bajo control.', 'Anticípate a vencimientos y próximos mantenimientos.'],
  ] as const
  return (
    <section id="como-funciona" className="bg-moto-darker/70 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Cómo funciona" title="Tres pasos para cuidar mejor tu moto." />
        <div className="grid gap-5 lg:grid-cols-3">
          {steps.map(([number, Icon, title, description]) => (
            <article key={number} className="relative rounded-2xl border border-white/10 bg-moto-gray p-6 sm:p-8">
              <span className="absolute right-6 top-4 text-5xl font-black text-white/5">{number}</span>
              <Icon className="h-8 w-8 text-moto-orange" aria-hidden="true" />
              <h3 className="mt-8 text-xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-gray-400">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const features = [
    [History, 'Hoja de vida', 'Toda la historia de tu moto organizada y disponible cuando la necesites.'],
    [Wrench, 'Mantenimientos', 'Registra trabajos, kilometraje, fechas y costos de cada servicio.'],
    [BellRing, 'Recordatorios', 'Recibe avisos para actuar antes de un vencimiento o servicio.'],
    [FileText, 'Documentos', 'Mantén SOAT, tecnomecánica y soportes importantes en un solo lugar.'],
  ] as const
  return (
    <section id="funcionalidades" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Funcionalidades" title="Lo esencial para tener tu moto al día." description="Empieza gratis con las herramientas que necesitas para construir y conservar su historia." />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map(([icon, title, description]) => <IconCard key={title} icon={icon} title={title} description={description} />)}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="outline" className="border-moto-orange/40 bg-transparent text-moto-orange hover:bg-moto-orange/10">
            <Link to={signupPath}>Conocer MotoCare <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function BenefitsSection() {
  const benefits = [
    [CalendarCheck, 'Evita vencimientos.', 'Recuerda las fechas importantes antes de que se conviertan en un problema.'],
    [CircleDollarSign, 'Planea tus gastos.', 'Entiende en qué inviertes y prepárate para el próximo mantenimiento.'],
    [ShieldCheck, 'Conserva el valor de tu moto.', 'Un historial ordenado respalda el cuidado que le has dado.'],
    [MapPinned, 'Lleva el historial donde vayas.', 'Consulta la información de tu moto desde cualquier lugar.'],
  ] as const
  return (
    <section className="bg-gradient-to-b from-moto-darker to-moto-dark py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Beneficios" title="Más tranquilidad en cada kilómetro." />
        <div className="grid gap-5 md:grid-cols-2">
          {benefits.map(([Icon, title, description]) => (
            <article key={title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <Icon className="h-7 w-7 shrink-0 text-moto-orange" aria-hidden="true" />
              <div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 leading-7 text-gray-400">{description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  const plans = [
    {
      name: 'Free',
      description: 'Para empezar la historia digital de tu moto.',
      features: ['Una moto', 'Hoja de vida', 'Mantenimientos', 'Recordatorios básicos', 'Documentos'],
      upcoming: [] as string[],
    },
    {
      name: 'Premium',
      description: 'Para motociclistas que quieren ir más lejos.',
      features: [] as string[],
      upcoming: ['Varias motos', 'Informes avanzados', 'Rutas', 'Clubes', 'Comunidad', 'Exportación del historial'],
    },
  ]
  return (
    <section id="planes" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Planes" title="Empieza gratis. Crece a tu ritmo." />
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className={`rounded-3xl border p-6 sm:p-8 ${plan.name === 'Free' ? 'border-moto-orange bg-moto-orange/[0.06]' : 'border-white/10 bg-moto-gray'}`}>
              <div className="flex items-start justify-between gap-4">
                <div><h3 className="text-3xl font-bold">{plan.name}</h3><p className="mt-2 text-gray-400">{plan.description}</p></div>
                {plan.name === 'Free' && <Badge className="bg-moto-orange text-moto-darker hover:bg-moto-orange">Disponible</Badge>}
              </div>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => <li key={feature} className="flex gap-3"><Check className="h-5 w-5 shrink-0 text-moto-orange" /><span>{feature}</span></li>)}
                {plan.upcoming.map((feature) => (
                  <li key={feature} className="flex items-center justify-between gap-3 text-gray-300">
                    <span className="flex gap-3"><Check className="h-5 w-5 shrink-0 text-gray-500" />{feature}</span>
                    <Badge variant="outline" className="border-white/15 text-[10px] text-gray-400">Próximamente</Badge>
                  </li>
                ))}
              </ul>
              {plan.name === 'Free' && <Button asChild className="mt-8 w-full bg-moto-orange text-moto-darker hover:bg-moto-orange-dark"><Link to={signupPath}>Crear mi cuenta gratis</Link></Button>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SecuritySection() {
  return (
    <section className="px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-3xl border border-moto-orange/20 bg-moto-orange/[0.06] p-7 text-center sm:flex-row sm:p-10 sm:text-left">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-moto-orange text-moto-darker"><LockKeyhole aria-hidden="true" /></div>
        <div><h2 className="text-2xl font-bold">Tu historia también merece protección.</h2><p className="mt-2 leading-7 text-gray-300">Tu información permanece asociada a tu cuenta y protegida mediante autenticación segura.</p></div>
      </div>
    </section>
  )
}

export function FaqSection() {
  const faqs = [
    ['¿MotoCare es gratis?', 'Sí. El plan Free te permite registrar una moto y usar hoja de vida, mantenimientos, recordatorios básicos y documentos.'],
    ['¿Puedo registrar más de una moto?', 'El plan Free incluye una moto. La gestión de varias motos estará disponible en Premium próximamente.'],
    ['¿Qué documentos puedo guardar?', 'Puedes organizar documentos importantes como SOAT, revisión tecnomecánica y soportes relacionados con tu moto.'],
    ['¿Cómo funcionan los recordatorios?', 'Registra una fecha o kilometraje objetivo y MotoCare te ayuda a anticipar el próximo vencimiento o mantenimiento.'],
    ['¿Mis datos están protegidos?', 'Sí. Tu información permanece asociada a tu cuenta y el acceso se protege mediante autenticación segura.'],
  ]
  return (
    <section id="preguntas" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Respuestas para empezar con confianza." />
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map(([question, answer], index) => (
            <AccordionItem key={question} value={`item-${index}`} className="rounded-xl border border-white/10 bg-moto-gray px-5">
              <AccordionTrigger className="text-left text-base hover:text-moto-orange hover:no-underline">{question}</AccordionTrigger>
              <AccordionContent className="pr-6 leading-7 text-gray-400">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-moto-orange/20 via-moto-dark to-moto-orange-dark/10" />
      <div className="relative mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-moto-orange">Tu próxima ruta empieza aquí</p>
        <h2 className="mt-4 text-3xl font-bold sm:text-5xl">Empieza hoy la historia digital de tu moto.</h2>
        <Button asChild size="lg" className="mt-8 bg-moto-orange px-8 font-bold text-moto-darker hover:bg-moto-orange-dark">
          <Link to={signupPath}>Crear mi cuenta gratis <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </Button>
      </div>
    </section>
  )
}
