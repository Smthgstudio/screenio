-- Restore admin role for the main admin account
update public.profiles
set role = 'admin'::user_role
where email = 'itssmthg@gmail.com';
