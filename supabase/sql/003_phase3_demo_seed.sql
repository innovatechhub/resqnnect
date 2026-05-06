-- ResQnnect Mission 3: Demo seed data
-- Run this after:
--   1) 001_phase3_schema.sql
--   2) 002_phase3_rls.sql
--   3) 002b_demo_auth_users.sql (optional helper when demo auth users do not exist)
--
-- This seed expects these auth users to already exist:
--   admin@reqnnect.com
--   official@reqnnect.com
--   rescuer@reqnnect.com
--   user@reqnnect.com

begin;

insert into public.barangays (id, code, name, municipality, province, is_active)
values
  ('11111111-1111-1111-1111-111111111001', 'BGY-POB', 'Poblacion', 'Barbaza', 'Antique', true),
  ('11111111-1111-1111-1111-111111111002', 'BGY-SAN', 'San Ramon', 'Barbaza', 'Antique', true)
on conflict (id) do update
set
  code = excluded.code,
  name = excluded.name,
  municipality = excluded.municipality,
  province = excluded.province,
  is_active = excluded.is_active;

do $$
declare
  v_admin_id uuid;
  v_official_id uuid;
  v_rescuer_id uuid;
  v_household_id uuid;
  v_barangay_poblacion uuid := '11111111-1111-1111-1111-111111111001';
begin
  select id into v_admin_id
  from auth.users
  where lower(email) = 'admin@reqnnect.com'
  limit 1;

  select id into v_official_id
  from auth.users
  where lower(email) = 'official@reqnnect.com'
  limit 1;

  select id into v_rescuer_id
  from auth.users
  where lower(email) = 'rescuer@reqnnect.com'
  limit 1;

  select id into v_household_id
  from auth.users
  where lower(email) = 'user@reqnnect.com'
  limit 1;

  if v_admin_id is null or v_official_id is null or v_rescuer_id is null or v_household_id is null then
    raise exception
      'Missing demo auth users. Create admin@reqnnect.com, official@reqnnect.com, rescuer@reqnnect.com, user@reqnnect.com in Supabase Authentication first.';
  end if;

  insert into public.profiles (id, role, barangay_id, full_name, phone, approved_at, created_by)
  values
    (v_admin_id, 'mdrrmo_admin', null, 'Demo Admin', '+63 912 000 1001', now(), v_admin_id),
    (v_official_id, 'barangay_official', v_barangay_poblacion, 'Demo Barangay Official', '+63 912 000 1002', now(), v_admin_id),
    (v_rescuer_id, 'rescuer', v_barangay_poblacion, 'Demo Rescuer', '+63 912 000 1003', now(), v_admin_id),
    (v_household_id, 'household', v_barangay_poblacion, 'Demo Household User', '+63 912 000 1004', now(), v_admin_id)
  on conflict (id) do update
  set
    role = excluded.role,
    barangay_id = excluded.barangay_id,
    full_name = excluded.full_name,
    phone = excluded.phone,
    approved_at = coalesce(public.profiles.approved_at, excluded.approved_at);

  insert into public.households (
    id,
    household_code,
    barangay_id,
    head_profile_id,
    address_text,
    latitude,
    longitude,
    qr_code,
    status,
    created_by
  )
  values
    (
      '22222222-2222-2222-2222-222222222001',
      'DEMO-HH-001',
      v_barangay_poblacion,
      v_household_id,
      'Purok 1, Poblacion, Barbaza, Antique',
      11.2267840,
      122.0796110,
      'QR-DEMO-HH-001',
      'active',
      v_official_id
    ),
    (
      '22222222-2222-2222-2222-222222222002',
      'DEMO-HH-002',
      v_barangay_poblacion,
      null,
      'Purok 3, Poblacion, Barbaza, Antique',
      11.2290430,
      122.0813740,
      'QR-DEMO-HH-002',
      'active',
      v_official_id
    )
  on conflict (id) do update
  set
    household_code = excluded.household_code,
    barangay_id = excluded.barangay_id,
    head_profile_id = excluded.head_profile_id,
    address_text = excluded.address_text,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    qr_code = excluded.qr_code,
    status = excluded.status;

  insert into public.household_members (
    id,
    household_id,
    profile_id,
    full_name,
    relationship_to_head,
    birth_date,
    sex,
    is_vulnerable,
    vulnerability_notes,
    created_by
  )
  values
    (
      '33333333-3333-3333-3333-333333333001',
      '22222222-2222-2222-2222-222222222001',
      v_household_id,
      'Demo Household User',
      'Head',
      date '1993-03-18',
      'female',
      false,
      null,
      v_official_id
    ),
    (
      '33333333-3333-3333-3333-333333333002',
      '22222222-2222-2222-2222-222222222001',
      null,
      'Marco Dela Cruz',
      'Spouse',
      date '1991-07-09',
      'male',
      false,
      null,
      v_official_id
    ),
    (
      '33333333-3333-3333-3333-333333333003',
      '22222222-2222-2222-2222-222222222001',
      null,
      'Lia Dela Cruz',
      'Child',
      date '2015-11-26',
      'female',
      true,
      'Needs pediatric priority during evacuation.',
      v_official_id
    ),
    (
      '33333333-3333-3333-3333-333333333004',
      '22222222-2222-2222-2222-222222222002',
      null,
      'Ramon Salazar',
      'Head',
      date '1984-01-15',
      'male',
      false,
      null,
      v_official_id
    )
  on conflict (id) do update
  set
    household_id = excluded.household_id,
    profile_id = excluded.profile_id,
    full_name = excluded.full_name,
    relationship_to_head = excluded.relationship_to_head,
    birth_date = excluded.birth_date,
    sex = excluded.sex,
    is_vulnerable = excluded.is_vulnerable,
    vulnerability_notes = excluded.vulnerability_notes;

  insert into public.rescue_requests (
    id,
    household_id,
    requested_by,
    barangay_id,
    emergency_type,
    severity_level,
    people_count,
    location_text,
    latitude,
    longitude,
    details,
    photo_url,
    status,
    created_by
  )
  values
    (
      '44444444-4444-4444-4444-444444444001',
      '22222222-2222-2222-2222-222222222001',
      v_household_id,
      v_barangay_poblacion,
      'Flood',
      4,
      4,
      'Near barangay hall side street',
      11.2267840,
      122.0796110,
      'Waist-level flood entering the first floor. Elderly and child present.',
      null,
      'pending',
      v_household_id
    ),
    (
      '44444444-4444-4444-4444-444444444002',
      '22222222-2222-2222-2222-222222222001',
      v_household_id,
      v_barangay_poblacion,
      'Medical',
      3,
      1,
      'Purok 1 basketball court',
      11.2273210,
      122.0800200,
      'Asthma attack and inhaler supply is depleted.',
      null,
      'assigned',
      v_household_id
    ),
    (
      '44444444-4444-4444-4444-444444444003',
      '22222222-2222-2222-2222-222222222002',
      v_household_id,
      v_barangay_poblacion,
      'Landslide',
      5,
      3,
      'Hillside near Purok 3',
      11.2290430,
      122.0813740,
      'House access blocked by debris, immediate extraction requested.',
      null,
      'in_progress',
      v_household_id
    ),
    (
      '44444444-4444-4444-4444-444444444004',
      '22222222-2222-2222-2222-222222222002',
      v_household_id,
      v_barangay_poblacion,
      'Flood',
      2,
      2,
      'Main road near bridge',
      11.2300110,
      122.0819020,
      'Family transferred to safe area, request can be closed.',
      null,
      'closed',
      v_household_id
    )
  on conflict (id) do update
  set
    household_id = excluded.household_id,
    requested_by = excluded.requested_by,
    barangay_id = excluded.barangay_id,
    emergency_type = excluded.emergency_type,
    severity_level = excluded.severity_level,
    people_count = excluded.people_count,
    location_text = excluded.location_text,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    details = excluded.details,
    photo_url = excluded.photo_url,
    status = excluded.status;

  insert into public.rescue_assignments (
    id,
    rescue_request_id,
    assigned_to,
    assigned_by,
    team_name,
    status,
    assignment_notes,
    pickup_at,
    handover_at,
    created_by
  )
  values
    (
      '55555555-5555-5555-5555-555555555001',
      '44444444-4444-4444-4444-444444444002',
      v_rescuer_id,
      v_admin_id,
      'Alpha Team',
      'assigned',
      'Prioritize respiratory support kit.',
      null,
      null,
      v_admin_id
    ),
    (
      '55555555-5555-5555-5555-555555555002',
      '44444444-4444-4444-4444-444444444003',
      v_rescuer_id,
      v_admin_id,
      'Bravo Team',
      'en_route',
      'Coordinate with barangay clearing unit before approach.',
      null,
      null,
      v_admin_id
    ),
    (
      '55555555-5555-5555-5555-555555555003',
      '44444444-4444-4444-4444-444444444004',
      v_rescuer_id,
      v_admin_id,
      'Charlie Team',
      'closed',
      'Mission completed and residents transferred.',
      now() - interval '3 hours',
      now() - interval '2 hours 35 minutes',
      v_admin_id
    )
  on conflict (id) do update
  set
    rescue_request_id = excluded.rescue_request_id,
    assigned_to = excluded.assigned_to,
    assigned_by = excluded.assigned_by,
    team_name = excluded.team_name,
    status = excluded.status,
    assignment_notes = excluded.assignment_notes,
    pickup_at = excluded.pickup_at,
    handover_at = excluded.handover_at;

  update public.rescue_requests
  set status = 'assigned'
  where id = '44444444-4444-4444-4444-444444444002';

  update public.rescue_requests
  set status = 'in_progress'
  where id = '44444444-4444-4444-4444-444444444003';

  update public.rescue_requests
  set status = 'closed'
  where id = '44444444-4444-4444-4444-444444444004';

  insert into public.rescuer_locations (
    id,
    assigned_rescuer_id,
    rescue_assignment_id,
    latitude,
    longitude,
    accuracy_meters,
    recorded_at,
    created_by
  )
  values
    (
      '66666666-6666-6666-6666-666666666001',
      v_rescuer_id,
      '55555555-5555-5555-5555-555555555002',
      11.2286100,
      122.0809500,
      7.3,
      now() - interval '12 minutes',
      v_rescuer_id
    ),
    (
      '66666666-6666-6666-6666-666666666002',
      v_rescuer_id,
      '55555555-5555-5555-5555-555555555002',
      11.2289100,
      122.0811400,
      6.8,
      now() - interval '7 minutes',
      v_rescuer_id
    ),
    (
      '66666666-6666-6666-6666-666666666003',
      v_rescuer_id,
      '55555555-5555-5555-5555-555555555002',
      11.2292300,
      122.0813300,
      5.9,
      now() - interval '3 minutes',
      v_rescuer_id
    )
  on conflict (id) do update
  set
    assigned_rescuer_id = excluded.assigned_rescuer_id,
    rescue_assignment_id = excluded.rescue_assignment_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    recorded_at = excluded.recorded_at;
end $$;

commit;
