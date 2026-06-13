-- Drop recursive admin policies (they caused infinite recursion)
drop policy if exists "admins read all profiles" on profiles;
drop policy if exists "admins update all profiles" on profiles;
drop policy if exists "admins read all screens" on screens;

-- Use a security definer function to check admin role without recursion
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  )
$$;

create policy "admins read all profiles"
  on profiles for select
  using (is_admin());

create policy "admins update all profiles"
  on profiles for update
  using (is_admin());

create policy "admins read all screens"
  on screens for select
  using (is_admin());
