import { getProducts, getCustomers } from '@/lib/db';
import OrderForm from '@/components/OrderForm';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import type { Customer, Product } from '@/types';

export default async function NewOrderPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);
  let products: Product[] = [];
  let customers: Customer[] = [];
  
  try {
    products = await getProducts();
    customers = await getCustomers();
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t('createNewOrder')}</h2>
      <OrderForm products={products} customers={customers} />
    </div>
  );
}
