-- ResQnnect Mission 3: RLS helpers and policies
-- Run this after 001_phase3_schema.sql.

begin;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  with profile_role as (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  ),
  metadata_role as (
    select
      case
        when coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role')
          in ('mdrrmo_admin', 'barangay_official', 'rescuer', 'household')
          then coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role')::public.user_role
        else null
      end as role
  )
  select coalesce(
    (select role from profile_role),
    (select role from metadata_role)
  )
$$;

create or replace function public.current_user_barangay_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with profile_barangay as (
    select p.barangay_id
    from public.profiles p
    where p.id = auth.uid()
  ),
  metadata_barangay as (
    select
      case
        when coalesce(auth.jwt() -> 'app_metadata' ->> 'barangay_id', auth.jwt() -> 'user_metadata' ->> 'barangay_id')
          ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then coalesce(auth.jwt() -> 'app_metadata' ->> 'barangay_id', auth.jwt() -> 'user_metadata' ->> 'barangay_id')::uuid
        else null
      end as barangay_id
  )
  select coalesce(
    (select barangay_id from profile_barangay),
    (select barangay_id from metadata_barangay)
  )
$$;

create or replace function public.current_user_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with linked as (
    select h.id
    from public.households h
    where h.head_profile_id = auth.uid()
    union all
    select hm.household_id as id
    from public.household_members hm
    where hm.profile_id = auth.uid()
  )
  select linked.id
  from linked
  limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'mdrrmo_admin', false)
$$;

create or replace function public.is_barangay_official()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'barangay_official', false)
$$;

create or replace function public.is_rescuer()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'rescuer', false)
$$;

create or replace function public.is_household()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'household', false)
$$;

create or replace function public.can_insert_household(target_barangay_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.is_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'barangay_official'
        and p.barangay_id = target_barangay_id
    )
    or (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'barangay_official'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'barangay_id', auth.jwt() -> 'user_metadata' ->> 'barangay_id')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and coalesce(auth.jwt() -> 'app_metadata' ->> 'barangay_id', auth.jwt() -> 'user_metadata' ->> 'barangay_id')::uuid = target_barangay_id
    )
  )
$$;

create or replace function public.create_household(
  target_barangay_id uuid,
  target_household_code text,
  target_address_text text,
  target_latitude numeric,
  target_longitude numeric,
  target_qr_code text,
  target_status text default 'active'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  created_row public.households;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  if not public.can_insert_household(target_barangay_id) then
    raise exception 'Not allowed to create household for this barangay'
      using errcode = '42501';
  end if;

  insert into public.households (
    household_code,
    barangay_id,
    address_text,
    latitude,
    longitude,
    qr_code,
    status,
    created_by
  )
  values (
    nullif(target_household_code, ''),
    target_barangay_id,
    target_address_text,
    target_latitude,
    target_longitude,
    nullif(target_qr_code, ''),
    case
      when target_status in ('active', 'evacuated', 'inactive') then target_status
      else 'active'
    end,
    auth.uid()
  )
  returning * into created_row;

  return created_row;
end;
$$;

create or replace function public.profile_in_my_barangay(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and p.barangay_id = public.current_user_barangay_id()
  )
$$;

create or replace function public.household_in_my_barangay(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households h
    where h.id = target_household_id
      and h.barangay_id = public.current_user_barangay_id()
  )
$$;

create or replace function public.request_in_my_barangay(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rescue_requests rr
    where rr.id = target_request_id
      and rr.barangay_id = public.current_user_barangay_id()
  )
$$;

create or replace function public.center_in_my_barangay(target_center_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evacuation_centers ec
    where ec.id = target_center_id
      and ec.barangay_id = public.current_user_barangay_id()
  )
$$;

create or replace function public.inventory_in_my_barangay(target_inventory_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.relief_inventory ri
    where ri.id = target_inventory_id
      and (
        ri.barangay_id = public.current_user_barangay_id()
        or (
          ri.barangay_id is null
          and ri.evacuation_center_id is not null
          and public.center_in_my_barangay(ri.evacuation_center_id)
        )
      )
  )
$$;

create or replace function public.has_barangay_access(target_barangay_id uuid)
returns boolean
language sql
stable
as $$
  select (
    public.is_admin()
    or (
      (public.is_barangay_official() or public.is_rescuer())
      and public.current_user_barangay_id() = target_barangay_id
    )
  )
$$;

create or replace function public.can_access_household(target_household_id uuid)
returns boolean
language sql
stable
as $$
  select (
    public.is_admin()
    or (public.is_barangay_official() and public.household_in_my_barangay(target_household_id))
    or (public.is_household() and public.current_user_household_id() = target_household_id)
  )
$$;

create or replace function public.is_assigned_rescuer(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rescue_assignments ra
    where ra.rescue_request_id = target_request_id
      and ra.assigned_to = auth.uid()
  )
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_barangay_id() to authenticated;
grant execute on function public.current_user_household_id() to authenticated;
grant execute on function public.profile_in_my_barangay(uuid) to authenticated;
grant execute on function public.household_in_my_barangay(uuid) to authenticated;
grant execute on function public.request_in_my_barangay(uuid) to authenticated;
grant execute on function public.center_in_my_barangay(uuid) to authenticated;
grant execute on function public.inventory_in_my_barangay(uuid) to authenticated;
grant execute on function public.has_barangay_access(uuid) to authenticated;
grant execute on function public.can_access_household(uuid) to authenticated;
grant execute on function public.is_assigned_rescuer(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_barangay_official() to authenticated;
grant execute on function public.is_rescuer() to authenticated;
grant execute on function public.is_household() to authenticated;
grant execute on function public.can_insert_household(uuid) to authenticated;
grant execute on function public.create_household(uuid, text, text, numeric, numeric, text, text) to authenticated;

alter table public.roles enable row level security;
alter table public.barangays enable row level security;
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.rescue_requests enable row level security;
alter table public.rescue_assignments enable row level security;
alter table public.rescuer_locations enable row level security;
alter table public.evacuation_centers enable row level security;
alter table public.evacuee_records enable row level security;
alter table public.relief_inventory enable row level security;
alter table public.relief_distributions enable row level security;
alter table public.qr_verifications enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
for select to authenticated
using (true);

drop policy if exists roles_manage_admin on public.roles;
create policy roles_manage_admin on public.roles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists barangays_select_authenticated on public.barangays;
create policy barangays_select_authenticated on public.barangays
for select to authenticated
using (true);

drop policy if exists barangays_manage_admin on public.barangays;
create policy barangays_manage_admin on public.barangays
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists profiles_select_scoped on public.profiles;
create policy profiles_select_scoped on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
);

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin on public.profiles
for insert to authenticated
with check (
  public.is_admin()
  or (id = auth.uid() and role = 'household')
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (
  public.is_admin()
  or id = auth.uid()
)
with check (
  public.is_admin()
  or (id = auth.uid() and role = public.current_user_role())
);

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
for delete to authenticated
using (public.is_admin());

drop policy if exists households_select_scoped on public.households;
create policy households_select_scoped on public.households
for select to authenticated
using (
  public.is_admin()
  or public.can_access_household(id)
  or (
    public.is_rescuer()
    and exists (
      select 1
      from public.rescue_requests rr
      join public.rescue_assignments ra on ra.rescue_request_id = rr.id
      where rr.household_id = households.id
        and ra.assigned_to = auth.uid()
    )
  )
);

drop policy if exists households_insert_scoped on public.households;
create policy households_insert_scoped on public.households
for insert to authenticated
with check (
  public.can_insert_household(households.barangay_id)
);

drop policy if exists households_update_scoped on public.households;
create policy households_update_scoped on public.households
for update to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
);

drop policy if exists households_delete_scoped on public.households;
create policy households_delete_scoped on public.households
for delete to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
);

drop policy if exists household_members_select_scoped on public.household_members;
create policy household_members_select_scoped on public.household_members
for select to authenticated
using (
  public.is_admin()
  or public.can_access_household(household_id)
  or profile_id = auth.uid()
  or (
    public.is_rescuer()
    and exists (
      select 1
      from public.rescue_requests rr
      join public.rescue_assignments ra on ra.rescue_request_id = rr.id
      where rr.household_id = household_members.household_id
        and ra.assigned_to = auth.uid()
    )
  )
);

drop policy if exists household_members_insert_scoped on public.household_members;
create policy household_members_insert_scoped on public.household_members
for insert to authenticated
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.household_in_my_barangay(household_id))
);

drop policy if exists household_members_update_scoped on public.household_members;
create policy household_members_update_scoped on public.household_members
for update to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.household_in_my_barangay(household_id))
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.household_in_my_barangay(household_id))
);

drop policy if exists household_members_delete_scoped on public.household_members;
create policy household_members_delete_scoped on public.household_members
for delete to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.household_in_my_barangay(household_id))
);

drop policy if exists rescue_requests_select_scoped on public.rescue_requests;
create policy rescue_requests_select_scoped on public.rescue_requests
for select to authenticated
using (
  public.is_admin()
  or public.has_barangay_access(barangay_id)
  or requested_by = auth.uid()
  or (household_id is not null and public.can_access_household(household_id))
  or public.is_assigned_rescuer(id)
);

drop policy if exists rescue_requests_insert_scoped on public.rescue_requests;
create policy rescue_requests_insert_scoped on public.rescue_requests
for insert to authenticated
with check (
  auth.uid() = requested_by
  and (
    public.is_admin()
    or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
    or (public.is_rescuer() and barangay_id = public.current_user_barangay_id())
    or (public.is_household() and (household_id is null or public.can_access_household(household_id)))
  )
);

drop policy if exists rescue_requests_update_scoped on public.rescue_requests;
create policy rescue_requests_update_scoped on public.rescue_requests
for update to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
  or public.is_assigned_rescuer(id)
  or (requested_by = auth.uid() and status = 'pending')
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
  or public.is_assigned_rescuer(id)
  or (requested_by = auth.uid() and status = 'pending')
);

drop policy if exists rescue_requests_delete_admin on public.rescue_requests;
create policy rescue_requests_delete_admin on public.rescue_requests
for delete to authenticated
using (public.is_admin());

drop policy if exists rescue_assignments_select_scoped on public.rescue_assignments;
create policy rescue_assignments_select_scoped on public.rescue_assignments
for select to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.request_in_my_barangay(rescue_request_id))
  or assigned_to = auth.uid()
);

drop policy if exists rescue_assignments_insert_scoped on public.rescue_assignments;
create policy rescue_assignments_insert_scoped on public.rescue_assignments
for insert to authenticated
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.request_in_my_barangay(rescue_request_id))
);

drop policy if exists rescue_assignments_update_scoped on public.rescue_assignments;
create policy rescue_assignments_update_scoped on public.rescue_assignments
for update to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.request_in_my_barangay(rescue_request_id))
  or assigned_to = auth.uid()
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.request_in_my_barangay(rescue_request_id))
  or assigned_to = auth.uid()
);

drop policy if exists rescue_assignments_delete_scoped on public.rescue_assignments;
create policy rescue_assignments_delete_scoped on public.rescue_assignments
for delete to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.request_in_my_barangay(rescue_request_id))
);

drop policy if exists rescuer_locations_select_scoped on public.rescuer_locations;
create policy rescuer_locations_select_scoped on public.rescuer_locations
for select to authenticated
using (
  public.is_admin()
  or assigned_rescuer_id = auth.uid()
  or (
    public.is_barangay_official()
    and public.profile_in_my_barangay(assigned_rescuer_id)
  )
);

drop policy if exists rescuer_locations_insert_scoped on public.rescuer_locations;
create policy rescuer_locations_insert_scoped on public.rescuer_locations
for insert to authenticated
with check (
  public.is_admin()
  or assigned_rescuer_id = auth.uid()
);

drop policy if exists rescuer_locations_update_scoped on public.rescuer_locations;
create policy rescuer_locations_update_scoped on public.rescuer_locations
for update to authenticated
using (
  public.is_admin()
  or assigned_rescuer_id = auth.uid()
)
with check (
  public.is_admin()
  or assigned_rescuer_id = auth.uid()
);

drop policy if exists rescuer_locations_delete_scoped on public.rescuer_locations;
create policy rescuer_locations_delete_scoped on public.rescuer_locations
for delete to authenticated
using (
  public.is_admin()
  or assigned_rescuer_id = auth.uid()
);

drop policy if exists evacuation_centers_select_authenticated on public.evacuation_centers;
create policy evacuation_centers_select_authenticated on public.evacuation_centers
for select to authenticated
using (true);

drop policy if exists evacuation_centers_manage_scoped on public.evacuation_centers;
create policy evacuation_centers_manage_scoped on public.evacuation_centers
for all to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and barangay_id = public.current_user_barangay_id())
);

drop policy if exists evacuee_records_select_scoped on public.evacuee_records;
create policy evacuee_records_select_scoped on public.evacuee_records
for select to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.center_in_my_barangay(evacuation_center_id))
  or (household_id is not null and public.can_access_household(household_id))
);

drop policy if exists evacuee_records_manage_scoped on public.evacuee_records;
create policy evacuee_records_manage_scoped on public.evacuee_records
for all to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.center_in_my_barangay(evacuation_center_id))
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.center_in_my_barangay(evacuation_center_id))
);

drop policy if exists relief_inventory_select_scoped on public.relief_inventory;
create policy relief_inventory_select_scoped on public.relief_inventory
for select to authenticated
using (
  public.is_admin()
  or (barangay_id is not null and public.has_barangay_access(barangay_id))
  or (evacuation_center_id is not null and public.center_in_my_barangay(evacuation_center_id))
);

drop policy if exists relief_inventory_manage_scoped on public.relief_inventory;
create policy relief_inventory_manage_scoped on public.relief_inventory
for all to authenticated
using (
  public.is_admin()
  or (
    public.is_barangay_official()
    and (
      (barangay_id is not null and barangay_id = public.current_user_barangay_id())
      or (evacuation_center_id is not null and public.center_in_my_barangay(evacuation_center_id))
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_barangay_official()
    and (
      (barangay_id is not null and barangay_id = public.current_user_barangay_id())
      or (evacuation_center_id is not null and public.center_in_my_barangay(evacuation_center_id))
    )
  )
);

drop policy if exists relief_distributions_select_scoped on public.relief_distributions;
create policy relief_distributions_select_scoped on public.relief_distributions
for select to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.inventory_in_my_barangay(relief_inventory_id))
  or (household_id is not null and public.can_access_household(household_id))
);

drop policy if exists relief_distributions_manage_scoped on public.relief_distributions;
create policy relief_distributions_manage_scoped on public.relief_distributions
for all to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and public.inventory_in_my_barangay(relief_inventory_id))
)
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.inventory_in_my_barangay(relief_inventory_id))
);

drop policy if exists qr_verifications_select_scoped on public.qr_verifications;
create policy qr_verifications_select_scoped on public.qr_verifications
for select to authenticated
using (
  public.is_admin()
  or (public.is_barangay_official() and household_id is not null and public.household_in_my_barangay(household_id))
  or (household_id is not null and public.can_access_household(household_id))
);

drop policy if exists qr_verifications_insert_scoped on public.qr_verifications;
create policy qr_verifications_insert_scoped on public.qr_verifications
for insert to authenticated
with check (
  public.is_admin()
  or (public.is_barangay_official() and household_id is not null and public.household_in_my_barangay(household_id))
);

drop policy if exists qr_verifications_update_admin on public.qr_verifications;
create policy qr_verifications_update_admin on public.qr_verifications
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists qr_verifications_delete_admin on public.qr_verifications;
create policy qr_verifications_delete_admin on public.qr_verifications
for delete to authenticated
using (public.is_admin());

drop policy if exists notifications_select_scoped on public.notifications;
create policy notifications_select_scoped on public.notifications
for select to authenticated
using (
  public.is_admin()
  or recipient_profile_id = auth.uid()
);

drop policy if exists notifications_insert_scoped on public.notifications;
create policy notifications_insert_scoped on public.notifications
for insert to authenticated
with check (
  public.is_admin()
  or (public.is_barangay_official() and public.profile_in_my_barangay(recipient_profile_id))
);

drop policy if exists notifications_update_scoped on public.notifications;
create policy notifications_update_scoped on public.notifications
for update to authenticated
using (
  public.is_admin()
  or recipient_profile_id = auth.uid()
)
with check (
  public.is_admin()
  or recipient_profile_id = auth.uid()
);

drop policy if exists notifications_delete_admin on public.notifications;
create policy notifications_delete_admin on public.notifications
for delete to authenticated
using (public.is_admin());

drop policy if exists activity_logs_select_scoped on public.activity_logs;
create policy activity_logs_select_scoped on public.activity_logs
for select to authenticated
using (
  public.is_admin()
  or (
    public.is_barangay_official()
    and actor_profile_id is not null
    and public.profile_in_my_barangay(actor_profile_id)
  )
);

drop policy if exists activity_logs_insert_scoped on public.activity_logs;
create policy activity_logs_insert_scoped on public.activity_logs
for insert to authenticated
with check (
  actor_profile_id = auth.uid()
  and (actor_role is null or actor_role = public.current_user_role())
);

drop policy if exists activity_logs_update_admin on public.activity_logs;
create policy activity_logs_update_admin on public.activity_logs
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists activity_logs_delete_admin on public.activity_logs;
create policy activity_logs_delete_admin on public.activity_logs
for delete to authenticated
using (public.is_admin());

commit;
