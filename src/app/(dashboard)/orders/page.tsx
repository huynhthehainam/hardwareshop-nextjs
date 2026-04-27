import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOrders } from '@/lib/db';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  MoreHorizontal,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import type { Customer, Order } from '@/types';

export default async function OrdersPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);
  type OrderWithCustomer = Order & { customer?: Customer | null };
  let orders: OrderWithCustomer[] = [];
  try {
    orders = await getOrders();
  } catch (e) {
    console.error(e);
  }

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

      <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input 
                placeholder={t('searchOrdersPlaceholder')} 
                className="pl-10 rounded-xl border-[#E2E8F0] focus:border-[#059669] focus:ring-[#059669]/10 h-11"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-[#E2E8F0] text-[#475569] h-11">
                <Filter className="w-4 h-4 mr-2" />
                {t('filters')}
              </Button>
              <Button variant="outline" className="rounded-xl border-[#E2E8F0] text-[#475569] h-11">
                <Calendar className="w-4 h-4 mr-2" />
                {t('dateRange')}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#F1F5F9] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="font-bold text-[#475569] py-4">{t('orderId')}</TableHead>
                  <TableHead className="font-bold text-[#475569] py-4">{t('customer')}</TableHead>
                  <TableHead className="font-bold text-[#475569] py-4">{t('totalCost')}</TableHead>
                  <TableHead className="font-bold text-[#475569] py-4">{t('depositLabel')}</TableHead>
                  <TableHead className="font-bold text-[#475569] py-4">{t('date')}</TableHead>
                  <TableHead className="text-right font-bold text-[#475569] py-4">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-[#94A3B8]">
                      <div className="flex flex-col items-center">
                        <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-medium text-lg">{t('noOrdersFound')}</p>
                        <p className="text-sm">{t('startFirstOrder')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className={`hover:bg-[#F8FAFC] border-b border-[#F1F5F9] transition-colors group ${order.deleted_at ? 'opacity-60 bg-slate-50' : ''}`}>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`${order.deleted_at ? 'bg-slate-200 text-slate-500' : 'bg-[#ECFDF5] text-[#059669]'} border-none font-mono font-bold px-3 py-1 rounded-lg w-fit`}>
                            #{order.id.slice(0, 8).toUpperCase()}
                          </Badge>
                          {order.deleted_at && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-2 w-fit">
                              {t('reverted')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="font-bold text-[#064E3B]">{order.customer?.name || t('walkInCustomer')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-extrabold text-[#064E3B] text-lg">
                        ${order.total_cost}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center text-[#475569] font-medium">
                          <CreditCard className="w-4 h-4 mr-2 opacity-40" />
                          ${order.deposit}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-[#64748B] font-medium">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button variant="ghost" asChild size="sm" className="text-[#059669] hover:bg-[#ECFDF5] rounded-lg">
                          <Link href={`/orders/${order.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewDetails')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
