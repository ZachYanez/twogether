create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_display_name text;
begin
  derived_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(concat_ws(' ', new.raw_user_meta_data ->> 'given_name', new.raw_user_meta_data ->> 'family_name')), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Twogether'
  );

  insert into public.profiles (id, display_name, timezone)
  values (new.id, left(derived_display_name, 80), 'America/Chicago')
  on conflict (id) do nothing;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_path text,
  timezone text not null default 'America/Chicago',
  onboarding jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_avatar_path_not_blank
    check (avatar_path is null or char_length(trim(avatar_path)) > 0)
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'unpaired')),
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  membership_status text not null default 'pending'
    check (membership_status in ('pending', 'active', 'removed')),
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (couple_id, user_id)
);

create table public.session_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  default_title text not null check (char_length(trim(default_title)) between 1 and 120),
  allowed_minutes integer not null check (allowed_minutes > 0 and allowed_minutes <= 1440),
  interval_hours integer not null check (interval_hours > 0 and interval_hours <= 168),
  grace_seconds integer not null default 0 check (grace_seconds >= 0 and grace_seconds <= 86400),
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 120),
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  timezone text not null,
  grace_seconds integer not null default 0 check (grace_seconds >= 0 and grace_seconds <= 86400),
  status text not null
    check (status in ('draft', 'pending_acceptance', 'armed', 'active', 'completed', 'interrupted', 'cancelled')),
  condition_preset_id uuid references public.session_presets (id) on delete set null,
  condition_snapshot jsonb not null default '{}'::jsonb,
  armed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  interrupted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sessions_valid_schedule
    check (scheduled_end_at > scheduled_start_at)
);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  acceptance_status text not null default 'pending'
    check (acceptance_status in ('pending', 'accepted', 'declined')),
  authorization_status_at_arm_time text not null default 'notDetermined'
    check (authorization_status_at_arm_time in ('notDetermined', 'approved', 'denied', 'unsupported', 'error')),
  last_reported_device_state text not null default 'idle'
    check (last_reported_device_state in ('idle', 'armed', 'active', 'completed', 'interrupted')),
  completed_successfully boolean,
  interruption_reason text
    check (
      interruption_reason is null
      or interruption_reason in (
        'authorization_revoked',
        'missing_selection',
        'scheduling_failed',
        'shield_apply_failed',
        'manual_disable',
        'other'
      )
    ),
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (session_id, user_id)
);

create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) between 1 and 80),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index couples_created_by_user_id_idx
  on public.couples (created_by_user_id);

create unique index couples_invite_code_idx
  on public.couples (invite_code)
  where invite_code is not null;

create index couple_members_user_id_idx
  on public.couple_members (user_id);

create unique index couple_members_single_active_couple_idx
  on public.couple_members (user_id)
  where membership_status = 'active';

create index session_presets_user_id_idx
  on public.session_presets (user_id, is_archived, created_at desc);

create index sessions_couple_id_idx
  on public.sessions (couple_id, scheduled_start_at desc);

create index sessions_creator_id_idx
  on public.sessions (created_by_user_id, created_at desc);

create index sessions_current_lookup_idx
  on public.sessions (couple_id, status, scheduled_start_at desc)
  where status in ('pending_acceptance', 'armed', 'active');

create index session_participants_user_lookup_idx
  on public.session_participants (user_id, session_id);

create index session_logs_session_created_at_idx
  on public.session_logs (session_id, created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_couples_updated_at
before update on public.couples
for each row
execute function public.set_updated_at();

create trigger set_couple_members_updated_at
before update on public.couple_members
for each row
execute function public.set_updated_at();

create trigger set_session_presets_updated_at
before update on public.session_presets
for each row
execute function public.set_updated_at();

create trigger set_sessions_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

create trigger set_session_participants_updated_at
before update on public.session_participants
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, display_name, timezone)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(concat_ws(' ', users.raw_user_meta_data ->> 'given_name', users.raw_user_meta_data ->> 'family_name')), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Twogether'
    ),
    80
  ),
  'America/Chicago'
from auth.users as users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.session_presets enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_logs enable row level security;

create policy "profiles_select_self_or_partner"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.couple_members as viewer
    join public.couple_members as target
      on target.couple_id = viewer.couple_id
    where viewer.user_id = auth.uid()
      and viewer.membership_status = 'active'
      and target.user_id = profiles.id
      and target.membership_status = 'active'
  )
);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_delete_self"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

create policy "couples_select_member"
on public.couples
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couples.id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

create policy "couples_insert_creator"
on public.couples
for insert
to authenticated
with check (created_by_user_id = auth.uid());

create policy "couples_update_member"
on public.couples
for update
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couples.id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couples.id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "couple_members_select_visible"
on public.couple_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.couple_members as viewer
    where viewer.couple_id = couple_members.couple_id
      and viewer.user_id = auth.uid()
      and viewer.membership_status in ('pending', 'active')
  )
);

create policy "couple_members_insert_self"
on public.couple_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "couple_members_update_self"
on public.couple_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "session_presets_select_own"
on public.session_presets
for select
to authenticated
using (user_id = auth.uid());

create policy "session_presets_insert_own"
on public.session_presets
for insert
to authenticated
with check (user_id = auth.uid());

create policy "session_presets_update_own"
on public.session_presets
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "session_presets_delete_own"
on public.session_presets
for delete
to authenticated
using (user_id = auth.uid());

create policy "sessions_select_couple_member"
on public.sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = sessions.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

create policy "sessions_insert_active_member"
on public.sessions
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = sessions.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "sessions_update_active_member"
on public.sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = sessions.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = sessions.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "session_participants_select_session_member"
on public.session_participants
for select
to authenticated
using (
  user_id = auth.uid()
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

create policy "session_participants_insert_session_creator_or_self"
on public.session_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.sessions
    where sessions.id = session_participants.session_id
      and sessions.created_by_user_id = auth.uid()
  )
);

create policy "session_participants_update_session_creator_or_self"
on public.session_participants
for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.sessions
    where sessions.id = session_participants.session_id
      and sessions.created_by_user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.sessions
    where sessions.id = session_participants.session_id
      and sessions.created_by_user_id = auth.uid()
  )
);

create policy "session_logs_select_session_member"
on public.session_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.sessions
    join public.couple_members
      on couple_members.couple_id = sessions.couple_id
    where sessions.id = session_logs.session_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

create policy "session_logs_insert_actor"
on public.session_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.sessions
    join public.couple_members
      on couple_members.couple_id = sessions.couple_id
    where sessions.id = session_logs.session_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status in ('pending', 'active')
  )
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
