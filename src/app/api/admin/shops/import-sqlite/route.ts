import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: Request) {
  const { systemRole } = await requireAuth();
  
  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const address = formData.get('address') as string;

    if (!file || !name) {
      return NextResponse.json({ error: 'File and shop name are required' }, { status: 400 });
    }

    // Save file to temp
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = join(tmpdir(), `import-${Date.now()}.db`);
    writeFileSync(tempPath, buffer);

    // Extract data using python script
    let data;
    try {
      const scriptPath = join(process.cwd(), 'extract_customers.py');
      const output = execSync(`python "${scriptPath}" "${tempPath}"`, { encoding: 'utf-8' });
      data = JSON.parse(output);
      
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      throw new Error(`Failed to extract data: ${err.message}`);
    } finally {
      // Clean up temp file
      try { unlinkSync(tempPath); } catch (e) {}
    }

    if (!data.customers || !data.products) {
      throw new Error('Invalid data returned from extraction script');
    }

    const supabase = await createClient();

    // 1. Create the shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({ name, phone, address })
      .select()
      .single();

    if (shopError) throw shopError;

    // 2. Insert customers in batches
    const BATCH_SIZE = 100;
    const customerInserts = data.customers.map((c: any) => ({
      name: c.name || 'Unknown',
      phone: c.phone || '',
      debt: Number(c.debt) || 0,
      shop_id: shop.id
    }));

    for (let i = 0; i < customerInserts.length; i += BATCH_SIZE) {
      const batch = customerInserts.slice(i, i + BATCH_SIZE);
      const { error: customerError } = await supabase
        .from('customer')
        .insert(batch);
      
      if (customerError) {
        console.error('Error inserting customer batch:', customerError);
        throw customerError;
      }
    }

    // 3. Handle Units
    const { data: existingUnits } = await supabase.from('unit').select('id, name');
    const unitMap: Record<string, string> = {}; // Name to ID
    existingUnits?.forEach(u => {
      unitMap[u.name.toLowerCase()] = u.id;
    });

    const UNIT_PREDICTIONS: Record<string, string> = {
      'cái': 'piece', 'cai': 'piece', 'viên': 'piece', 'vien': 'piece', 'Viên': 'piece', 'viển': 'piece', 'trái': 'piece',
      'kg': 'kilogram', 'kilogram': 'kilogram',
      'mét': 'meter', 'met': 'meter', 'm': 'meter', 'mét ': 'meter',
      'bộ': 'set',
      'hop': 'box', 'hộp': 'box',
      'cuộn': 'roll', 'cuon': 'roll',
      'bịch': 'bag', 'bich': 'bag',
      'cây': 'stick', 'cay': 'stick',
      'lon': 'can',
      'chai': 'bottle',
      'tấm': 'sheet', 'tâm': 'sheet',
      'lit': 'liter', 'lít': 'liter',
      'lạng': 'tael'
    };

    const UNIT_TYPES: Record<string, string> = {
      'piece': 'count', 'set': 'count', 'roll': 'count', 'bag': 'count', 'stick': 'count', 'can': 'count', 'bottle': 'count', 'sheet': 'count', 'box': 'count',
      'kilogram': 'mass', 'tael': 'mass',
      'meter': 'length',
      'liter': 'volume'
    };

    const normalizeUnit = (u: string) => {
      if (!u) return 'piece';
      const trimmed = u.trim().toLowerCase();
      return UNIT_PREDICTIONS[trimmed] || trimmed;
    };

    // Identify unique units needed
    const neededUnits = new Set<string>();
    data.products.forEach((p: any) => {
      const normalized = normalizeUnit(p.unit);
      if (!unitMap[normalized]) {
        neededUnits.add(normalized);
      }
    });

    // Create new units if needed
    if (neededUnits.size > 0) {
      const { data: newUnits, error: unitError } = await supabase
        .from('unit')
        .insert(Array.from(neededUnits).map(name => ({ 
          name, 
          type: UNIT_TYPES[name] || 'count' 
        })))
        .select();
      
      if (unitError) throw unitError;
      newUnits?.forEach(u => {
        unitMap[u.name.toLowerCase()] = u.id;
      });
    }

    // 4. Handle Tags
    const uniqueTags = Array.from(new Set(data.products.map((p: any) => p.type).filter(Boolean))) as string[];
    const tagMap: Record<string, string> = {}; // Name to ID
    if (uniqueTags.length > 0) {
      const { data: insertedTags, error: tagError } = await supabase
        .from('product_tag')
        .insert(uniqueTags.map(name => ({ name, shop_id: shop.id })))
        .select();
      
      if (tagError) throw tagError;
      insertedTags?.forEach(t => {
        tagMap[t.name] = t.id;
      });
    }

    // 5. Insert Products
    const productInserts = data.products.map((p: any) => ({
      name: p.name || 'Unknown',
      default_unit_id: unitMap[normalizeUnit(p.unit)] || unitMap['piece'],
      mass_price: Number(p.pricePerMass) || 0,
      mass: Number(p.mass) || 0,
      default_price: Number(p.priceForCustomer) || 0,
      price_for_frequent_customer: Number(p.priceForWorker) || 0,
      shop_id: shop.id
    }));

    const insertedProducts: any[] = [];
    for (let i = 0; i < productInserts.length; i += BATCH_SIZE) {
      const batch = productInserts.slice(i, i + BATCH_SIZE);
      const { data: batchResult, error: productError } = await supabase
        .from('product')
        .insert(batch)
        .select();
      
      if (productError) {
        console.error('Error inserting product batch:', productError);
        throw productError;
      }
      if (batchResult) insertedProducts.push(...batchResult);
    }

    // 6. Assign Tags
    const tagAssignments = [];
    for (let i = 0; i < data.products.length; i++) {
      const p = data.products[i];
      if (p.type && tagMap[p.type]) {
        // Find the inserted product by index (assuming order is preserved)
        // Actually, let's be safer and use the name or some identifier if possible, 
        // but order should be preserved in the insert.
        const insertedProduct = insertedProducts[i];
        if (insertedProduct) {
          tagAssignments.push({
            product_id: insertedProduct.id,
            tag_id: tagMap[p.type]
          });
        }
      }
    }

    if (tagAssignments.length > 0) {
      for (let i = 0; i < tagAssignments.length; i += BATCH_SIZE) {
        const batch = tagAssignments.slice(i, i + BATCH_SIZE);
        const { error: assignmentError } = await supabase
          .from('product_tag_assignment')
          .insert(batch);
        
        if (assignmentError) {
          console.error('Error assigning tags:', assignmentError);
          // Non-critical, but good to know
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      shop, 
      customerCount: customerInserts.length,
      productCount: productInserts.length
    });

  } catch (error) {
    console.error('[IMPORT_SQLITE_ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
