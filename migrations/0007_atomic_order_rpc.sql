-- Ensure order_detail cascades on delete
ALTER TABLE public.order_detail 
DROP CONSTRAINT IF EXISTS order_detail_order_id_fkey;

ALTER TABLE public.order_detail 
ADD CONSTRAINT order_detail_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public."order"(id) 
ON DELETE CASCADE;

-- Atomic Order Creation Function
CREATE OR REPLACE FUNCTION create_order(
  p_shop_id UUID,
  p_customer_id UUID,
  p_deposit NUMERIC,
  p_total_cost NUMERIC,
  p_created_by UUID,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_debt_after_order NUMERIC;
  v_current_debt NUMERIC;
  v_debt_delta NUMERIC;
  v_item RECORD;
BEGIN
  -- Calculate debt impact
  v_debt_delta := p_total_cost - p_deposit;

  -- Get current debt and calculate next debt
  IF p_customer_id IS NOT NULL AND v_debt_delta <> 0 THEN
    SELECT debt INTO v_current_debt FROM public.customer WHERE id = p_customer_id;
    v_debt_after_order := COALESCE(v_current_debt, 0) + v_debt_delta;
  ELSE
    v_debt_after_order := NULL;
  END IF;

  -- Insert order
  INSERT INTO public."order" (
    shop_id, 
    customer_id, 
    deposit, 
    total_cost, 
    created_by, 
    debt_after_order
  ) VALUES (
    p_shop_id, 
    p_customer_id, 
    p_deposit, 
    p_total_cost, 
    p_created_by, 
    v_debt_after_order
  ) RETURNING id INTO v_order_id;

  -- Insert order details
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity NUMERIC, price NUMERIC, unit_id UUID)
  LOOP
    INSERT INTO public.order_detail (
      order_id, 
      product_id, 
      quantity, 
      price, 
      unit_id
    ) VALUES (
      v_order_id, 
      v_item.product_id, 
      v_item.quantity, 
      v_item.price, 
      v_item.unit_id
    );
  END LOOP;

  -- Update customer debt and history
  IF p_customer_id IS NOT NULL AND v_debt_delta <> 0 THEN
    UPDATE public.customer SET debt = v_debt_after_order WHERE id = p_customer_id;

    INSERT INTO public.customer_debt_history (
      customer_id, 
      change_amount, 
      reason_key, 
      reason_params
    ) VALUES (
      p_customer_id, 
      v_debt_delta, 
      'order_created', 
      jsonb_build_object('orderId', v_order_id)
    );
  END IF;

  RETURN jsonb_build_object('id', v_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
