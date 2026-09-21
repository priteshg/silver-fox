-- A normalized media asset, referenced by FK from exercises (and later
-- recipes) instead of embedding a raw image/video URL in those tables.
-- Keeping this separate is what lets a future AI-generation pipeline
-- replace or add camera angles for an exercise without touching the
-- exercise row itself, and lets one asset be reused across records.
create table public.media_assets (
  -- App-generated (matches every other entity's id — see createId() in
  -- packages/types), not a DB default, so ids stay stable and predictable
  -- end to end rather than mixing two id philosophies in one schema.
  id text primary key,
  type text not null check (type in ('image', 'gif', 'video', 'placeholder')),
  url text,
  thumbnail_url text,
  duration_seconds numeric,
  -- Free-form, e.g. camera angle, form-cue overlay flags, generator model/version.
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'placeholder' check (source in ('placeholder', 'stock', 'user_upload', 'ai_generated')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_url_required_unless_placeholder
    check (type = 'placeholder' or url is not null)
);

create trigger set_media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;

-- Media is reference data: readable by anyone (including a signed-out
-- anonymous session), writable only by the service role (an admin/import
-- script or a future AI-generation job), never directly by the app.
create policy "media assets are publicly readable"
  on public.media_assets for select
  to authenticated, anon
  using (true);
