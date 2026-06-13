-- Store email in profiles for admin access without service role on every query
alter table profiles add column email text;

-- Backfill existing profiles from auth.users
update profiles p
set email = u.email
from auth.users u
where p.id = u.id;

-- Keep email in sync on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
