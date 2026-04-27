# Database Migrations

This folder contains the SQL needed to create the database schema used by the app.

Files:

- `0001_initial_schema.sql`: creates the core tables, foreign keys, indexes, and baseline Supabase RLS policies used by the current app.

Suggested usage:

```sql
\i migrations/0001_initial_schema.sql
```

If you are applying this in Supabase, you can also paste the file into the SQL editor or use it as the first migration in your migration workflow.
