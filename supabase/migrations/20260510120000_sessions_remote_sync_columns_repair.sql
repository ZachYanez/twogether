-- Repair: sessions columns expected by createRemoteSession (from 20260409120000_shared_access_and_recurring_sessions).
-- Run if PostgREST reports missing columns (e.g. scope, profile_snapshot).

alter table public.sessions
  alter column couple_id drop not null;

alter table public.sessions
  add column if not exists template_id uuid,
  add column if not exists template_occurrence_key text,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'template', 'quick_start')),
  add column if not exists scope text not null default 'shared'
    check (scope in ('shared', 'solo')),
  add column if not exists short_session_mode boolean not null default false,
  add column if not exists warning_minutes_before jsonb not null default '[]'::jsonb,
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;

update public.sessions
set
  source = coalesce(source, 'manual'),
  scope = case when couple_id is null then 'solo' else coalesce(scope, 'shared') end,
  short_session_mode = coalesce(short_session_mode, false),
  warning_minutes_before = coalesce(warning_minutes_before, '[]'::jsonb),
  profile_snapshot = coalesce(profile_snapshot, '{}'::jsonb);
