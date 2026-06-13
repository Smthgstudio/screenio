-- Folders: contain multiple screens with a broadcast URL
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Nouveau dossier',
  slug text unique not null,
  created_at timestamptz default now()
);

-- Schedules: days 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete cascade not null,
  screen_id uuid references public.screens(id) on delete cascade not null,
  days int[] not null default '{}',
  start_time time,
  end_time time,
  all_day boolean not null default false,
  created_at timestamptz default now()
);

alter table public.folders enable row level security;
alter table public.schedules enable row level security;

create policy "folders_owner" on public.folders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "schedules_owner" on public.schedules
  for all using (
    exists (select 1 from public.folders where id = folder_id and user_id = auth.uid())
  ) with check (
    exists (select 1 from public.folders where id = folder_id and user_id = auth.uid())
  );
