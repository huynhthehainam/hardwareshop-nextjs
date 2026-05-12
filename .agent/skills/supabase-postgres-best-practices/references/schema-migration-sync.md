# Schema Synchronization Mandate

## Mandatory Rule: Schema/Migration Synchronization

**Any and all changes to the database schema (tables, functions, views, policies, functions, or indexes) MUST be reflected in the migration scripts (`migrations/0001_initial_schema.sql` or subsequent files) IMMEDIATELY upon verification.**

Failure to synchronize database changes with migration scripts leads to:
1.  **Drift:** Environments will diverge between local, staging, and production.
2.  **Deployment Failure:** CI/CD pipelines and automated deployments will fail when attempting to recreate the schema.
3.  **Loss of History:** Migration history becomes unreliable, making it impossible to audit or roll back database schema changes.

### Procedural Enforcement

Before any schema modification:
1.  **Plan:** Identify all affected tables, functions, or RLS policies.
2.  **Execute (Database):** Perform the SQL change in the database.
3.  **Execute (Migration):** Immediately update the corresponding migration script.
4.  **Validate:** Confirm that the migration script, when applied, produces the expected schema state.

**Do not consider a task complete until the migration script is updated and verified.**
