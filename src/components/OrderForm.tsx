'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product, Customer, CustomerDebtHistory, Order, Unit } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { interpolateMessage } from '@/lib/i18n/translate';
import { 
  User, 
  Package, 
  Trash2, 
  Plus, 
  Calculator, 
  CreditCard,
  CheckCircle2,
  History
} from 'lucide-react';

interface OrderItem {
  productId: string;
  quantity: number;
  unitId: string;
  price: number;
}

type OrderItemFieldValue = OrderItem[keyof OrderItem];
type DebtHistoryResponse = CustomerDebtHistory;
type OrderHistoryResponse = Pick<Order, 'id' | 'customer_id' | 'total_cost' | 'deposit' | 'created_at'>;

interface DebtHistoryEntry {
  id: string;
  customerId: string;
  changeAmount: number;
  reasonKey: string;
  reasonParams?: Record<string, string | number | boolean | null> | null;
  createdAt: string;
}

interface OrderHistoryEntry {
  id: string;
  customerId: string;
  totalCost: number;
  deposit: number;
  createdAt: string;
}

const mapDebtHistoryEntry = (entry: DebtHistoryResponse): DebtHistoryEntry => ({
  id: entry.id,
  customerId: entry['customer_id'],
  changeAmount: entry['change_amount'],
  reasonKey: entry['reason_key'],
  reasonParams: entry['reason_params'],
  createdAt: entry['created_at'],
});

const mapOrderHistoryEntry = (entry: OrderHistoryResponse): OrderHistoryEntry => ({
  id: entry.id,
  customerId: entry['customer_id'],
  totalCost: entry['total_cost'],
  deposit: entry.deposit,
  createdAt: entry['created_at'],
});

export default function OrderForm({ 
  products, 
  customers,
  units,
}: { 
  products: Product[], 
  customers: Customer[],
  units: Unit[],
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deposit, setDeposit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [debtHistoryOpen, setDebtHistoryOpen] = useState(false);
  const [debtHistoryLoading, setDebtHistoryLoading] = useState(false);
  const [debtHistory, setDebtHistory] = useState<DebtHistoryEntry[]>([]);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitId: '', price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: OrderItemFieldValue) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const getUnitLabel = (unit: Unit) => {
    if (locale === 'vi' && unit.name_vi?.trim()) {
      return unit.name_vi;
    }

    return unit.name;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId,
      unitId: product?.default_unit_id ?? newItems[index]?.unitId ?? '',
      price: product?.default_price ?? newItems[index]?.price ?? 0,
    };
    setItems(newItems);
  };

  const totalCost = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const currentCustomer = customers.find(c => c.id === customerId);
  const oldDebt = currentCustomer?.debt || 0;
  const newDebt = oldDebt + totalCost - deposit;

  useEffect(() => {
    if (!debtHistoryOpen || !customerId) return;

    const loadDebtHistory = async () => {
      setDebtHistoryLoading(true);

      try {
        const response = await fetch(`/api/customers/${customerId}/debt-history`);
        if (!response.ok) throw new Error('Failed to load debt history');
        const payload = (await response.json()) as { history: DebtHistoryResponse[] };
        setDebtHistory(payload.history.map(mapDebtHistoryEntry));
      } catch {
        toast.error(t('genericError'));
      } finally {
        setDebtHistoryLoading(false);
      }
    };

    void loadDebtHistory();
  }, [customerId, debtHistoryOpen, t]);

  useEffect(() => {
    if (!orderHistoryOpen || !customerId) return;

    const loadOrderHistory = async () => {
      setOrderHistoryLoading(true);

      try {
        const response = await fetch(`/api/customers/${customerId}/orders`);
        if (!response.ok) throw new Error('Failed to load order history');
        const payload = (await response.json()) as { history: OrderHistoryResponse[] };
        setOrderHistory(payload.history.map(mapOrderHistoryEntry));
      } catch {
        toast.error(t('genericError'));
      } finally {
        setOrderHistoryLoading(false);
      }
    };

    void loadOrderHistory();
  }, [customerId, orderHistoryOpen, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return toast.error(t('errSelectCustomer'));
    if (items.length === 0) return toast.error(t('errAddItem'));
    
    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, items, deposit, totalCost }),
      });
      
      if (response.ok) {
        toast.success(t('orderCreated'));
        router.push('/orders');
      } else {
        toast.error(t('orderCreateFailed'));
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const getDebtReason = (entry: DebtHistoryEntry) => {
    if (entry.reasonKey === 'order_created') {
      return interpolateMessage(t('debtReasonOrderCreated'), {
        orderId: entry.reasonParams?.orderId,
      });
    }

    if (entry.reasonKey === 'order_reverted') {
      return interpolateMessage(t('debtReasonOrderReverted'), {
        orderId: entry.reasonParams?.orderId,
      });
    }

    return t('debtReasonFallback');
  };

  const handleViewOrderDetails = (orderId: string) => {
    setOrderHistoryOpen(false);
    router.push(`/orders/${orderId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer & Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-[#059669]" />
                </div>
                <CardTitle className="text-xl font-bold text-[#064E3B]">{t('customerDetails')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#475569]">{t('searchCustomer')}</Label>
                <Select onValueChange={setCustomerId} value={customerId}>
                  <SelectTrigger className="h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10">
                    <SelectValue placeholder={t('selectFromDirectory')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0]">
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#064E3B]">{c.name}</span>
                          <span className="text-xs text-[#64748B]">{c.phone}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {currentCustomer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('currentDebt')}</p>
                      <p className="text-xl font-black text-red-600 mt-1">${oldDebt.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('phone')}</p>
                      <p className="text-xl font-bold text-[#064E3B] mt-1">{currentCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center rounded-xl border-[#D1FAE5] bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]"
                      onClick={() => setDebtHistoryOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {t('viewDebtHistory')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center rounded-xl border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE]"
                      onClick={() => setOrderHistoryOpen(true)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      {t('viewOrderHistory')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6 flex flex-row items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-[#059669]" />
                </div>
                <CardTitle className="text-xl font-bold text-[#064E3B]">{t('orderItems')}</CardTitle>
              </div>
              <Button type="button" onClick={addItem} className="bg-[#059669] hover:bg-[#047857] text-white rounded-xl px-4 h-10 cursor-pointer shadow-md shadow-emerald-600/20">
                <Plus className="w-4 h-4 mr-2" />
                {t('addItem')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                      <TableHead className="px-8 py-4 font-bold text-[#475569]">{t('product')}</TableHead>
                      <TableHead className="w-28 py-4 font-bold text-[#475569]">{t('qty')}</TableHead>
                      <TableHead className="w-40 py-4 font-bold text-[#475569]">{t('unit')}</TableHead>
                      <TableHead className="w-36 py-4 font-bold text-[#475569]">{t('price')}</TableHead>
                      <TableHead className="w-36 text-right px-8 py-4 font-bold text-[#475569]">{t('subtotal')}</TableHead>
                      <TableHead className="w-16 py-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-[#F8FAFC] border-b border-[#F1F5F9] group">
                        <TableCell className="px-8 py-4">
                          <Select 
                            value={item.productId} 
                            onValueChange={(val) => handleProductChange(index, val)}
                          >
                            <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10">
                              <SelectValue placeholder={t('productPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id} className="cursor-pointer">{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-4">
                          <Input 
                            type="number" 
                            className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                            value={item.quantity} 
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <Select
                            value={item.unitId}
                            onValueChange={(val) => updateItem(index, 'unitId', val)}
                          >
                            <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10">
                              <SelectValue placeholder={t('unitPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id} className="cursor-pointer">
                                  {getUnitLabel(unit)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">$</span>
                            <Input 
                              type="number" 
                              className="pl-7 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                              value={item.price} 
                              onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8 py-4 font-extrabold text-[#064E3B]">
                          ${(item.quantity * item.price).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-20 text-[#94A3B8]">
                          <div className="flex flex-col items-center">
                            <Package className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">{t('noItemsTitle')}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-[#064E3B] text-white sticky top-28">
            <CardHeader className="bg-[#059669] px-8 py-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">{t('calculation')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-emerald-100/70 font-medium">
                  <span>{t('totalBillable')}</span>
                  <span className="text-2xl font-black text-white">${totalCost.toLocaleString()}</span>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <Label htmlFor="deposit" className="text-sm font-bold text-emerald-100/70 block mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('paymentReceivedDeposit')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl">$</span>
                    <Input 
                      id="deposit" 
                      type="number" 
                      className="bg-white/10 border-none text-white text-2xl font-black h-14 pl-10 rounded-2xl focus:ring-2 focus:ring-white/20 placeholder:text-white/20" 
                      value={deposit} 
                      onChange={(e) => setDeposit(Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/10 rounded-2xl space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-100/70">
                  <span>{t('currentBalance')}</span>
                  <span>${oldDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-100/70">{t('newDebtImpact')}</span>
                  <span className="text-lg font-black text-orange-400">
                    +${(totalCost - deposit).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-emerald-100/50">{t('finalBalance')}</span>
                  <span className={`text-3xl font-black ${newDebt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${newDebt.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-16 bg-[#F97316] hover:bg-[#EA580C] text-white font-black text-xl rounded-2xl shadow-2xl shadow-orange-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <CheckCircle2 className="w-6 h-6 mr-2" />
                    {t('confirmOrder')}
                  </span>
                )}
              </Button>
              
              <p className="text-center text-xs text-emerald-100/40 font-bold uppercase tracking-widest">
                {t('enforcingIsolation')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={debtHistoryOpen} onOpenChange={setDebtHistoryOpen}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#064E3B]">{t('debtHistory')}</DialogTitle>
            <DialogDescription>{t('debtHistorySubtitle')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-6">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="border-b border-[#F1F5F9]">
                  <TableHead className="font-bold text-[#475569]">{t('date')}</TableHead>
                  <TableHead className="font-bold text-[#475569]">{t('reason')}</TableHead>
                  <TableHead className="text-right font-bold text-[#475569]">{t('changeAmount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-[#94A3B8]">{t('saving')}</TableCell>
                  </TableRow>
                ) : debtHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center text-[#94A3B8]">{t('noDebtHistory')}</TableCell>
                  </TableRow>
                ) : (
                  debtHistory.map((entry) => (
                    <TableRow key={entry.id} className="border-b border-[#F1F5F9]">
                      <TableCell className="text-[#64748B]">
                        {new Date(entry.createdAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </TableCell>
                      <TableCell className="font-medium text-[#064E3B]">{getDebtReason(entry)}</TableCell>
                      <TableCell className={`text-right font-bold ${entry.changeAmount >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {entry.changeAmount >= 0 ? '+' : '-'}${Math.abs(entry.changeAmount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={orderHistoryOpen} onOpenChange={setOrderHistoryOpen}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#064E3B]">{t('orderHistory')}</DialogTitle>
            <DialogDescription>{t('orderHistorySubtitle')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-6">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="border-b border-[#F1F5F9]">
                  <TableHead className="font-bold text-[#475569]">{t('orderId')}</TableHead>
                  <TableHead className="font-bold text-[#475569]">{t('date')}</TableHead>
                  <TableHead className="text-right font-bold text-[#475569]">{t('totalCost')}</TableHead>
                  <TableHead className="text-right font-bold text-[#475569]">{t('balanceDue')}</TableHead>
                  <TableHead className="text-right font-bold text-[#475569]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderHistoryLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-[#94A3B8]">{t('saving')}</TableCell>
                  </TableRow>
                ) : orderHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-[#94A3B8]">{t('noOrderHistory')}</TableCell>
                  </TableRow>
                ) : (
                  orderHistory.map((entry) => (
                    <TableRow key={entry.id} className="border-b border-[#F1F5F9]">
                      <TableCell className="font-mono text-sm font-bold text-[#064E3B]">
                        #{entry.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-[#64748B]">
                        {new Date(entry.createdAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#064E3B]">
                        ${entry.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#B45309]">
                        ${(entry.totalCost - entry.deposit).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => handleViewOrderDetails(entry.id)}
                        >
                          {t('viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
