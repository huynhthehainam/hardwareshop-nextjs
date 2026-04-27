import { createClient } from './client';

export type BucketName = 'shop-logos' | 'product-images' | 'order-attachments';

/**
 * Uploads a file to a specified Supabase storage bucket.
 * @param bucket - The name of the bucket
 * @param path - The path within the bucket (including filename)
 * @param file - The File object to upload
 * @returns The public URL (if public) or the path
 */
export async function uploadFile(bucket: BucketName, path: string, file: File) {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600'
    });

  if (error) throw error;

  // For shop-logos and product-images, we always want the public URL
  if (bucket === 'shop-logos' || bucket === 'product-images') {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    return publicUrl;
  }

  // For private buckets, return the path (which will need a signed URL or proxy to view)
  return data.path;
}
