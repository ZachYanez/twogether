create table public.couple_location_settings (
  couple_id uuid primary key references public.couples (id) on delete cascade,
  enabled boolean not null default false,
  mode text not null default 'suggest'
    check (mode in ('suggest', 'auto_arm')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  created_by_user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  radius_meters integer not null default 150 check (radius_meters between 25 and 1000),
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_place_presence (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  place_id uuid references public.saved_places (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index saved_places_couple_idx
  on public.saved_places (couple_id, is_archived, created_at desc);

create index user_place_presence_couple_idx
  on public.user_place_presence (couple_id, updated_at desc);

create trigger set_couple_location_settings_updated_at
before update on public.couple_location_settings
for each row
execute function public.set_updated_at();

create trigger set_saved_places_updated_at
before update on public.saved_places
for each row
execute function public.set_updated_at();

create trigger set_user_place_presence_updated_at
before update on public.user_place_presence
for each row
execute function public.set_updated_at();

alter table public.couple_location_settings enable row level security;
alter table public.saved_places enable row level security;
alter table public.user_place_presence enable row level security;

create policy "couple_location_settings_select_active_member"
on public.couple_location_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couple_location_settings.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "couple_location_settings_insert_active_member"
on public.couple_location_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couple_location_settings.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "couple_location_settings_update_active_member"
on public.couple_location_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couple_location_settings.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = couple_location_settings.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "saved_places_select_active_member"
on public.saved_places
for select
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = saved_places.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "saved_places_insert_active_member"
on public.saved_places
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = saved_places.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "saved_places_update_active_member"
on public.saved_places
for update
to authenticated
using (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = saved_places.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = saved_places.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "user_place_presence_select_active_member"
on public.user_place_presence
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = user_place_presence.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "user_place_presence_insert_self"
on public.user_place_presence
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.couple_members
    where couple_members.couple_id = user_place_presence.couple_id
      and couple_members.user_id = auth.uid()
      and couple_members.membership_status = 'active'
  )
);

create policy "user_place_presence_update_self"
on public.user_place_presence
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
