# Database Migrations

This folder contains the SQL needed to create the database schema used by the app.

Files:

- `0001_initial_schema.sql`: creates the core tables, foreign keys, indexes, and baseline Supabase RLS policies used by the current app.
- `0002_order_flow_rls.sql`: refines RLS policies for order management.
- `0003_customer_debt_history_templates.sql`: improves debt history tracking.
- `0004_order_debt_snapshot.sql`: snapshots debt state per order.
- `0005_order_revert_soft_delete.sql`: implements soft-delete and revert logic.
- `0006_shop_details.sql`: adds shop contact info and branding columns.
- `0007_atomic_order_rpc.sql`: implements atomic order creation via Postgres function and cascading deletes.

Suggested usage:

```sql
\i migrations/0001_initial_schema.sql
\i migrations/0006_shop_details.sql
\i migrations/0007_atomic_order_rpc.sql
```

If you are applying this in Supabase, you can also paste the file into the SQL editor or use it as the first migration in your migration workflow.
