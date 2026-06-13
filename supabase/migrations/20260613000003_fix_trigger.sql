create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, plan, role)
  values (new.id, new.email, 'free', 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;
