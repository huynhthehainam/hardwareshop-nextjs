-- Add deleted_at column to customer table for soft delete functionality
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for performance when filtering deleted records
CREATE INDEX IF NOT EXISTS idx_customer_deleted_at ON public.customer(deleted_at) WHERE (deleted_at IS NULL);
