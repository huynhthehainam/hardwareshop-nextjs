import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { seedShopFromSQLite } from '@/lib/db/sqlite-import';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shopId } = await params;
    const { systemRole } = await requireAuth();
    
    if (systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Verify shop exists
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // 2. Clear existing data (KEEP USERS)
    const { data: shopOrders } = await supabase.from('order').select('id').eq('shop_id', shopId);
    const orderIds = shopOrders?.map(o => o.id) || [];
    if (orderIds.length > 0) {
      await supabase.from('order_detail').delete().in('order_id', orderIds);
    }
    await supabase.from('order').delete().eq('shop_id', shopId);

    const { data: shopProducts } = await supabase.from('product').select('id').eq('shop_id', shopId);
    const productIds = shopProducts?.map(p => p.id) || [];
    if (productIds.length > 0) {
      await supabase.from('product_tag_assignment').delete().in('product_id', productIds);
      await supabase.from('product').delete().eq('shop_id', shopId);
    }
    await supabase.from('product_tag').delete().eq('shop_id', shopId);

    const { data: shopCustomers } = await supabase.from('customer').select('id').eq('shop_id', shopId);
    const customerIds = shopCustomers?.map(c => c.id) || [];
    if (customerIds.length > 0) {
      await supabase.from('customer_debt_history').delete().in('customer_id', customerIds);
      await supabase.from('customer').delete().eq('shop_id', shopId);
    }

    // 3. Process SQLite file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), `restore-${Date.now()}.db`);
    writeFileSync(tempPath, buffer);

    let data;
    try {
      const { stdout } = await execAsync(`python extract_sqlite.py "${tempPath}"`);
      const processedData = JSON.parse(stdout);
      data = {
        customers: processedData.customers || [],
        products: processedData.products || [],
        invoices: processedData.invoices || [],
        invoice_details: processedData.invoice_details || [],
        dept_histories: processedData.dept_histories || []
      } as any;
    } finally {
      unlinkSync(tempPath);
    }

    // 4. Centralized re-seed logic
    const importResult = await seedShopFromSQLite(supabase, shopId, data);

    return NextResponse.json({ 
      success: true, 
      ...importResult
    });

  } catch (error) {
    console.error('[RESTORE_SQLITE_ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
