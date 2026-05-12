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

export async function POST(request: Request) {
  try {
    const { systemRole } = await requireAuth();
    
    if (systemRole !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file || !name) {
      return NextResponse.json({ error: 'Missing name or file' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Create shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({ name })
      .select()
      .single();

    if (shopError) throw shopError;

    // 2. Process SQLite file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), `import-${Date.now()}.db`);
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

    // 3. Centralized import logic
    const importResult = await seedShopFromSQLite(supabase, shop.id, data);

    return NextResponse.json({ 
      success: true, 
      shop, 
      ...importResult
    });

  } catch (error) {
    console.error('[IMPORT_SQLITE_ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
