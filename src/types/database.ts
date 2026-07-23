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
  primary_club_id: string | null
  is_public: boolean
  moderation_status?: 'active' | 'suspended' | 'deleted'
  moderation_until?: string | null
  moderation_reason?: string | null
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

export type UserPlan = 'free' | 'pro' | 'premium' | 'business'

export type UserPlanStatus = 'active' | 'trialing' | 'past_due' | 'canceled'

export type UserSubscription = {
  user_id: string
  plan: UserPlan
  status: UserPlanStatus
  expires_at: string | null
  updated_at: string | null
}

export type MarketplaceCategory = 'motorcycles' | 'parts' | 'gear' | 'services' | 'premium-routes' | 'packs'

export type MarketplaceCondition = 'new' | 'used_like_new' | 'used_good' | 'used_fair' | 'service' | 'digital'

export type MarketplaceListingStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'sold' | 'rejected' | 'archived'

export type MarketplaceListingImage = {
  id: string
  listing_id: string
  owner_id: string
  image_url: string
  storage_path: string | null
  sort_order: number
  created_at: string
}

export type MarketplaceListing = {
  id: string
  seller_id: string
  category: MarketplaceCategory
  seller_type: 'personal' | 'business'
  title: string
  description: string
  price: number
  original_price: number | null
  currency: 'COP'
  condition: MarketplaceCondition
  mileage_km: number | null
  city: string | null
  department: string | null
  status: MarketplaceListingStatus
  is_featured: boolean
  published_at: string | null
  sold_at: string | null
  created_at: string
  updated_at: string
}

export type MarketplaceListingWithSeller = MarketplaceListing & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
  marketplace_listing_images: MarketplaceListingImage[]
}

export type MarketplaceMessage = {
  id: string
  listing_id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
  marketplace_listings: {
    id: string
    title: string
    seller_id: string
    status: MarketplaceListingStatus
  } | null
  sender: {
    full_name: string | null
    username: string | null
  } | null
  recipient: {
    full_name: string | null
    username: string | null
  } | null
}

export type MarketplacePublicationQuota = {
  plan: 'free' | 'premium' | 'business'
  used_publications: number
  monthly_limit: number | null
  remaining_publications: number | null
  can_publish: boolean
  period_start: string
  period_end: string
}

export type AdminReviewCounts = {
  marketplace_pending: number
  moderation_pending: number
}

export type AdminMarketplaceListing = {
  id: string
  seller_id: string
  seller_name: string
  seller_type: 'personal' | 'business'
  seller_plan: 'free' | 'premium' | 'business'
  category: MarketplaceCategory
  title: string
  description: string
  price: number
  currency: 'COP'
  condition: MarketplaceCondition
  mileage_km: number | null
  city: string | null
  department: string | null
  status: MarketplaceListingStatus
  moderation_notes: string | null
  submitted_at: string
  images: Array<{
    id: string
    image_url: string
    sort_order: number
  }>
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
  motorcycle_id: string | null
  title: string
  origin: string | null
  destination: string | null
  distance_km: number | null
  duration_minutes: number | null
  start_date: string | null
  end_date: string | null
  visibility: 'private' | 'community'
  status: 'planned' | 'in_progress' | 'completed'
  track_geojson: import('@/lib/gpx').RouteTrack | null
  created_at: string
}

export type RouteWithOwner = RoutePlan & {
  profiles: {
    full_name: string | null
    username: string | null
    city: string | null
    avatar_url: string | null
  } | null
  motorcycles?: {
    id: string
    brand: string
    model: string
    plate: string | null
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
  type: 'route_planned' | 'route_overdue' | 'club_invite' | 'moderation_notice' | 'admin_review'
  title: string
  message: string
  route_id: string | null
  club_invitation_id: string | null
  scheduled_for: string
  read_at: string | null
  created_at: string
  routes?: {
    id?: string
    title: string
    start_date: string | null
    end_date: string | null
    status: RoutePlan['status']
  } | null
  club_invitations?: ClubInvitationWithClub | null
}

export type Club = {
  id: string
  owner_id: string
  name: string
  description: string | null
  city: string | null
  image_url: string | null
  moderation_status?: 'active' | 'suspended' | 'deleted'
  moderation_until?: string | null
  moderation_reason?: string | null
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
    is_public?: boolean
  } | null
}

export type ClubInvitation = {
  id: string
  club_id: string
  invited_user_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  responded_at: string | null
}

export type ClubInvitationWithClub = ClubInvitation & {
  clubs: {
    id: string
    name: string
    image_url: string | null
    city: string | null
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
  route_id: string | null
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
  routes: RoutePlan | null
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

export type AdminOverview = {
  users: number
  public_users: number
  private_users: number
  free_users: number
  pro_users: number
  premium_users: number
  business_users?: number
  motorcycles: number
  routes: number
  community_routes: number
  posts: number
  clubs: number
  club_memberships: number
  pending_club_invitations: number
  maintenance_suggestions: number
  active_maintenance_suggestions: number
}

export type AdminUserRow = {
  id: string
  display_name: string | null
  username: string | null
  city: string | null
  rider_type: string | null
  is_public: boolean
  plan: UserPlan
  plan_status: UserPlanStatus
  plan_expires_at: string | null
  created_at: string
  motorcycles_count: number
  routes_count: number
  posts_count: number
  clubs_count: number
}

export type AdminClubRow = {
  id: string
  name: string
  city: string | null
  owner_display_name: string | null
  owner_is_public: boolean
  members_count: number
  posts_count: number
  pending_invitations_count: number
  created_at: string
}

export type AdminMaintenanceSuggestionRow = {
  id: string
  code: string
  name: string
  category: string
  recommended_interval_km: number | null
  recommended_interval_days: number | null
  applies_to: string
  sort_order: number
  is_active: boolean
  updated_at: string
}

export type ModerationReason = 'violence' | 'harassment' | 'spam' | 'promotion_without_business' | 'other'

export type ModerationReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned'

export type ModerationTargetType = 'user' | 'club' | 'post' | 'club_post'

export type ModerationActionType = 'warning' | 'temp_block' | 'delete'

export type AdminModerationReportRow = {
  id: string
  reporter_id: string
  reporter_display_name: string | null
  target_type: ModerationTargetType
  target_user_id: string | null
  target_user_display_name: string | null
  target_club_id: string | null
  target_club_name: string | null
  reason_category: ModerationReason
  details: string | null
  status: ModerationReportStatus
  resolution_notes: string | null
  created_at: string
  reviewed_at: string | null
}
