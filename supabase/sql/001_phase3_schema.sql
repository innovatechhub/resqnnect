-- ResQnnect Mission 3: Initial normalized schema
-- Run this first in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('mdrrmo_admin', 'barangay_official', 'rescuer', 'household');
  end if;

  if not exists (select 1 from pg_type where typname = 'rescue_request_status') then
    create type public.rescue_request_status as enum (
      'pending',
      'acknowledged',
      'assigned',
      'in_progress',
      'rescued',
      'transferred',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'rescue_assignment_status') then
    create type public.rescue_assignment_status as enum (
      'queued',
      'assigned',
      'en_route',
      'on_site',
      'pickup_complete',
      'handover_complete',
      'closed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'evacuee_status') then
    create type public.evacuee_status as enum ('checked_in', 'checked_out', 'transferred');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_status') then
    create type public.inventory_status as enum ('available', 'low_stock', 'depleted', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_mode') then
    create type public.verification_mode as enum ('qr', 'manual_name', 'manual_family_id');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_result') then
    create type public.verification_result as enum ('success', 'failed', 'duplicate', 'conflict');
  end if;
end $$;

create table if not exists public.roles (
  role public.user_role primary key,
  label text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.roles (role, label, description)
values
  ('mdrrmo_admin', 'MDRRMO Admin', 'Municipality-wide emergency operations admin'),
  ('barangay_official', 'Barangay Official', 'Barangay-level operator for households and incidents'),
  ('rescuer', 'Rescuer', 'Field rescuer assigned to operations'),
  ('household', 'Household/Resident', 'Resident-facing role for requests and verification')
on conflict (role) do nothing;

create table if not exists public.barangays (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  municipality text not null default 'Barbaza',
  province text not null default 'Antique',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'household',
  barangay_id uuid references public.barangays(id) on delete set null,
  full_name text,
  phone text,
  avatar_url text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  household_code text unique,
  barangay_id uuid not null references public.barangays(id) on delete restrict,
  head_profile_id uuid references public.profiles(id) on delete set null,
  address_text text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  qr_code text unique,
  status text not null default 'active' check (status in ('active', 'evacuated', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  relationship_to_head text,
  birth_date date,
  sex text check (sex in ('female', 'male', 'other')),
  is_vulnerable boolean not null default false,
  vulnerability_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.rescue_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  barangay_id uuid not null references public.barangays(id) on delete restrict,
  emergency_type text not null,
  severity_level smallint not null check (severity_level between 1 and 5),
  people_count integer not null check (people_count >= 1),
  location_text text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  details text not null,
  photo_url text,
  status public.rescue_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.rescue_assignments (
  id uuid primary key default gen_random_uuid(),
  rescue_request_id uuid not null references public.rescue_requests(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  team_name text,
  status public.rescue_assignment_status not null default 'assigned',
  assignment_notes text,
  pickup_at timestamptz,
  handover_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.rescuer_locations (
  id uuid primary key default gen_random_uuid(),
  assigned_rescuer_id uuid not null references public.profiles(id) on delete cascade,
  rescue_assignment_id uuid references public.rescue_assignments(id) on delete set null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  accuracy_meters numeric(8, 2),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.evacuation_centers (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id) on delete restrict,
  name text not null,
  location_text text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  capacity integer not null default 0 check (capacity >= 0),
  current_occupancy integer not null default 0 check (current_occupancy >= 0),
  status text not null default 'standby' check (status in ('open', 'closed', 'full', 'standby')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.evacuee_records (
  id uuid primary key default gen_random_uuid(),
  evacuation_center_id uuid not null references public.evacuation_centers(id) on delete restrict,
  household_id uuid references public.households(id) on delete set null,
  household_member_id uuid references public.household_members(id) on delete set null,
  status public.evacuee_status not null default 'checked_in',
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.relief_inventory (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid references public.barangays(id) on delete set null,
  evacuation_center_id uuid references public.evacuation_centers(id) on delete set null,
  item_name text not null,
  unit text not null,
  quantity_on_hand numeric(12, 2) not null default 0 check (quantity_on_hand >= 0),
  reorder_level numeric(12, 2) not null default 0 check (reorder_level >= 0),
  status public.inventory_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.relief_distributions (
  id uuid primary key default gen_random_uuid(),
  relief_inventory_id uuid not null references public.relief_inventory(id) on delete restrict,
  evacuation_center_id uuid references public.evacuation_centers(id) on delete set null,
  household_id uuid references public.households(id) on delete set null,
  household_member_id uuid references public.household_members(id) on delete set null,
  beneficiary_name text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  released_by uuid references public.profiles(id) on delete set null,
  reference_no text unique,
  distributed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.qr_verifications (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null,
  household_id uuid references public.households(id) on delete set null,
  household_member_id uuid references public.household_members(id) on delete set null,
  verification_mode public.verification_mode not null,
  result public.verification_result not null,
  notes text,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null default 'system',
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists trg_barangays_updated_at on public.barangays;
create trigger trg_barangays_updated_at before update on public.barangays
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_households_updated_at on public.households;
create trigger trg_households_updated_at before update on public.households
for each row execute function public.set_updated_at();

drop trigger if exists trg_household_members_updated_at on public.household_members;
create trigger trg_household_members_updated_at before update on public.household_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_rescue_requests_updated_at on public.rescue_requests;
create trigger trg_rescue_requests_updated_at before update on public.rescue_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_rescue_assignments_updated_at on public.rescue_assignments;
create trigger trg_rescue_assignments_updated_at before update on public.rescue_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_evacuation_centers_updated_at on public.evacuation_centers;
create trigger trg_evacuation_centers_updated_at before update on public.evacuation_centers
for each row execute function public.set_updated_at();

drop trigger if exists trg_evacuee_records_updated_at on public.evacuee_records;
create trigger trg_evacuee_records_updated_at before update on public.evacuee_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_relief_inventory_updated_at on public.relief_inventory;
create trigger trg_relief_inventory_updated_at before update on public.relief_inventory
for each row execute function public.set_updated_at();

drop trigger if exists trg_relief_distributions_updated_at on public.relief_distributions;
create trigger trg_relief_distributions_updated_at before update on public.relief_distributions
for each row execute function public.set_updated_at();

drop trigger if exists trg_qr_verifications_updated_at on public.qr_verifications;
create trigger trg_qr_verifications_updated_at before update on public.qr_verifications
for each row execute function public.set_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_barangay_id on public.profiles(barangay_id);

create index if not exists idx_households_barangay_id on public.households(barangay_id);
create index if not exists idx_households_head_profile_id on public.households(head_profile_id);
create index if not exists idx_households_status on public.households(status);

create index if not exists idx_household_members_household_id on public.household_members(household_id);
create index if not exists idx_household_members_profile_id on public.household_members(profile_id);

create index if not exists idx_rescue_requests_barangay_status on public.rescue_requests(barangay_id, status);
create index if not exists idx_rescue_requests_requested_by on public.rescue_requests(requested_by);
create index if not exists idx_rescue_requests_created_at on public.rescue_requests(created_at desc);

create index if not exists idx_rescue_assignments_request_id on public.rescue_assignments(rescue_request_id);
create index if not exists idx_rescue_assignments_assigned_to on public.rescue_assignments(assigned_to);
create index if not exists idx_rescue_assignments_status on public.rescue_assignments(status);

create index if not exists idx_rescuer_locations_assigned_rescuer_id on public.rescuer_locations(assigned_rescuer_id);
create index if not exists idx_rescuer_locations_assignment_id on public.rescuer_locations(rescue_assignment_id);
create index if not exists idx_rescuer_locations_recorded_at on public.rescuer_locations(recorded_at desc);

create index if not exists idx_evacuation_centers_barangay_id on public.evacuation_centers(barangay_id);
create index if not exists idx_evacuee_records_center_id on public.evacuee_records(evacuation_center_id);
create index if not exists idx_evacuee_records_household_id on public.evacuee_records(household_id);

create index if not exists idx_relief_inventory_barangay_id on public.relief_inventory(barangay_id);
create index if not exists idx_relief_inventory_center_id on public.relief_inventory(evacuation_center_id);
create index if not exists idx_relief_distributions_inventory_id on public.relief_distributions(relief_inventory_id);
create index if not exists idx_relief_distributions_household_id on public.relief_distributions(household_id);

create index if not exists idx_qr_verifications_household_id on public.qr_verifications(household_id);
create index if not exists idx_qr_verifications_created_at on public.qr_verifications(created_at desc);

create index if not exists idx_notifications_recipient_status on public.notifications(recipient_profile_id, status);
create index if not exists idx_activity_logs_actor_created_at on public.activity_logs(actor_profile_id, created_at desc);
create index if not exists idx_activity_logs_entity on public.activity_logs(entity_type, entity_id);

commit;
