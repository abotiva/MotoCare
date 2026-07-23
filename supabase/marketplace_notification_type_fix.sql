-- Hotfix for installations where marketplace_sales_contact_migration.sql
-- was executed before marketplace_message was added to the notification types.

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in (
  'route_planned',
  'route_overdue',
  'club_invite',
  'moderation_notice',
  'admin_review',
  'marketplace_message'
));
