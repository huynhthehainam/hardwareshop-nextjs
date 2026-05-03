import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getOrders, getDashboardStats } from '@/lib/db';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import type { Customer, Order } from '@/types';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const auth = await requireAuth();

  if (auth.systemRole === 'system_admin') {
    redirect('/admin/shops');
  }
  
  type OrderWithCustomer = Order & { customer?: Customer | null };
  let recentOrders: OrderWithCustomer[] = [];
  let statsData = {
    total_revenue: 0,
    active_orders_count: 0,
    total_customers_count: 0,
    total_debt: 0
  };
  
  try {
    // 1. Get recent 5 orders for the transaction list
    recentOrders = await getOrders(auth.shopId, undefined, 5);
    
    // 2. Get aggregated stats using RPC
    statsData = await getDashboardStats(auth.shopId!);

    console.log('[Dashboard] Optimized data fetched:', { 
      user: auth.user.email,
      recentOrders: recentOrders.length,
      stats: statsData
    });
  } catch (e) {
    console.error('Failed to fetch dashboard data', e);
  }

  const stats = [
    {
      title: t('statTotalRevenueTitle'),
      value: `${t('currencySymbol')}${statsData.total_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      description: t('statTotalRevenueDesc')
    },
    {
      title: t('statActiveOrdersTitle'),
      value: statsData.active_orders_count,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      description: t('statActiveOrdersDesc')
    },
    {
      title: t('statCustomersTitle'),
      value: statsData.total_customers_count,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      description: t('statCustomersDesc')
    },
    {
      title: t('statTotalDebtTitle'),
      value: `${t('currencySymbol')}${statsData.total_debt.toLocaleString()}`,
      icon: AlertCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      description: t('statTotalDebtDesc')
    }
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-[#064E3B] tracking-tight">{t('dashboardAnalyticsTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('dashboardAnalyticsSubtitle')}</p>
        </div>
        <Button asChild className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl px-6 h-12 shadow-lg shadow-[#F97316]/20 transition-all hover:scale-[1.02]">
          <Link href="/orders/new">
            <ShoppingCart className="w-5 h-5 mr-2" />
            {t('createNewOrder')}
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-md rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 ${stat.bg} rounded-2xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wider">{stat.title}</p>
                <div className="text-3xl font-bold text-[#064E3B] mt-1">{stat.value}</div>
                <p className="text-xs text-[#94A3B8] mt-2 font-medium">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
         <Card className="col-span-full lg:col-span-4 border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#059669]" />
                  </div>
                    <div>
                    <CardTitle className="text-xl font-bold text-[#064E3B]">{t('recentTransactionsTitle')}</CardTitle>
                    <p className="text-sm text-[#64748B] font-medium">{t('recentTransactionsSubtitle')}</p>
                  </div>
                </div>
                <Button variant="ghost" asChild className="text-[#059669] hover:bg-[#ECFDF5] rounded-xl">
                  <Link href="/orders">{t('viewAll')}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium">{t('noTransactionsYet')}</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-6 hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#F1F5F9] rounded-full flex items-center justify-center font-bold text-[#475569]">
                          #{order.id.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#064E3B] group-hover:text-[#059669] transition-colors">
                            {t('orderLabel')} #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-[#64748B] font-medium flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {order.customer?.name || t('walkInCustomer')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-[#064E3B]">{t('currencySymbol')}{order.total_cost.toLocaleString()}</p>
                        <p className="text-xs text-[#94A3B8] font-bold flex items-center justify-end">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
         </Card>

         <Card className="col-span-full lg:col-span-3 border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-[#F1F5F9]">
               <CardTitle className="text-xl font-bold text-[#064E3B]">{t('quickActionsTitle')}</CardTitle>
               <p className="text-sm text-[#64748B] font-medium">{t('quickActionsSubtitle')}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <Button variant="outline" asChild className="w-full justify-start h-14 border-[#E2E8F0] hover:border-[#059669] hover:bg-[#ECFDF5] hover:text-[#059669] rounded-2xl px-6 transition-all group cursor-pointer">
                <Link href="/products" className="flex items-center w-full">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-emerald-100 transition-colors">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <span className="font-bold">{t('inventoryManagement')}</span>
                  <ExternalLink className="w-4 h-4 ml-auto opacity-40" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full justify-start h-14 border-[#E2E8F0] hover:border-[#059669] hover:bg-[#ECFDF5] hover:text-[#059669] rounded-2xl px-6 transition-all group cursor-pointer">
                <Link href="/customers" className="flex items-center w-full">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mr-4 group-hover:bg-emerald-100 transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="font-bold">{t('customerDirectory')}</span>
                  <ExternalLink className="w-4 h-4 ml-auto opacity-40" />
                </Link>
              </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
