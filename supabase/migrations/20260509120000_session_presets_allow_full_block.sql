-- Allow allowed_minutes = 0 for full-session block presets (no periodic unlocks).
alter table public.session_presets
  drop constraint if exists session_presets_allowed_minutes_check;

alter table public.session_presets
  drop constraint if exists session_presets_allowed_minutes_range_check;

alter table public.session_presets
  add constraint session_presets_allowed_minutes_range_check
  check (allowed_minutes >= 0 and allowed_minutes <= 1440);
