-- ═══════════════════════════════════════════════════════
-- BARINV — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════

-- ── PROFILES (extends Supabase Auth) ─────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz default now()
);

-- ── BARS ─────────────────────────────────────────────────
create table if not exists bars (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- ── STATIONS ─────────────────────────────────────────────
create table if not exists stations (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid references bars(id) on delete cascade not null,
  name text not null,
  active boolean default true,
  created_at timestamptz default now(),
  unique(bar_id, name)
);

-- ── ITEMS ────────────────────────────────────────────────
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text,
  unit text default 'bottle',
  active boolean default true,
  created_at timestamptz default now()
);

-- ── STAFF (barbacks — not auth users) ────────────────────
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('bartender', 'barback')),
  active boolean default true,
  created_at timestamptz default now()
);

-- ── NIGHTS ───────────────────────────────────────────────
create table if not exists nights (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  code text unique not null,   -- 6-digit room code for barbacks
  active boolean default true,
  created_at timestamptz default now()
);

-- ── PLACEMENTS ───────────────────────────────────────────
create table if not exists placements (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references stations(id) on delete cascade not null,
  item_id uuid references items(id) on delete cascade not null,
  qty numeric not null default 1,
  bartender_id uuid references staff(id) on delete set null,
  barback_id uuid references staff(id) on delete set null,
  created_at timestamptz default now()
);

-- ── EVENTS ───────────────────────────────────────────────
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  night_id uuid references nights(id),
  bar_id uuid references bars(id),
  station_id uuid references stations(id),
  item_id uuid references items(id),
  submitted_by text not null,   -- admin username OR barback name
  qty numeric default 1,
  action text not null check (action in ('REQUEST','DELIVERED','RETURNED','ADJUSTMENT','COMP','SHOT')),
  status text default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_events_night on events(night_id);
create index if not exists idx_events_created on events(created_at desc);
create index if not exists idx_events_status on events(status);

-- ── ROW LEVEL SECURITY ───────────────────────────────────
alter table profiles enable row level security;
alter table bars enable row level security;
alter table stations enable row level security;
alter table items enable row level security;
alter table staff enable row level security;
alter table nights enable row level security;
alter table placements enable row level security;
alter table events enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_own" on profiles for all using (auth.uid() = id);

-- Master data: authenticated admins have full access; anon can read
create policy "bars_read_anon" on bars for select using (true);
create policy "bars_admin" on bars for all using (auth.role() = 'authenticated');

create policy "stations_read_anon" on stations for select using (true);
create policy "stations_admin" on stations for all using (auth.role() = 'authenticated');

create policy "items_read_anon" on items for select using (true);
create policy "items_admin" on items for all using (auth.role() = 'authenticated');

create policy "staff_read_anon" on staff for select using (true);
create policy "staff_admin" on staff for all using (auth.role() = 'authenticated');

create policy "nights_read_anon" on nights for select using (true);
create policy "nights_admin" on nights for all using (auth.role() = 'authenticated');

create policy "placements_read_anon" on placements for select using (true);
create policy "placements_admin" on placements for all using (auth.role() = 'authenticated');

-- Events: anyone can INSERT (barbacks use anon client); only authenticated can update
create policy "events_insert_anon" on events for insert with check (true);
create policy "events_read_auth" on events for select using (auth.role() = 'authenticated');
create policy "events_update_auth" on events for update using (auth.role() = 'authenticated');
create policy "events_delete_auth" on events for delete using (auth.role() = 'authenticated');

-- ── REALTIME ─────────────────────────────────────────────
-- Enable realtime for events table in:
-- Supabase Dashboard → Database → Replication → 0 tables → enable 'events'
-- OR run:
-- alter publication supabase_realtime add table events;
