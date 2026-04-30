'use client';

import { 
  Customer, 
  CustomerDebtHistory, 
  Order 
} from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { interpolateMessage } from '@/lib/i18n/translate';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  History, 
  ShoppingCart, 
  ArrowLeft,
  Calendar,
  FileText,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerDetail({ 
  customer, 
  debtHistory, 
  orders 
}: { 
  customer: Customer; 
  debtHistory: CustomerDebtHistory[]; 
  orders: Order[];
}) {
  const { locale, t } = useI18n();

  const getDebtReason = (entry: CustomerDebtHistory) => {
    if (entry.reason_key === 'order_created') {
      return interpolateMessage(t('debtReasonOrderCreated'), {
        orderId: entry.reason_params?.orderId,
      });
    }

    if (entry.reason_key === 'order_reverted') {
      return interpolateMessage(t('debtReasonOrderReverted'), {
        orderId: entry.reason_params?.orderId,
      });
    }

    return t('debtReasonFallback');
  };

  const activeOrdersCount = orders.filter(o => !o.deleted_at).length;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" asChild className="rounded-2xl bg-white shadow-sm hover:bg-[#059669] hover:text-white transition-all cursor-pointer">
          <Link href="/customers">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-black text-[#064E3B] tracking-tight">{customer.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <div className="flex items-center text-[#64748B] font-bold">
              <Phone className="w-4 h-4 mr-2" />
              {customer.phone}
            </div>
            <div className="w-1 h-1 bg-[#CBD5E1] rounded-full" />
            <div className="text-xs font-black text-[#059669] uppercase tracking-widest">
              ID: {customer.id}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-[0.16em] ${customer.is_frequent_customer ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
              {customer.is_frequent_customer ? t('frequentCustomer') : t('regularCustomer')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-br from-[#064E3B] to-[#059669] p-10 text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl">
                  <User className="w-12 h-12 text-white" />
                </div>
                <CardTitle className="text-2xl font-black">{customer.name}</CardTitle>
                <p className="text-emerald-100 font-bold opacity-80 mt-1">{customer.phone}</p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="p-8 bg-[#F8FAFC] rounded-[2rem] border border-[#F1F5F9] text-center">
                <p className="text-xs font-black text-[#64748B] uppercase tracking-[0.2em] mb-3">{t('currentDebt')}</p>
                <p className={`text-4xl font-black ${customer.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ${customer.debt.toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-[#F1F5F9]">
                      <ShoppingCart className="w-5 h-5 text-[#059669]" />
                    </div>
                    <span className="font-bold text-[#475569]">{t('navOrders')}</span>
                  </div>
                  <span className="text-xl font-black text-[#064E3B]">{activeOrdersCount}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-[#F1F5F9]">
                      <History className="w-5 h-5 text-[#059669]" />
                    </div>
                    <span className="font-bold text-[#475569]">{t('debtHistory')}</span>
                  </div>
                  <span className="text-xl font-black text-[#064E3B]">{debtHistory.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="debt" className="space-y-8">
            <TabsList className="inline-flex h-auto w-fit self-start rounded-[2rem] border border-[#CFE9DD] bg-white/95 p-2 shadow-[0_14px_34px_rgba(6,78,59,0.08)] backdrop-blur-sm gap-2">
              <TabsTrigger value="debt" className="min-w-[12rem] flex-none rounded-[1.5rem] px-5 py-4 text-[#6A8C7D] hover:bg-[#F3FBF7] hover:text-[#064E3B] data-[state=active]:bg-[#059669] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition-all font-black uppercase tracking-widest text-xs cursor-pointer">
                <History className="w-4 h-4 mr-2" />
                {t('debtHistory')}
              </TabsTrigger>
              <TabsTrigger value="orders" className="min-w-[12rem] flex-none rounded-[1.5rem] px-5 py-4 text-[#6A8C7D] hover:bg-[#F3FBF7] hover:text-[#064E3B] data-[state=active]:bg-[#059669] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition-all font-black uppercase tracking-widest text-xs cursor-pointer">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t('orderHistory')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="outline-none">
              <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="px-10 py-8 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  <CardTitle className="text-xl font-black text-[#064E3B]">{t('debtHistory')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-[#F8FAFC]">
                      <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                        <TableHead className="px-10 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('date')}</TableHead>
                        <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('reason')}</TableHead>
                        <TableHead className="px-10 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('changeAmount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debtHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-64 text-center text-[#94A3B8] font-bold">
                            {t('noDebtHistory')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        debtHistory.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                            <TableCell className="px-10 py-6">
                              <div className="flex items-center text-[#64748B] font-bold">
                                <Calendar className="w-4 h-4 mr-2 text-[#94A3B8]" />
                                {new Date(entry.created_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-6 font-black text-[#064E3B]">
                              {getDebtReason(entry)}
                            </TableCell>
                            <TableCell className={`px-10 py-6 text-right font-black text-lg ${entry.change_amount >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {entry.change_amount >= 0 ? '+' : '-'}${Math.abs(entry.change_amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="outline-none">
              <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="px-10 py-8 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  <CardTitle className="text-xl font-black text-[#064E3B]">{t('orderHistory')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-[#F8FAFC]">
                      <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                        <TableHead className="px-10 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('orderId')}</TableHead>
                        <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('date')}</TableHead>
                        <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('total')}</TableHead>
                        <TableHead className="px-10 py-6 w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-64 text-center text-[#94A3B8] font-bold">
                            {t('noOrderHistory')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id} className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                            <TableCell className="px-10 py-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                  <FileText className="w-5 h-5 text-[#059669]" />
                                </div>
                                <div className="flex flex-col items-start gap-2">
                                  <span className="font-mono text-sm font-black text-[#064E3B]">#{order.id.slice(0, 8).toUpperCase()}</span>
                                  {order.deleted_at ? (
                                    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-700">
                                      {t('reverted')}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-6">
                              <div className="text-[#64748B] font-bold">
                                {new Date(order.created_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-6 text-right">
                              <span className="text-lg font-black text-[#064E3B]">${order.total_cost.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="px-10 py-6 text-right">
                              <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-[#059669] hover:text-white transition-all cursor-pointer">
                                <Link href={`/orders/${order.id}`}>
                                  <ChevronRight className="w-6 h-6" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
