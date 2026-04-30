import { getProducts, getCustomers, getUnits, getShop } from '@/lib/db';
import OrderForm from '@/components/OrderForm';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import { requireAuth } from '@/lib/auth';
import type { Customer, Product, Unit, Shop } from '@/types';

export default async function NewOrderPage() {
  const { shopId } = await requireAuth();
  const locale = await getLocale();
  const t = createTranslator(locale);
  let products: Product[] = [];
  let customers: Customer[] = [];
  let units: Unit[] = [];
  let shop: Shop | null = null;
  
  try {
    products = await getProducts(shopId);
    customers = await getCustomers();
    units = await getUnits();
    shop = await getShop(shopId);
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">{t('createNewOrder')}</h2>
      <OrderForm products={products} customers={customers} units={units} shop={shop} />
    </div>
  );
}
