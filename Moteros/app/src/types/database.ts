export type Profile = {
  id: string
  full_name: string | null
  username: string | null
  city: string | null
  rider_type: string | null
  bio: string | null
  social_url: string | null
  avatar_url: string | null
  primary_motorcycle_id: string | null
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

export type MaintenanceSuggestion = {
  id: string
  code: string
  name: string
  category: string
  description: string | null
  recommended_interval_km: number | null
  recommended_interval_days: number | null
  applies_to: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RoutePlan = {
  id: string
  owner_id: string
  title: string
  origin: string | null
  destination: string | null
  distance_km: number | null
  duration_minutes: number | null
  start_date: string | null
  end_date: string | null
  visibility: 'private' | 'community'
  status: 'planned' | 'in_progress' | 'completed'
  created_at: string
}

export type RouteWithOwner = RoutePlan & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
}

export type SavedRoute = {
  route_id: string
  user_id: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: 'route_planned' | 'route_overdue'
  title: string
  message: string
  route_id: string | null
  scheduled_for: string
  read_at: string | null
  created_at: string
  routes?: {
    title: string
    start_date: string | null
    end_date: string | null
    status: RoutePlan['status']
  } | null
}

export type Club = {
  id: string
  owner_id: string
  name: string
  description: string | null
  city: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type ClubMember = {
  id: string
  club_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export type ClubMemberWithProfile = ClubMember & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
}

export type ClubWithMembership = Club & {
  club_members: Array<{
    role: ClubMember['role']
    user_id: string
  }>
}

export type ClubPost = {
  id: string
  club_id: string
  author_id: string
  content: string
  created_at: string
}

export type ClubPostWithAuthor = ClubPost & {
  profiles: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
  clubs: {
    name: string
    image_url: string | null
  } | null
}

export type Post = {
  id: string
  author_id: string
  content: string
  image_url: string | null
  route_id: string | null
  created_at: string
}

export type PostWithAuthor = Post & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
  routes: RoutePlan | null
  post_images: PostImage[]
}

export type PostImage = {
  id: string
  post_id: string
  owner_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export type PostComment = {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
}

export type PostCommentWithAuthor = PostComment & {
  profiles: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

export type MotorcycleDocument = {
  id: string
  motorcycle_id: string
  owner_id: string
  document_type: 'soat' | 'technical_review' | 'other'
  file_name: string
  file_path: string
  mime_type: string | null
  created_at: string
}
