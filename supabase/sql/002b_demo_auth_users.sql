-- ResQnnect Mission 3: Demo auth users precheck
-- IMPORTANT:
-- Do not insert directly into auth.users/auth.identities.
-- Supabase Auth schema changes over time and manual inserts can break login.
--
-- Create these users from Dashboard -> Authentication -> Users -> Add user:
--   admin@reqnnect.com
--   official@reqnnect.com
--   rescuer@reqnnect.com
--   user@reqnnect.com
-- Password: password123 (or your preferred demo password)
--
-- Then run this file to verify they exist before running 003_phase3_demo_seed.sql.

do $$
declare
  v_missing text[];
begin
  select array_agg(required_email)
  into v_missing
  from (
    select required_email
    from (
      values
        ('admin@reqnnect.com'),
        ('official@reqnnect.com'),
        ('rescuer@reqnnect.com'),
        ('user@reqnnect.com')
    ) as required(required_email)
    where not exists (
      select 1
      from auth.users u
      where lower(u.email) = required.required_email
    )
  ) missing;

  if v_missing is not null then
    raise exception
      'Missing demo auth users: %. Create them in Supabase Authentication -> Users, then rerun 003_phase3_demo_seed.sql.',
      array_to_string(v_missing, ', ');
  end if;
end $$;
