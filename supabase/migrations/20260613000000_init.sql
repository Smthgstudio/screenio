create type plan_type as enum ('free', 'pro');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan plan_type not null default 'free',
  created_at timestamptz not null default now()
);

create table screens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'Sans titre',
  layout jsonb not null default '{"widgets":[]}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table screens enable row level security;

create policy "users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "users update own profile"
  on profiles for update using (auth.uid() = id);

create policy "users read own screens"
  on screens for select using (auth.uid() = user_id);

create policy "users insert own screens"
  on screens for insert with check (auth.uid() = user_id);

create policy "users update own screens"
  on screens for update using (auth.uid() = user_id);

create policy "users delete own screens"
  on screens for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Auto-update updated_at on screens
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger screens_updated_at
  before update on screens
  for each row execute procedure update_updated_at();
