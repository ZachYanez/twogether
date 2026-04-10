create table public.user_subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  source text not null default 'revenuecat'
    check (source in ('revenuecat')),
  revenuecat_app_user_id text,
  status text not null default 'inactive'
    check (
      status in (
        'idle',
        'loading',
        'inactive',
        'active',
        'configuration_required',
        'unsupported',
        'error'
      )
    ),
  entitlement_identifier text,
  management_url text,
  expires_at timestamptz,
  will_renew boolean not null default false,
  unsubscribe_detected_at timestamptz,
  billing_issue_detected_at timestamptz,
  synced_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.session_presets
  add column if not exists description text,
  add column if not exists intensity text not null default 'balanced'
    check (intensity in ('light', 'balanced', 'deep')),
  add column if not exists essential_app_hints jsonb not null default '[]'::jsonb,
  add column if not exists short_session_duration_minutes integer
    check (
      short_session_duration_minutes is null
      or (short_session_duration_minutes >= 5 and short_session_duration_minutes <= 180)
    ),
  add column if not exists session_scope text not null default 'shared'
    check (session_scope in ('shared', 'solo'));

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles (id) on delete cascade,
  couple_id uuid references public.couples (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  session_scope text not null
    check (session_scope in ('shared', 'solo')),
  profile_id uuid references public.session_presets (id) on delete set null,
  profile_snapshot jsonb not null default '{}'::jsonb,
  duration_minutes integer not null check (duration_minutes >= 5 and duration_minutes <= 720),
  short_session_mode boolean not null default false,
  grace_seconds integer not null default 0 check (grace_seconds >= 0 and grace_seconds <= 86400),
  recurrence text not null default 'weekly'
    check (recurrence in ('none', 'daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  schedule_days jsonb not null default '[]'::jsonb,
  start_minute_of_day integer not null check (start_minute_of_day >= 0 and start_minute_of_day < 1440),
  starts_on date not null default current_date,
  ends_on date,
  warning_minutes jsonb not null default '[15]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'paused')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint session_templates_valid_dates
    check (ends_on is null or ends_on >= starts_on)
);

alter table public.sessions
  alter column couple_id drop not null;

alter table public.sessions
  add column if not exists template_id uuid references public.session_templates (id) on delete set null,
  add column if not exists template_occurrence_key text,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'template', 'quick_start')),
  add column if not exists scope text not null default 'shared'
    check (scope in ('shared', 'solo')),
  add column if not exists short_session_mode boolean not null default false,
  add column if not exists warning_minutes_before jsonb not null default '[]'::jsonb,
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;

alter table public.session_participants
  add column if not exists bypass_count integer not null default 0,
  add column if not exists last_bypassed_at timestamptz;

update public.session_presets
set
  intensity = coalesce(intensity, 'balanced'),
  essential_app_hints = coalesce(essential_app_hints, '[]'::jsonb),
  session_scope = coalesce(session_scope, 'shared');

update public.sessions
set
  source = coalesce(source, 'manual'),
  scope = case when couple_id is null then 'solo' else 'shared' end,
  short_session_mode = coalesce(short_session_mode, false),
  warning_minutes_before = coalesce(warning_minutes_before, '[]'::jsonb),
  profile_snapshot = coalesce(profile_snapshot, '{}'::jsonb);

create unique index session_templates_occurrence_idx
  on public.sessions (template_id, template_occurrence_key)
  where template_id is not null and template_occurrence_key is not null;

create index user_subscriptions_status_idx
  on public.user_subscriptions (status, synced_at desc);

create index session_templates_creator_idx
  on public.session_templates (created_by_user_id, status, created_at desc);

create index session_templates_couple_idx
  on public.session_templates (couple_id, status, created_at desc);

create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at();

create trigger set_session_templates_updated_at
before update on public.session_templates
for each row
execute function public.set_updated_at();

alter table public.user_subscriptions enable row level security;
alter table public.session_templates enable row level security;

create policy "user_subscriptions_select_self_or_partner"
on public.user_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.couple_members as viewer
    join public.couple_members as target
      on target.couple_id = viewer.couple_id
    where viewer.user_id = auth.uid()
      and viewer.membership_status = 'active'
      and target.user_id = user_subscriptions.user_id
      and target.membership_status = 'active'
  )
);

create policy "user_subscriptions_upsert_self"
on public.user_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "user_subscriptions_update_self"
on public.user_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "session_templates_select_visible"
on public.session_templates
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or (
    couple_id is not null
    and exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = session_templates.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status in ('pending', 'active')
    )
  )
);

create policy "session_templates_insert_visible_scope"
on public.session_templates
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    couple_id is null
    or exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = session_templates.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status = 'active'
    )
  )
);

create policy "session_templates_update_creator"
on public.session_templates
for update
to authenticated
using (created_by_user_id = auth.uid())
with check (created_by_user_id = auth.uid());

create policy "session_templates_delete_creator"
on public.session_templates
for delete
to authenticated
using (created_by_user_id = auth.uid());

drop policy if exists "sessions_select_couple_member" on public.sessions;
create policy "sessions_select_couple_member_or_solo_owner"
on public.sessions
for select
to authenticated
using (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.session_participants
    where session_participants.session_id = sessions.id
      and session_participants.user_id = auth.uid()
  )
  or (
    couple_id is not null
    and exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = sessions.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status in ('pending', 'active')
    )
  )
);

drop policy if exists "sessions_insert_active_member" on public.sessions;
create policy "sessions_insert_active_member_or_solo_owner"
on public.sessions
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and (
    (couple_id is null and scope = 'solo')
    or exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = sessions.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status = 'active'
    )
  )
);

drop policy if exists "sessions_update_active_member" on public.sessions;
create policy "sessions_update_active_member_or_solo_owner"
on public.sessions
for update
to authenticated
using (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.session_participants
    where session_participants.session_id = sessions.id
      and session_participants.user_id = auth.uid()
  )
  or (
    couple_id is not null
    and exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = sessions.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status = 'active'
    )
  )
)
with check (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.session_participants
    where session_participants.session_id = sessions.id
      and session_participants.user_id = auth.uid()
  )
  or (
    couple_id is not null
    and exists (
      select 1
      from public.couple_members
      where couple_members.couple_id = sessions.couple_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status = 'active'
    )
  )
);

drop policy if exists "session_participants_select_session_member" on public.session_participants;
create policy "session_participants_select_session_member_or_solo_owner"
on public.session_participants
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.sessions
    where sessions.id = session_participants.session_id
      and sessions.created_by_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.sessions
    join public.couple_members
      on couple_members.couple_id = sessions.couple_id
    where sessions.id = session_participants.session_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

drop policy if exists "session_logs_select_session_member" on public.session_logs;
create policy "session_logs_select_session_member_or_solo_owner"
on public.session_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.sessions
    where sessions.id = session_logs.session_id
      and sessions.created_by_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.session_participants
    where session_participants.session_id = session_logs.session_id
      and session_participants.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.sessions
    join public.couple_members
      on couple_members.couple_id = sessions.couple_id
    where sessions.id = session_logs.session_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

drop policy if exists "session_logs_insert_actor" on public.session_logs;
create policy "session_logs_insert_actor_for_visible_session"
on public.session_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (
    exists (
      select 1
      from public.sessions
      where sessions.id = session_logs.session_id
        and sessions.created_by_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.session_participants
      where session_participants.session_id = session_logs.session_id
        and session_participants.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.sessions
      join public.couple_members
        on couple_members.couple_id = sessions.couple_id
      where sessions.id = session_logs.session_id
        and couple_members.user_id = auth.uid()
        and couple_members.membership_status in ('pending', 'active')
    )
  )
);
