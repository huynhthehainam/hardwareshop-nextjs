import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProductList from './ProductList';

export default async function ProductsPage() {
  const { role, systemRole } = await requireAuth();

  // Based on user request: "this page is available for shop_admin"
  // Usually staff also need to see products, but following strict instruction here.
  // Note: system_admin should also likely have access for maintenance.
  if (role !== 'admin' && systemRole !== 'system_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="py-2">
      <ProductList />
    </div>
  );
}
