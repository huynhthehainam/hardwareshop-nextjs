import { getProducts } from '@/lib/db';
import ProductImageUpload from './ProductImageUpload';
import { requireAuth } from '@/lib/auth';

export default async function ProductImagesPage() {
  await requireAuth();
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <ProductImageUpload products={products} />
    </div>
  );
}
