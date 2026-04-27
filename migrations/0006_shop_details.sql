-- Add shop details columns
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Update existing shop if any
UPDATE public.shops 
SET phone = '+84 123 456 789', 
    address = '123 Main St, Hardware City',
    logo_url = 'https://api.dicebear.com/7.x/initials/svg?seed=HS'
WHERE name IS NOT NULL AND phone IS NULL;
