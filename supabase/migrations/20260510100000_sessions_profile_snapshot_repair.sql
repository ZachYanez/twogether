-- Repair: ensure sessions.profile_snapshot exists (PostgREST error if migration 20260409120000 was skipped).
alter table public.sessions
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;
