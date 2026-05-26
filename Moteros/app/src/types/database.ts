export type Profile = {
  id: string
  full_name: string | null
  username: string | null
  city: string | null
  rider_type: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Motorcycle = {
  id: string
  owner_id: string
  brand: string
  model: string
  year: number | null
  plate: string | null
  color: string | null
  mileage: number
  image_url: string | null
  soat_expires_on: string | null
  technical_review_expires_on: string | null
  created_at: string
  updated_at: string
}

export type MaintenanceRecord = {
  id: string
  motorcycle_id: string
  owner_id: string
  service_type: string
  service_date: string
  mileage: number
  cost: number | null
  notes: string | null
  created_at: string
}

export type Reminder = {
  id: string
  motorcycle_id: string
  owner_id: string
  title: string
  due_date: string | null
  due_mileage: number | null
  status: 'pending' | 'done' | 'dismissed'
  created_at: string
  completed_at: string | null
}
