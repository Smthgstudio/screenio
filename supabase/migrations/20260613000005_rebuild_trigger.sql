-- Drop and recreate the trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, plan, role)
  values (
    new.id,
    new.email,
    'free'::plan_type,
    'user'::user_role
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise log 'handle_new_user error: %', sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
