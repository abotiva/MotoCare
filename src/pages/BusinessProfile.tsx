import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Store } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import type { MarketplaceListing, Profile } from '@/types/database'

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

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 pb-24 lg:p-6">
      <Button asChild variant="ghost" className="px-0 text-gray-300"><Link to="/app/marketplace"><ArrowLeft className="mr-2 h-4 w-4" />Volver a servicios</Link></Button>
      <Card className="border-violet-500/25 bg-moto-gray py-0"><CardContent className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar className="h-24 w-24 bg-moto-darker"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><Badge className="bg-violet-500/20 text-violet-200">Negocio Business</Badge><h1 className="mt-3 text-3xl font-bold">{name}</h1>{profile.bio ? <p className="mt-2 text-gray-300">{profile.bio}</p> : null}</div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {profile.business_phone ? <a href={`tel:${profile.business_phone}`} className="flex items-center gap-2 rounded-xl bg-moto-darker p-3 text-moto-orange"><Phone className="h-4 w-4" />{profile.business_phone}</a> : null}
          <div className="flex items-center gap-2 rounded-xl bg-moto-darker p-3 text-gray-300"><MapPin className="h-4 w-4 text-moto-orange" />{profile.business_address || profile.city || 'Ubicación sin definir'}</div>
        </div>
      </CardContent></Card>
      {profile.business_latitude !== null && profile.business_longitude !== null ? <iframe title={`Ubicación de ${name}`} className="h-72 w-full rounded-2xl border-0" loading="lazy" src={`https://www.google.com/maps?q=${profile.business_latitude},${profile.business_longitude}&z=15&output=embed`} /> : null}
      <section><h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Store className="h-5 w-5 text-moto-orange" />Servicios publicados</h2><div className="grid gap-3 sm:grid-cols-2">{services.map((service) => <Card key={service.id} className="border-white/5 bg-moto-gray py-0"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{service.title}</h3>{service.service_status === 'promotion' ? <Badge className="bg-fuchsia-600">Promoción</Badge> : null}</div><p className="mt-2 line-clamp-3 text-sm text-gray-400">{service.description}</p></CardContent></Card>)}</div></section>
    </div>
  )
}
