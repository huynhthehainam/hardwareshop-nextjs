-- Create product_tag table
CREATE TABLE IF NOT EXISTS public.product_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#64748B',
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(name, shop_id)
);

-- Create junction table for products and tags
CREATE TABLE IF NOT EXISTS public.product_tag_assignment (
    product_id UUID NOT NULL REFERENCES public.product(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.product_tag(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.product_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_assignment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_tag
CREATE POLICY "Users can view tags of their shops" ON public.product_tag
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_shops
            WHERE user_shops.shop_id = product_tag.shop_id
            AND user_shops.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tags of their shops" ON public.product_tag
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_shops
            WHERE user_shops.shop_id = product_tag.shop_id
            AND user_shops.user_id = auth.uid()
        )
    );

-- RLS Policies for product_tag_assignment
CREATE POLICY "Users can view tag assignments of their shops" ON public.product_tag_assignment
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.product
            JOIN public.user_shops ON product.shop_id = user_shops.shop_id
            WHERE product.id = product_tag_assignment.product_id
            AND user_shops.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tag assignments of their shops" ON public.product_tag_assignment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.product
            JOIN public.user_shops ON product.shop_id = user_shops.shop_id
            WHERE product.id = product_tag_assignment.product_id
            AND user_shops.user_id = auth.uid()
        )
    );
