import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

async function listAllFiles(supabase: any, bucket: string, path: string = ''): Promise<{ name: string, path: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (error) return [];

  let files: { name: string, path: string }[] = [];
  for (const item of data) {
    const itemPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      // It's a directory
      const subFiles = await listAllFiles(supabase, bucket, itemPath);
      files = files.concat(subFiles);
    } else {
      files.push({ name: item.name, path: itemPath });
    }
  }
  return files;
}

export async function POST() {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createAdminClient();

  // 1. Collect all references from DB
  const { data: shops } = await supabase.from('shops').select('logo_url, qr_code_url');
  const { data: products } = await supabase.from('product').select('image_url');

  const allUrls = new Set<string>();
  shops?.forEach(s => {
    if (s.logo_url) allUrls.add(s.logo_url);
    if (s.qr_code_url) allUrls.add(s.qr_code_url);
  });
  products?.forEach(p => {
    if (p.image_url) allUrls.add(p.image_url);
  });

  const buckets = ['shop-logos', 'product-images', 'payment-qrs', 'order-attachments'];
  const results = {
    deletedCount: 0,
    errors: [] as string[],
    scannedCount: 0
  };

  for (const bucketName of buckets) {
    const files = await listAllFiles(supabase, bucketName);
    results.scannedCount += files.length;

    const toDelete: string[] = [];

    for (const file of files) {
      // Check if any stored URL contains the bucket/path combination
      // Supabase storage URLs look like: .../storage/v1/object/public/[bucket]/[path]
      const referenceToken = `${bucketName}/${file.path}`;
      let isReferenced = false;
      
      for (const url of allUrls) {
        if (url.includes(referenceToken)) {
          isReferenced = true;
          break;
        }
      }

      if (!isReferenced) {
        toDelete.push(file.path);
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.storage.from(bucketName).remove(toDelete);
      if (deleteError) {
        results.errors.push(`Error deleting from ${bucketName}: ${deleteError.message}`);
      } else {
        results.deletedCount += toDelete.length;
      }
    }
  }

  return NextResponse.json(results);
}
