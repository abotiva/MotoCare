-- MotoCare profile primary motorcycle
-- Run this once in Supabase SQL Editor.

alter table public.profiles
add column if not exists primary_motorcycle_id uuid references public.motorcycles(id) on delete set null;
