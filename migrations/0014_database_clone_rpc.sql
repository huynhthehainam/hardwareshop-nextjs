CREATE OR REPLACE FUNCTION public.get_table_names()
RETURNS TABLE (table_schema text, table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT table_schema::text, table_name::text
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND table_schema = 'public';
$$;

COMMENT ON FUNCTION public.get_table_names() IS 'Returns a list of base tables in the public schema for database cloning purposes.';
