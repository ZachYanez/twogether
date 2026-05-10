alter table public.profiles
  add column if not exists last_app_active_at timestamptz;

comment on column public.profiles.last_app_active_at is
  'Updated periodically while the mobile app is foregrounded; used for lightweight presence.';
