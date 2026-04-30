'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Eye, 
  Calendar,
  User,
  CreditCard,
  Search,
  Loader2,
  ArrowUp,
  X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { Customer, Order } from '@/types';

type OrderWithCustomer = Order & { customer?: Customer | null };

const LIMIT = 20;

export default function OrderList({ initialSearch = '' }: { initialSearch?: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<{
    orders: OrderWithCustomer[];
    loading: boolean;
    hasMore: boolean;
    offset: number;
  }>({
    orders: [],
    loading: false,
    hasMore: true,
    offset: 0
  });
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (state.loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && state.hasMore) {
        setState(prev => ({ ...prev, offset: prev.offset + LIMIT }));
      }
    });
    
    if (node) observer.current.observe(node);
  }, [state.loading, state.hasMore]);

  const fetchOrders = useCallback(async (currentOffset: number, currentSearch: string, sDate: string, eDate: string, incDeleted: boolean, isInitial: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, ...(isInitial ? { orders: [], offset: 0, hasMore: true } : {}) }));
    try {
      let url = `/api/orders?limit=${LIMIT}&offset=${currentOffset}&search=${encodeURIComponent(currentSearch)}`;
      if (sDate) url += `&startDate=${sDate}`;
      if (eDate) url += `&endDate=${eDate}`;
      if (incDeleted) url += `&includeDeleted=true`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const { data, count } = await res.json();
      
      setState(prev => ({
        ...prev,
        orders: isInitial ? data : [...prev.orders, ...data],
        hasMore: (isInitial ? data.length : prev.orders.length + data.length) < (count || 0),
        loading: false
      }));
    } catch {
      toast.error(t('errLoadOrders'));
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(0, debouncedSearchTerm, startDate, endDate, includeDeleted, true);
  }, [debouncedSearchTerm, startDate, endDate, includeDeleted, fetchOrders]);

  useEffect(() => {
    if (state.offset > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOrders(state.offset, debouncedSearchTerm, startDate, endDate, includeDeleted);
    }
  }, [state.offset, debouncedSearchTerm, startDate, endDate, includeDeleted, fetchOrders]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const { orders, loading } = state;

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] group-focus-within:text-[#059669] transition-colors" />
              <Input
                placeholder={t('searchOrdersPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
              />
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
              <div className="flex items-center space-x-2 bg-[#F8FAFC] p-1 px-3 rounded-xl border border-[#F1F5F9]">
                <Calendar className="w-4 h-4 text-[#94A3B8]" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none h-9 w-36 text-sm focus:ring-0 p-0"
                />
                <span className="text-[#CBD5E1]">—</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none h-9 w-36 text-sm focus:ring-0 p-0"
                />
                {(startDate || endDate) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full hover:bg-slate-200 ml-1" 
                    onClick={clearDateFilters}
                    title={t('clearFilters')}
                  >
                    <X className="h-3 w-3 text-slate-500" />
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-white p-2 px-3 rounded-xl border border-[#F1F5F9] transition-colors">
                <Checkbox 
                  id="includeDeleted" 
                  checked={includeDeleted} 
                  onCheckedChange={(checked) => setIncludeDeleted(checked === true)}
                  className="border-[#CBD5E1] data-[state=checked]:bg-[#059669] data-[state=checked]:border-[#059669]"
                />
                <Label htmlFor="includeDeleted" className="text-sm font-medium text-[#475569] cursor-pointer">
                  {t('includeRevertedOrders')}
                </Label>
              </div>
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
                {orders.length === 0 && !loading ? (
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
                  <>
                    {orders.map((order, index) => (
                      <TableRow 
                        key={order.id} 
                        ref={index === orders.length - 1 ? lastElementRef : null}
                        className={`hover:bg-[#F8FAFC] border-b border-[#F1F5F9] transition-colors group ${order.deleted_at ? 'opacity-60 bg-slate-50' : ''}`}
                      >
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
                          ${order.total_cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center text-[#475569] font-medium">
                            <CreditCard className="w-4 h-4 mr-2 opacity-40" />
                            ${order.deposit.toLocaleString()}
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
                    ))}
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center">
                          <Loader2 className="w-8 h-8 text-[#059669] animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
        <Button 
          onClick={scrollToTop}
          className="w-12 h-12 rounded-full bg-white shadow-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] p-0 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
