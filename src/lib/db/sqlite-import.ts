import { SupabaseClient } from '@supabase/supabase-js';

export interface SQLiteImportData {
  customers: any[];
  products: any[];
}

export interface ImportResult {
  customerCount: number;
  productCount: number;
}

const BATCH_SIZE = 100;

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

export async function seedShopFromSQLite(
  supabase: SupabaseClient,
  shopId: string,
  data: SQLiteImportData
): Promise<ImportResult> {
  // 1. Insert customers and create mapping
  const customerMap: Record<number, string> = {}; // SQLite ID -> Supabase ID
  
  for (let i = 0; i < data.customers.length; i += BATCH_SIZE) {
    const batch = data.customers.slice(i, i + BATCH_SIZE);
    const { data: inserted, error: customerError } = await supabase
      .from('customer')
      .insert(batch.map((c: any) => ({
        name: c.name || 'Unknown',
        phone: c.phone || '',
        debt: Number(c.debt) || 0,
        shop_id: shopId
      })))
      .select();
    
    if (customerError) throw customerError;
    inserted?.forEach((c, index) => {
      customerMap[batch[index].id] = c.id;
    });
  }

  // 2. Handle Units
  const { data: existingUnits } = await supabase.from('unit').select('id, name');
  const unitMap: Record<string, string> = {}; // Name to ID
  existingUnits?.forEach(u => {
    unitMap[u.name.toLowerCase()] = u.id;
  });

  // 3. Handle Tags
  const uniqueTags = Array.from(new Set(data.products.map((p: any) => p.type).filter(Boolean))) as string[];
  const tagMap: Record<string, string> = {}; // Name to ID
  if (uniqueTags.length > 0) {
    const { data: insertedTags, error: tagError } = await supabase
      .from('product_tag')
      .insert(uniqueTags.map(name => ({ name, shop_id: shopId })))
      .select();
    
    if (tagError) throw tagError;
    insertedTags?.forEach(t => {
      tagMap[t.name] = t.id;
    });
  }

  // 4. Insert Products and create mapping
  const productInserts = data.products.map((p: any) => ({
    name: p.name || 'Unknown',
    default_unit_id: unitMap[normalizeUnit(p.unit)] || unitMap['piece'] || null,
    mass_price: Number(p.pricePerMass) || 0,
    mass: Number(p.mass) || 0,
    default_price: Number(p.priceForCustomer) || 0,
    price_for_frequent_customer: Number(p.priceForWorker) || 0,
    shop_id: shopId
  }));

  const productNameMap: Record<string, string> = {}; // Name -> Supabase ID
  const insertedProducts: any[] = [];
  for (let i = 0; i < productInserts.length; i += BATCH_SIZE) {
    const batch = productInserts.slice(i, i + BATCH_SIZE);
    const { data: batchResult, error: productError } = await supabase
      .from('product')
      .insert(batch)
      .select();
    
    if (productError) throw productError;
    if (batchResult) {
      insertedProducts.push(...batchResult);
      batchResult.forEach(p => {
        productNameMap[p.name] = p.id;
      });
    }
  }

  // 5. Assign Tags
  const tagAssignments = [];
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    if (p.type && tagMap[p.type]) {
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
      await supabase.from('product_tag_assignment').insert(batch);
    }
  }

  return {
    customerCount: data.customers.length,
    productCount: data.products.length
  };
}
