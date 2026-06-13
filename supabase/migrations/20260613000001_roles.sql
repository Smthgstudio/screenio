create type user_role as enum ('admin', 'client', 'user');

alter table profiles add column role user_role not null default 'user';

-- Admins can read all profiles
create policy "admins read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update all profiles (e.g. change plan/role)
create policy "admins update all profiles"
  on profiles for update
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can read all screens
create policy "admins read all screens"
  on screens for select
  using (
    exists (
      select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
    )
  );
