'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { generateOrderPdf } from './OrderPDF';
import { Order, OrderDetail, Product, Customer, Shop, Unit } from '@/types';
import { useSyncExternalStore } from 'react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const emptySubscribe = () => () => {};

export default function OrderActions({ 
  order, 
  details, 
  customer, 
  products,
  units = [],
  shop
}: { 
  order: Order, 
  details: OrderDetail[], 
  customer: Customer, 
  products: Product[],
  units?: Unit[],
  shop: Shop | null
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isReverting, setIsReverting] = React.useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  if (!isClient) return <Button disabled>{t('loadingPdf')}</Button>;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    try {
      await generateOrderPdf({
        order,
        details,
        customer,
        products,
        units,
        locale,
        shop,
      });
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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

  const handleRevertAndEdit = async () => {
    const confirmed = window.confirm(`${t('revertOrder')}?`);
    if (!confirmed) return;

    setIsReverting(true);

    try {
      const response = await fetch(`/api/orders/${order.id}/revert`, {
        method: 'POST',
      });

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(t('orderAlreadyReverted'));
          router.refresh();
          return;
        }
        throw new Error('Failed to revert order');
      }

      const { details } = await response.json();
      
      // Store order details for pre-filling
      localStorage.setItem('editOrderData', JSON.stringify({
        customerId: order.customer_id,
        items: details.map((d: any) => ({
          productId: d.product_id,
          quantity: d.quantity,
          unitId: d.unit_id,
          price: d.price,
          note: d.note
        })),
        deposit: order.deposit,
        isFrequentCustomer: order.is_frequent_customer
      }));

      toast.success(t('orderReverted'));
      router.push('/orders/new');
    } catch {
      toast.error(t('orderRevertFailed'));
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="flex space-x-2" >
      <Button
        variant="outline"
        disabled={isGeneratingPdf || Boolean(order.deleted_at)}
        onClick={handleDownloadPdf}
        className="rounded-xl border-[#D1FAE5] bg-white text-[#047857] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#059669] hover:bg-[#ECFDF5] hover:text-[#065F46] hover:shadow-md"
      >
        {isGeneratingPdf ? t('generatingPdf') : t('downloadInvoice')}
      </Button>
      <Button
        variant="destructive"
        disabled={Boolean(order.deleted_at) || isReverting}
        onClick={handleRevert}
        className="rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-100 hover:text-red-800 hover:shadow-md"
      >
        {isReverting ? t('revertingOrder') : t('revertOrder')}
      </Button>
      <Button
        variant="secondary"
        disabled={Boolean(order.deleted_at) || isReverting}
        onClick={handleRevertAndEdit}
        className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 hover:shadow-md"
      >
        {isReverting ? t('revertingOrder') : t('revertAndEdit')}
      </Button>
    </div>
  );
}
