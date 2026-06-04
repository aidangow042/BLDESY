-- Add an optional solid banner colour for builder profiles.
-- Builders can choose a colour banner instead of a cover photo (handy when a
-- photo crops/zooms badly). When set, it takes precedence over cover_photo_url
-- in the app and on the web. Stored as a #RRGGBB hex string.

alter table public.builder_profiles
  add column if not exists cover_color text;

-- Keep it a valid 6-digit hex (or null). Defensive: blocks junk from any
-- persistence path, matching the app's other CHECK constraints.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'builder_profiles_cover_color_hex'
  ) then
    alter table public.builder_profiles
      add constraint builder_profiles_cover_color_hex
      check (cover_color is null or cover_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;
