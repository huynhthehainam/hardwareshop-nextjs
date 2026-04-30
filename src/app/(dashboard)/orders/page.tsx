import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Plus, 
} from 'lucide-react';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import { requireAuth } from '@/lib/auth';
import OrderList from './OrderList';

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  await requireAuth();
  const { search } = await searchParams;
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#064E3B] tracking-tight">{t('ordersManagementTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('ordersManagementSubtitle')}</p>
        </div>
        <Button asChild className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl px-6 h-12 shadow-lg shadow-[#F97316]/20 transition-all hover:scale-[1.02]">
          <Link href="/orders/new">
            <Plus className="w-5 h-5 mr-2" />
            {t('createNewOrder')}
          </Link>
        </Button>
      </div>

      <OrderList initialSearch={search} />
    </div>
  );
}
