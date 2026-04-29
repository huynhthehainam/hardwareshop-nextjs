# Multi-Tenant Supabase RBAC Implementation Plan

## Overview

This plan defines authentication, authorization, and shop management architecture for a multi-tenant application using Supabase.

### Core Requirements

* Use `system_role` in Supabase Auth `app_metadata` for platform-wide admins
* `system_admin` users can manage all shops globally
* `shop_admin` users can manage assigned shops only
* `shop_staff` users have limited operational access
* Users without `system_role` are treated as shop-level users
* Shop-specific roles are stored in `user_shops`
* Shop Management page is accessible only to:

  * `system_admin`
  * `shop_admin`

---

# 1. Authentication Model

## System Admin Role (Global)

Stored in Supabase Auth metadata:

```ts
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    system_role: "system_admin"
  }
});
```

## Rules

### `system_role === system_admin`

* Full platform access
* Can create/edit/delete shops
* Can assign shop admins
* Can manage all users

### `system_role` missing/null

* User is NOT system-level admin
* User defaults to shop-level permissions
* Role resolved via `user_shops`

---

# 2. Database Schema

## `shops`

```sql
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## `user_shops`

Maps users to shops and their role in each shop.

```sql
create type shop_role as enum (
  'shop_admin',
  'shop_staff'
);

create table user_shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  role shop_role not null,
  created_at timestamptz default now(),
  unique(user_id, shop_id)
);
```

---

# 3. Authorization Resolution Logic

## Frontend/User Session Flow

### Step 1: Get authenticated user

```ts
const { data: { user } } = await supabase.auth.getUser();
```

---

### Step 2: Check global system role

```ts
const systemRole = user?.app_metadata?.system_role;
```

---

### Step 3: Resolve shop roles if not system admin

```ts
const { data: shopRoles } = await supabase
  .from("user_shops")
  .select("shop_id, role")
  .eq("user_id", user.id);
```

---

## Effective Permission Model

| Condition      | Access                   |
| -------------- | ------------------------ |
| `system_admin` | Full platform            |
| `shop_admin`   | Assigned shop management |
| `shop_staff`   | Operational shop access  |
| No role        | Denied                   |

---

# 4. Shop Management Page Access Control

## Allowed:

* `system_admin`
* `shop_admin`

## Denied:

* `shop_staff`

---

## Frontend Guard Example

```ts
const canManageShop =
  user.app_metadata?.system_role === "system_admin" ||
  shopRoles.some(r => r.role === "shop_admin");

if (!canManageShop) {
  redirect("/unauthorized");
}
```

---

# 5. Row Level Security Policies

## Enable RLS

```sql
alter table shops enable row level security;
alter table user_shops enable row level security;
```

---

## Helper Function: Check system admin

```sql
create function is_system_admin()
returns boolean
language sql
security definer
as $$
  select auth.jwt() -> 'app_metadata' ->> 'system_role' = 'system_admin';
$$;
```

---

## Helper Function: Check shop role

```sql
create function has_shop_role(target_shop uuid, allowed_roles shop_role[])
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from user_shops
    where user_id = auth.uid()
      and shop_id = target_shop
      and role = any(allowed_roles)
  );
$$;
```

---

## Shop Read Policy

```sql
create policy "View accessible shops"
on shops
for select
using (
  is_system_admin()
  or has_shop_role(id, array['shop_admin','shop_staff']::shop_role[])
);
```

---

## Shop Management Policy

```sql
create policy "Manage shops"
on shops
for all
using (
  is_system_admin()
  or has_shop_role(id, array['shop_admin']::shop_role[])
);
```

---

# 6. Admin Features

## System Admin Capabilities

* Create shops
* Edit all shops
* Delete shops
* Assign/remove shop admins
* Assign staff
* Cross-shop analytics

---

## Shop Admin Capabilities

* Update own shop settings
* Manage staff in owned shops
* View shop reports
* Cannot create platform-wide admins
* Cannot access other shops

---

## Shop Staff Capabilities

* Access operational features only
* Cannot access shop management page
* Cannot manage users

---

# 7. API Layer Recommendations

## Backend middleware:

### Check:

* JWT validity
* `system_role`
* `user_shops`
* Requested `shop_id`

---

## Example middleware logic:

```ts
if (system_role === "system_admin") allow();
else if (userShopRole === "shop_admin") allow();
else deny();
```

---

# 8. UI Pages Structure

## Pages

### `/admin/shops`

* System admin dashboard
* All shops management

### `/shop/:shopId/manage`

* Shop admin management page
* Staff management
* Shop settings

### `/shop/:shopId/dashboard`

* Staff operational dashboard

---

# 9. User Creation Workflow

## Create System Admin

```ts
await supabase.auth.admin.createUser({...});
await supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    system_role: "system_admin"
  }
});
```

---

## Create Shop Admin/Staff

### Steps:

1. Create auth user
2. Insert into `user_shops`

```sql
insert into user_shops (user_id, shop_id, role)
values ('USER_ID', 'SHOP_ID', 'shop_admin');
```

---

# 10. Security Best Practices

## Must Do

* Enforce RLS on all tenant tables
* Never trust frontend-only role checks
* Use `system_role` only for global roles
* Use `user_shops` for tenant roles
* Audit all admin actions
* Restrict service role key to backend only

---

## Avoid

* Storing shop roles only in JWT
* Hardcoding permissions in frontend
* Allowing shop admins to escalate privileges
* Bypassing RLS with client-side logic

---

# Final Architecture Summary

## Global Role Source:

### Supabase Auth Metadata

* `system_admin`

---

## Shop Role Source:

### `user_shops`

* `shop_admin`
* `shop_staff`

---

## Permission Hierarchy:

```txt
system_admin
 └── shop_admin
      └── shop_staff
```

---

# Recommended Next Steps

## Build order:

1. Create DB schema
2. Configure RLS
3. Implement user creation flows
4. Build auth middleware
5. Create shop management UI
6. Add role guards
7. Add audit logs
8. Test permission boundaries

---

# Outcome

This model provides:

* Secure multi-tenant RBAC
* Global admin separation
* Flexible shop-level permissions
* Scalable enterprise architecture
* Clean Supabase-native implementation
