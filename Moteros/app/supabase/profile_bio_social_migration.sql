-- MotoCare profile bio and social link
-- Run this once in Supabase SQL Editor.

alter table public.profiles
add column if not exists bio text,
add column if not exists social_url text;
