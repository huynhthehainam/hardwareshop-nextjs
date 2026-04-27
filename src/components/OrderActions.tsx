'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderPDF from './OrderPDF';
import { Order, OrderDetail, Product, Customer } from '@/types';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const emptySubscribe = () => () => {};

export default function OrderActions({ 
  order, 
  details, 
  customer, 
  products 
}: { 
  order: Order, 
  details: OrderDetail[], 
  customer: Customer, 
  products: Product[] 
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isReverting, setIsReverting] = React.useState(false);

  if (!isClient) return <Button disabled>{t('loadingPdf')}</Button>;

  const handleRevert = async () => {
    const confirmed = window.confirm(`${t('revertOrder')}?`);
    if (!confirmed) return;

    setIsReverting(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/revert`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success(t('orderReverted'));
        router.refresh();
        return;
      }

      if (response.status === 409) {
        toast.error(t('orderAlreadyReverted'));
        router.refresh();
        return;
      }

      throw new Error('Failed to revert order');
    } catch {
      toast.error(t('orderRevertFailed'));
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="flex space-x-2">
      <PDFDownloadLink
        document={<OrderPDF order={order} details={details} customer={customer} products={products} locale={locale} />}
        fileName={`invoice-${order.id.slice(0, 8)}.pdf`}
      >
        {({ loading }) => (
          <Button
            variant="outline"
            disabled={loading || Boolean(order.deleted_at)}
            className="rounded-xl border-[#D1FAE5] bg-white text-[#047857] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#059669] hover:bg-[#ECFDF5] hover:text-[#065F46] hover:shadow-md"
          >
            {loading ? t('generatingPdf') : t('downloadInvoice')}
          </Button>
        )}
      </PDFDownloadLink>
      <Button
        onClick={() => window.print()}
        className="rounded-xl bg-[#059669] text-white shadow-md shadow-emerald-700/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#047857] hover:shadow-lg hover:shadow-emerald-700/30"
      >
        {t('printPage')}
      </Button>
      <Button
        variant="destructive"
        disabled={Boolean(order.deleted_at) || isReverting}
        onClick={handleRevert}
        className="rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:text-red-800 hover:shadow-md"
      >
        {isReverting ? t('revertingOrder') : t('revertOrder')}
      </Button>
    </div>
  );
}
