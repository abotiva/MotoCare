-- Allow authenticated MotoCare administrators to manage the maintenance catalog.

drop policy if exists "maintenance_suggestions_admin_write" on public.maintenance_suggestions;
create policy "maintenance_suggestions_admin_write" on public.maintenance_suggestions
for all
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

