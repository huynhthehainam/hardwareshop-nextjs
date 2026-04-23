# 🧠 Project Plan: Multi-Tenant Order App

## 1. Overview
A multi-tenant (shop-based) order management system built with:
- Next.js (App Router, fullstack)
- Supabase (DB, Auth, SSO)
- Bootstrap + shadcn/ui [UI Pro style](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- Edge-friendly architecture

### Prerequisite task
- Install UI pro skill by https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Check Supabase MCP server for creating or updating database SSO via MCP

## 2. Core Concepts

### Multi-tenancy
- Each tenant = `shop`
- Users belong to 0..n shops
- Staff MUST belong to a shop
- Admin can manage all shops

### Roles
- `admin`
  - Create/manage shops
  - Manage users
  - Full access
- `staff`
  - Belongs to a shop
  - Create orders
  - Print orders

---

## 3. Tech Decisions

### Why Next.js only
- Use Route Handlers instead of separate backend
- Use Server Actions for mutations
- Use Supabase client for DB/Auth
- No long-running jobs (not needed here)

### Supabase Usage
- Auth: SSO + email login
- DB: Postgres
- RLS: enforce tenant isolation
- Storage: optional for PDF

### Cache Strategy
- React cache + Next.js fetch cache
- Use `revalidateTag` for order updates
- Avoid stale data in order flow

---

## 4. Database Design

### tables

#### users (managed by Supabase Auth)
- id (uuid, same as auth.users.id)
- name
- phone
- status
- created_at
- updated_at

#### shops
- id (uuid)
- name

#### user_shops
- user_id
- shop_id
- role (admin | staff)

#### unit
- id
- name
- type
- is_main
- conversion_rate

#### product
- id
- name
- default_unit_id

#### customer
- id
- phone
- name
- debt

#### customer_debt_history
- id
- customer_id
- change_amount
- reason
- created_at

#### order
- id
- shop_id
- customer_id
- deposit
- total_cost
- created_by
- created_at

#### order_detail
- id
- order_id
- product_id
- quantity
- unit_id
- price

---

## 5. Business Logic

### Order Calculation
- total_cost = sum(quantity * price)
- new_debt = old_debt + total_cost - deposit

### Constraints
- Staff must have shop_id
- Admin bypass shop restriction

---

## 6. Auth & Guard

### Login
- Supabase SSO + email

### Middleware
- Check session
- Redirect if not logged in

### Authorization
- Server-side validation (NEVER trust client)
- Use RLS + server checks

---

## 7. Features

### Auth
- Login page
- Auto SSO redirect

### Shop
- Admin: CRUD shop
- Assign users

### Product & Unit
- CRUD basic

### Customer
- CRUD + debt tracking

### Order
- Create order
- Add products
- Calculate totals
- Save order

### Print Order
- Generate PDF
- Include:
  - product list
  - total_cost
  - old_debt
  - deposit
  - new_debt
- Include QR:
  - URL: `/order/{id}`

---

## 8. UI Structure

### Pages
- /login
- /dashboard
- /shops (admin)
- /products
- /customers
- /orders
- /orders/[id]

### Components
- OrderForm
- ProductSelector
- DebtSummary
- PrintButton
- QRCodeDisplay

---

## 9. API Design (Next.js Route Handlers)

- POST /api/order
- GET /api/order/:id
- POST /api/customer
- GET /api/products

---

## 10. PDF Generation
- Use server-side rendering (React PDF or HTML -> PDF)
- QR code generated from order URL

---

## 11. Security

- Use Supabase RLS:
  - user must belong to shop
- Validate all inputs server-side
- Prevent cross-tenant access

---

## 12. Deployment

- Vercel
- Supabase hosted DB
- Edge compatible

---

## 13. Future Enhancements

- Realtime order updates
- Notifications
- Analytics dashboard