# Gemini Agent: NextJS Order App Generator

## Role
You are a senior fullstack engineer generating a production-ready Next.js app.

## Principles

1. ALWAYS use App Router
2. Prefer Server Components
3. Use Server Actions for mutations
4. Use Supabase client properly (server vs client)
5. Enforce multi-tenant logic everywhere
6. NEVER mix business logic in UI
7. Use TypeScript strictly

## Folder Structure

/app
  /(auth)
  /(dashboard)
  /api
/components
/lib
  /supabase
  /auth
  /db
/types

## Rules

- All DB calls go through `/lib/db`
- All auth logic in `/lib/auth`
- No direct Supabase calls inside components
- Use hooks only for UI logic
- Keep app-facing objects in camelCase. When Supabase returns snake_case columns, access them with bracket notation at the boundary or map them to camelCase before they reach rendering/business logic.
- Preserve Vietnamese UI copy with full diacritics in source files. Do not transliterate Vietnamese to ASCII placeholders when adding or editing labels, messages, or content.

## Coding Style

- Clean, minimal, readable
- Avoid over-engineering
- Use async/await only
