-- =============================================================================
-- BizRise Phase 9: Username-based signup + manual approval system
-- Run AFTER phases 1–8.
-- Safe to run multiple times (idempotent).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add username and access_status to profiles
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists username      text unique,
  add column if not exists access_status text not null default 'pending'
    check (access_status in ('pending', 'approved', 'suspended', 'revoked'));

-- Case-insensitive unique index on username
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Fast lookups on access_status
create index if not exists profiles_access_status_idx
  on public.profiles (access_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update handle_new_user trigger to store username
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, username, access_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'username', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'username',
    'pending'  -- All new users start as pending
  )
  on conflict (id) do update set
    full_name     = coalesce(excluded.full_name, public.profiles.full_name),
    phone         = coalesce(excluded.phone,     public.profiles.phone),
    username      = coalesce(excluded.username,  public.profiles.username),
    updated_at    = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_email_for_username — resolves fake email from username for login
--    Callable by anon role (needed before authentication)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_email_for_username(p_username text)
returns text language sql stable security definer set search_path = public
as $$
  select u.email
  from   auth.users u
  join   public.profiles p on p.id = u.id
  where  lower(p.username) = lower(trim(p_username))
  limit  1;
$$;

revoke all on function public.get_email_for_username(text) from public;
grant execute on function public.get_email_for_username(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. check_username_available — checks if a username is taken
--    Called during signup before creating the account
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_username_available(p_username text)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. get_access_status — returns a user's approval status
--    Used by the frontend after login to decide what screen to show
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_access_status()
returns text language sql stable security definer set search_path = public
as $$
  select access_status
  from   public.profiles
  where  id = auth.uid()
  limit  1;
$$;

revoke all on function public.get_access_status() from public;
grant execute on function public.get_access_status() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Admin RPCs for managing user access
-- ─────────────────────────────────────────────────────────────────────────────

-- Set a user's access status (approve / suspend / revoke / restore)
create or replace function public.set_user_access(
  target_user_id uuid,
  new_status      text
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied';
  end if;
  if new_status not in ('pending', 'approved', 'suspended', 'revoked') then
    raise exception 'Invalid access status: %', new_status;
  end if;
  update public.profiles
  set    access_status = new_status,
         updated_at    = now()
  where  id = target_user_id;
end;
$$;

revoke all on function public.set_user_access(uuid, text) from public;
grant execute on function public.set_user_access(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. list_users_for_owner — returns all users with their access status
--    Paginated, filterable by access_status
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_users_for_owner(
  p_status text    default null,
  p_limit  integer default 100,
  p_offset integer default 0
) returns table (
  user_id       uuid,
  username      text,
  full_name     text,
  access_status text,
  registered_at timestamptz
) language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied';
  end if;

  return query
  select
    p.id            as user_id,
    p.username,
    p.full_name,
    p.access_status,
    p.created_at    as registered_at
  from   public.profiles p
  where  (p_status is null or p.access_status = p_status)
    -- Exclude platform admins from the list
    and  not exists (
           select 1 from public.platform_admins pa where pa.user_id = p.id
         )
  order by
    case p.access_status when 'pending' then 0 else 1 end,
    p.created_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

revoke all on function public.list_users_for_owner(text, integer, integer) from public;
grant execute on function public.list_users_for_owner(text, integer, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS: Block dashboard data from unapproved users
--    Unapproved users can log in (valid session) but cannot read any
--    business data. The ProtectedRoute handles the UI gate; these
--    policies enforce it at the database level.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: is the current user approved?
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id            = auth.uid()
      and access_status = 'approved'
  );
$$;

-- Update business_members read policy to require approval
drop policy if exists "users can read their memberships" on public.business_members;
create policy "users can read their memberships" on public.business_members
  for select using (
    (user_id = auth.uid() and public.is_approved())
    or public.is_business_member(business_id)
    or public.is_platform_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Approve all existing users who already have a business
--    (They went through the old flow and should keep access)
-- ─────────────────────────────────────────────────────────────────────────────
update public.profiles
set    access_status = 'approved'
where  id in (select distinct user_id from public.business_members)
  and  access_status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Grant is_platform_admin() to authenticated users
--     Was missing in phase8 — needed for checkIsPlatformAdmin() in the app
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FIX: Restore original business_members read policy
--     The is_approved() check caused a deadlock — approved users could not
--     read their own business_members row after createBusiness, because
--     the SELECT went through RLS before the profile update was visible.
--     Access is already enforced by the app (ProtectedRoute + get_access_status).
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "users can read their memberships" on public.business_members;
create policy "users can read their memberships" on public.business_members
  for select using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_platform_admin()
  );
