import { createClient } from '@/lib/supabase/server';
import { getProducts, getShop } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrderActions from '@/components/OrderActions';
import { Badge } from '@/components/ui/badge';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import { requireAuth } from '@/lib/auth';
import { 
  User, 
  CreditCard, 
  Calendar, 
  Receipt, 
  Package,
  ArrowRight
} from 'lucide-react';

interface OrderDetailWithProduct {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_id: string | null;
  price: number;
  product: {
    id: string;
    name: string;
  } | null;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { shopId, systemRole } = await requireAuth();
  const locale = await getLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const { id } = await params;
  const { data: order, error: orderError } = await supabase
    .from('order')
    .select('*, customer:customer_id(*)')
    .eq('id', id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Security check: ensure user belongs to the shop of this order
  if (systemRole !== 'system_admin' && order.shop_id !== shopId) {
    notFound(); // or forbidden
  }

  const shop = order.shop_id ? await getShop(order.shop_id) : null;

  const debtImpact = order.total_cost - order.deposit;
  const customerDebtAfterOrder = order.debt_after_order ?? debtImpact;

  const { data: detailsData, error: detailsError } = await supabase
    .from('order_detail')
    .select('id, order_id, product_id, quantity, unit_id, price, product:product_id(id, name)')
    .eq('order_id', order.id);

  const details = (detailsData ?? []) as OrderDetailWithProduct[];

  const products = await getProducts(order.shop_id);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-4xl font-extrabold text-[#064E3B] tracking-tight">{t('orderDetailsTitle')}</h2>
            <Badge className="bg-[#ECFDF5] text-[#059669] border-none font-mono font-bold px-3 py-1 rounded-lg">
              #{order.id.slice(0, 8).toUpperCase()}
            </Badge>
            {order.deleted_at ? (
              <Badge className="bg-red-100 text-red-700 border-none font-bold px-3 py-1 rounded-lg">
                {t('reverted')}
              </Badge>
            ) : null}
          </div>
          <p className="text-[#64748B] font-medium">{t('orderDetailsSubtitle')}</p>
        </div>
        <OrderActions 
          order={order} 
          details={details || []} 
          customer={order.customer} 
          products={products} 
          shop={shop}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-[#059669]" />
              </div>
              <CardTitle className="text-xl font-bold text-[#064E3B]">{t('customerInformation')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
              <span className="text-[#64748B] font-semibold">{t('name')}</span>
              <span className="font-bold text-[#064E3B]">{order.customer?.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#F1F5F9]">
              <span className="text-[#64748B] font-semibold">{t('phone')}</span>
              <span className="font-bold text-[#064E3B]">{order.customer?.phone || t('na')}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#64748B] font-semibold flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {t('datePlaced')}
              </span>
              <span className="font-bold text-[#064E3B]">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            {order.deleted_at ? (
              <div className="flex justify-between items-center py-2 border-t border-[#F1F5F9]">
                <span className="text-[#64748B] font-semibold">{t('deletedAt')}</span>
                <span className="font-bold text-red-600">{new Date(order.deleted_at).toLocaleDateString()}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-[#064E3B] text-white">
          <CardHeader className="bg-[#059669] px-8 py-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl font-bold">{t('financialSummary')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-emerald-100/70 font-semibold">{t('totalCost')}</span>
              <span className="text-xl font-black">${order.total_cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-emerald-100/70 font-semibold flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                {t('depositPaid')}
              </span>
              <span className="text-xl font-black text-emerald-400">-${order.deposit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 mt-2">
              <span className="text-white font-bold uppercase tracking-wider">{t('newDebtImpact')}</span>
              <span className={`text-3xl font-black ${debtImpact > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                ${debtImpact.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-white/10">
              <span className="text-emerald-100/70 font-semibold">{t('customerDebtAfterOrder')}</span>
              <span className={`text-xl font-black ${customerDebtAfterOrder > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                ${customerDebtAfterOrder.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-[#059669]" />
            </div>
            <CardTitle className="text-xl font-bold text-[#064E3B]">{t('orderLineItems')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                <TableHead className="px-8 py-4 font-bold text-[#475569]">{t('product')}</TableHead>
                <TableHead className="py-4 font-bold text-[#475569]">{t('quantity')}</TableHead>
                <TableHead className="py-4 font-bold text-[#475569]">{t('price')}</TableHead>
                <TableHead className="text-right px-8 py-4 font-bold text-[#475569]">{t('total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailsError || details.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-[#94A3B8]">
                    {t('noOrderItems')}
                  </TableCell>
                </TableRow>
              ) : (
                details.map((detail) => (
                  <TableRow key={detail.id} className="hover:bg-[#F8FAFC] border-b border-[#F1F5F9]">
                    <TableCell className="px-8 py-4 font-bold text-[#064E3B]">
                      {detail.product?.name || t('unknownProduct')}
                    </TableCell>
                    <TableCell className="py-4 text-[#64748B] font-medium">x{detail.quantity}</TableCell>
                    <TableCell className="py-4 text-[#64748B] font-medium">${detail.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right px-8 py-4 font-extrabold text-[#064E3B]">
                      ${(detail.quantity * detail.price).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
