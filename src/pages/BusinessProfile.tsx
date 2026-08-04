import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MapPin, Phone, Store } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { MarketplaceListing, Profile, ServiceCategory } from '@/types/database'

const serviceCategoryLabels: Record<ServiceCategory, string> = {
  tow: 'Grúa',
  mechanic: 'Taller de mecánica',
  tire_shop: 'Montallantas',
  car_wash: 'Lavadero',
  route_guide: 'Guía de ruta',
}

function mapUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
}

export function BusinessProfile() {
  const { businessId } = useParams<{ businessId: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<MarketplaceListing[]>([])

  useEffect(() => {
    if (!supabase || !businessId) return
    void Promise.all([
      supabase.from('profiles').select('*').eq('id', businessId).single(),
      supabase.from('marketplace_listings').select('*').eq('seller_id', businessId).eq('status', 'active').in('service_status', ['active', 'promotion']).order('published_at', { ascending: false }),
    ]).then(([profileResult, servicesResult]) => {
      if (!profileResult.error) setProfile(profileResult.data as Profile)
      if (!servicesResult.error) setServices((servicesResult.data ?? []) as MarketplaceListing[])
    })
  }, [businessId])

  if (!profile) return <div className="grid min-h-64 place-items-center text-gray-400">Cargando perfil comercial...</div>

  const name = profile.full_name || profile.username || 'Negocio MotoCare'
  const businessCoordinates = profile.business_latitude !== null && profile.business_longitude !== null
    ? `${profile.business_latitude},${profile.business_longitude}`
    : null
  const businessLocation = [profile.business_address, profile.city, 'Colombia'].filter(Boolean).join(', ')
  const businessMapQuery = businessCoordinates || businessLocation

  return (
    <div className="mx-auto max-w-5xl space-y-5 overflow-x-hidden p-4 pb-24 lg:p-6">
      <Button asChild variant="ghost" className="px-0 text-gray-300">
        <Link to="/app/marketplace"><ArrowLeft className="mr-2 h-4 w-4" />Volver a servicios</Link>
      </Button>

      <Card className="border-violet-500/25 bg-moto-gray py-0">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 bg-moto-darker">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Badge className="bg-violet-500/20 text-violet-200">Negocio Business</Badge>
              <h1 className="mt-3 break-words text-3xl font-bold">{name}</h1>
              {profile.bio ? <p className="mt-2 whitespace-pre-line text-gray-300">{profile.bio}</p> : null}
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {profile.business_phone ? <a href={`tel:${profile.business_phone}`} className="flex items-center gap-2 rounded-xl bg-moto-darker p-3 text-moto-orange"><Phone className="h-4 w-4 shrink-0" /><span className="break-all">{profile.business_phone}</span></a> : null}
            <div className="flex items-center gap-2 rounded-xl bg-moto-darker p-3 text-gray-300"><MapPin className="h-4 w-4 shrink-0 text-moto-orange" /><span>{profile.business_address || profile.city || 'Ubicación sin definir'}</span></div>
            {profile.social_url ? <a href={profile.social_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-moto-darker p-3 text-moto-orange sm:col-span-2"><ExternalLink className="h-4 w-4 shrink-0" /><span className="truncate">Sitio web o red social</span></a> : null}
          </div>
        </CardContent>
      </Card>

      {businessMapQuery ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><MapPin className="h-5 w-5 text-moto-orange" />Ubicación del negocio</h2>
          <iframe title={`Ubicación de ${name}`} className="h-72 w-full rounded-2xl border-0" loading="lazy" src={mapUrl(businessMapQuery)} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Store className="h-5 w-5 text-moto-orange" />Servicios publicados</h2>
        {services.length === 0 ? <p className="rounded-2xl bg-moto-gray p-5 text-gray-400">Este negocio aún no tiene servicios activos.</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => {
            const serviceLocation = [service.city, service.department, 'Colombia'].filter(Boolean).join(', ')
            const serviceMapQuery = serviceLocation || businessMapQuery
            return (
              <Card key={service.id} className="min-w-0 overflow-hidden border-white/5 bg-moto-gray py-0">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="min-w-0 break-words font-semibold">{service.title}</h3>
                      {service.service_status === 'promotion' ? <Badge className="bg-fuchsia-600">Promoción</Badge> : <Badge className="bg-green-500/15 text-green-300">Activo</Badge>}
                    </div>
                    {service.service_category ? <Badge className="mt-3 bg-white/10 text-gray-200">{serviceCategoryLabels[service.service_category]}</Badge> : null}
                    <p className="mt-3 whitespace-pre-line text-sm text-gray-300">{service.description}</p>
                    <div className="mt-3 flex items-start gap-2 text-sm text-gray-400"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moto-orange" /><span>{serviceLocation || profile.business_address || profile.city || 'Ubicación sin definir'}</span></div>
                  </div>
                  {serviceMapQuery ? <iframe title={`Ubicación de ${service.title}`} className="h-56 w-full border-0" loading="lazy" src={mapUrl(serviceMapQuery)} /> : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
