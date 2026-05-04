'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Product, Customer, CustomerDebtHistory, Order, Unit, Shop } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { interpolateMessage } from '@/lib/i18n/translate';
import CustomerSearch from './CustomerSearch';
import ProductSearch from './ProductSearch';
import { generateOrderPdf } from './OrderPDF';
import { MoneyInput } from '@/components/ui/money-input';
import { 
  User, 
  Package, 
  Trash2, 
  Plus, 
  Calculator, 
  CreditCard,
  CheckCircle2,
  History,
  LayoutGrid,
  Printer,
  Save,
  FileText
} from 'lucide-react';

interface OrderItem {
  productId: string;
  quantity: number;
  unitId: string;
  price: number;
  note?: string;
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
  customers: initialCustomers,
  units,
  shop,
}: { 
  products: Product[], 
  customers: Customer[],
  units: Unit[],
  shop: Shop | null,
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isFrequentCustomer, setIsFrequentCustomer] = useState(false);
  const [deposit, setDeposit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'submit_and_print' | 'submit_only' | 'print_only'>('submit_and_print');
  const [debtHistoryOpen, setDebtHistoryOpen] = useState(false);
  const [debtHistoryLoading, setDebtHistoryLoading] = useState(false);
  const [debtHistory, setDebtHistory] = useState<DebtHistoryEntry[]>([]);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddProductId, setQuickAddProductId] = useState('');
  const [quickAddRows, setQuickAddRows] = useState<{ size: number; quantity: number }[]>(
    [{ size: 0, quantity: 1 }]
  );

  useEffect(() => {
    const editData = localStorage.getItem('editOrderData');
    if (editData) {
      localStorage.removeItem('editOrderData');
      try {
        const parsed = JSON.parse(editData);
        setCustomerId(parsed.customerId);
        setItems(parsed.items);
        setDeposit(parsed.deposit);
        if (parsed.isFrequentCustomer !== undefined) {
          setIsFrequentCustomer(parsed.isFrequentCustomer);
        }
      } catch (e) {
        console.error('Failed to parse editOrderData', e);
      }
    }
  }, []);

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitId: '', price: 0, note: '' }]);
  };

  const handleQuickAddConfirm = () => {
    if (!quickAddProductId) {
      toast.error(t('errSelectProduct'));
      return;
    }
    
    const product = products.find(p => p.id === quickAddProductId);
    if (!product) return;

    const validRows = quickAddRows.filter(r => r.size > 0 && r.quantity > 0);
    if (validRows.length === 0) {
      toast.error(t('errAddItem'));
      return;
    }

    const totalQuantity = validRows.reduce((acc, r) => acc + (r.size * r.quantity), 0);
    const unit = units.find(u => u.id === product.default_unit_id);
    const unitLabel = unit ? getUnitLabel(unit) : '';
    const note = validRows.map(r => `${r.quantity}x${r.size}${unitLabel}`).join(';');

    setItems([...items, {
      productId: quickAddProductId,
      quantity: totalQuantity,
      unitId: product.default_unit_id || '',
      price: getProductPrice(product),
      note: note
    }]);

    setQuickAddOpen(false);
    setQuickAddProductId('');
    setQuickAddRows([{ size: 0, quantity: 1 }]);
  };

  const addQuickAddRow = () => {
    setQuickAddRows([...quickAddRows, { size: 0, quantity: 1 }]);
  };

  const removeQuickAddRow = (index: number) => {
    setQuickAddRows(quickAddRows.filter((_, i) => i !== index));
  };

  const updateQuickAddRow = (index: number, field: 'size' | 'quantity', value: number) => {
    const newRows = [...quickAddRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setQuickAddRows(newRows);
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
    const key = `unit_${unit.name}` as any;
    const translated = t(key);
    return translated === key ? unit.name : translated;
  };

  const getProductPrice = (product: Product) => {
    if (isFrequentCustomer && product.price_for_frequent_customer != null) {
      return product.price_for_frequent_customer;
    }
    return product.default_price || 0;
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId,
      unitId: product?.default_unit_id ?? newItems[index]?.unitId ?? '',
      price: product ? getProductPrice(product) : newItems[index]?.price ?? 0,
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
    
    // Mode: Print Only (Draft)
    if (submitMode === 'print_only') {
      try {
        const draftOrder: Order = {
          id: 'DRAFT',
          shop_id: shop?.id || '',
          customer_id: customerId,
          deposit,
          total_cost: totalCost,
          is_frequent_customer: isFrequentCustomer,
          created_by: '',
          created_at: new Date().toISOString(),
        };

        const details = items.map((item, idx) => ({
          id: `draft-${idx}`,
          order_id: 'DRAFT',
          product_id: item.productId,
          quantity: item.quantity,
          unit_id: item.unitId,
          price: item.price,
          note: item.note,
          product: { name: products.find(p => p.id === item.productId)?.name || '' }
        }));

        await generateOrderPdf({
          order: draftOrder,
          details,
          customer: currentCustomer!,
          products,
          units,
          locale,
          shop,
        });
        toast.success(t('generatingPdf'));
        return;
      } catch (err) {
        toast.error(t('genericError'));
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, items, deposit, totalCost, isFrequentCustomer }),
      });
      
      if (response.ok) {
        const { order, details } = await response.json();
        
        toast.success(t('orderCreated'));

        if (submitMode === 'submit_and_print') {
          try {
            // Add product name to details for PDF
            const detailsWithProduct = details.map((d: any) => ({
              ...d,
              product: { name: products.find(p => p.id === d.product_id)?.name || '' }
            }));

            await generateOrderPdf({
              order,
              details: detailsWithProduct,
              customer: currentCustomer!,
              products,
              units,
              locale,
              shop,
            });
          } catch (pdfErr) {
            console.error('PDF generation failed after submit', pdfErr);
          }
        }

        router.push('/orders');
      } else {
        const errorData = await response.json();
        toast.error(`${t('orderCreateFailed')}: ${errorData.error || t('genericError')}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('genericError');
      toast.error(`${t('genericError')}: ${message}`);
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

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers((currentCustomers) => {
      const exists = currentCustomers.some((entry) => entry.id === customer.id);

      if (exists) {
        return currentCustomers;
      }

      return [...currentCustomers, customer].sort((a, b) => a.name.localeCompare(b.name));
    });
    setCustomerId(customer.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer & Details */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-[#059669]" />
                </div>
                <CardTitle className="text-xl font-bold text-[#064E3B]">{t('customerInformation')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#475569]">{t('searchCustomer')}</Label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <CustomerSearch 
                      customers={customers} 
                      selectedId={customerId} 
                      onSelect={(c) => setCustomerId(c.id)}
                      onCreate={handleCustomerCreated}
                    />
                  </div>
                  <div className="flex items-center space-x-3 bg-[#F8FAFC] px-4 py-2 rounded-2xl border border-[#F1F5F9] shrink-0">
                    <Checkbox 
                      id="is_frequent_customer" 
                      checked={isFrequentCustomer}
                      onCheckedChange={(checked) => setIsFrequentCustomer(!!checked)}
                      className="w-5 h-5 rounded-md border-[#059669] data-[state=checked]:bg-[#059669]"
                    />
                    <Label htmlFor="is_frequent_customer" className="text-sm font-bold text-[#064E3B] cursor-pointer whitespace-nowrap">
                      {t('frequentCustomer')}
                    </Label>
                  </div>
                </div>
              </div>
              
              {currentCustomer && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9]">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('currentDebt')}</p>
                      <p className="text-xl font-black text-red-600 mt-1">{t('currencySymbol')}{oldDebt.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9] space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('phone')}</p>
                          <p className="text-xl font-bold text-[#064E3B] mt-1">{currentCustomer.phone}</p>
                        </div>
                      </div>
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
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setQuickAddOpen(true)} 
                  className="border-[#059669] text-[#059669] hover:bg-[#ECFDF5] rounded-xl px-4 h-10 cursor-pointer shadow-sm"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  {t('quickAdd')}
                </Button>
                <Button type="button" onClick={addItem} className="bg-[#059669] hover:bg-[#047857] text-white rounded-xl px-4 h-10 cursor-pointer shadow-md shadow-emerald-600/20">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addItem')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                      <TableHead className="px-8 py-4 font-bold text-[#475569]">{t('product')}</TableHead>
                      <TableHead className="w-24 py-4 font-bold text-[#475569]">{t('qty')}</TableHead>
                      <TableHead className="w-36 py-4 font-bold text-[#475569]">{t('unit')}</TableHead>
                      <TableHead className="w-44 py-4 font-bold text-[#475569]">{t('price')}</TableHead>
                      <TableHead className="w-48 text-right px-8 py-4 font-bold text-[#475569]">{t('subtotal')}</TableHead>
                      <TableHead className="w-16 py-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-[#F8FAFC] border-b border-[#F1F5F9] group">
                        <TableCell className="px-8 py-4">
                          <ProductSearch 
                            products={products}
                            selectedId={item.productId}
                            onSelect={(val) => handleProductChange(index, val)}
                          />
                          <div className="mt-2">
                            <Input
                              placeholder={t('notePlaceholder')}
                              className="h-8 text-xs rounded-lg border-[#E2E8F0] focus:ring-[#059669]/10 italic"
                              value={item.note || ''}
                              onChange={(e) => updateItem(index, 'note', e.target.value)}
                            />
                          </div>
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
                          <MoneyInput 
                            className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                            value={item.price} 
                            onValueChange={(val) => updateItem(index, 'price', val ?? 0)}
                            currencySymbol={t('currencySymbol')}
                            symbolClassName="text-[#94A3B8]"
                          />
                        </TableCell>
                        <TableCell className="text-right px-8 py-4 font-extrabold text-[#064E3B]">
                          {t('currencySymbol')}{(item.quantity * item.price).toLocaleString()}
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
        <div className="lg:col-span-4 space-y-8">
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
                  <span className="text-2xl font-black text-white">{t('currencySymbol')}{totalCost.toLocaleString()}</span>
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-3">
                    <Label htmlFor="deposit" className="text-sm font-bold text-emerald-100/70 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {t('paymentReceivedDeposit')}
                    </Label>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-3 text-[10px] uppercase tracking-wider font-black bg-white/10 hover:bg-white/20 text-white border-none rounded-lg transition-colors cursor-pointer"
                      onClick={() => setDeposit(totalCost)}
                    >
                      {t('payFull')}
                    </Button>
                  </div>
                  <div className="relative">
                    <MoneyInput 
                      id="deposit" 
                      className="bg-white/10 border-none text-white text-2xl font-black h-14 pl-10 rounded-2xl focus:ring-2 focus:ring-white/20 placeholder:text-white/20" 
                      value={deposit} 
                      onValueChange={(val) => setDeposit(val ?? 0)} 
                      currencySymbol={t('currencySymbol')}
                      symbolClassName="text-white/40 font-black text-xl left-4"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/10 rounded-2xl space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-100/70">
                  <span>{t('currentBalance')}</span>
                  <span>{t('currencySymbol')}{oldDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-100/70">{t('newDebtImpact')}</span>
                  <span className="text-lg font-black text-orange-400">
                    +{t('currencySymbol')}{(totalCost - deposit).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-emerald-100/50">{t('finalBalance')}</span>
                  <span className={`text-3xl font-black ${newDebt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {t('currencySymbol')}{newDebt.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-emerald-100/50 uppercase tracking-widest">{t('submitMode')}</Label>
                <Select value={submitMode} onValueChange={(val: any) => setSubmitMode(val)}>
                  <SelectTrigger className="bg-white/10 border-none text-white h-12 rounded-xl focus:ring-white/20 cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl bg-white text-[#064E3B]">
                    <SelectItem value="submit_and_print" className="cursor-pointer">
                      <div className="flex items-center">
                        <Printer className="w-4 h-4 mr-2 text-[#059669]" />
                        {t('submitAndPrint')}
                      </div>
                    </SelectItem>
                    <SelectItem value="submit_only" className="cursor-pointer">
                      <div className="flex items-center">
                        <Save className="w-4 h-4 mr-2 text-[#059669]" />
                        {t('submitOnly')}
                      </div>
                    </SelectItem>
                    <SelectItem value="print_only" className="cursor-pointer">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-orange-500" />
                        {t('printOnly')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className={`w-full h-16 ${submitMode === 'print_only' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#F97316] hover:bg-[#EA580C]'} text-white font-black text-xl rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
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
                    {submitMode === 'submit_and_print' && <Printer className="w-6 h-6 mr-2" />}
                    {submitMode === 'submit_only' && <CheckCircle2 className="w-6 h-6 mr-2" />}
                    {submitMode === 'print_only' && <FileText className="w-6 h-6 mr-2" />}
                    {submitMode === 'print_only' ? t('printOnly') : t('confirmOrder')}
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
        <DialogContent className="max-w-[96vw] overflow-hidden rounded-2xl p-0 sm:max-w-[1100px]">
          <DialogHeader className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#064E3B]">{t('debtHistory')}</DialogTitle>
            <DialogDescription>{t('debtHistorySubtitle')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-6 scrollbar-emerald">
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
                        {entry.changeAmount >= 0 ? '+' : '-'}{t('currencySymbol')}{Math.abs(entry.changeAmount).toLocaleString()}
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
        <DialogContent className="max-w-[96vw] overflow-hidden rounded-2xl p-0 sm:max-w-[1240px]">
          <DialogHeader className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#064E3B]">{t('orderHistory')}</DialogTitle>
            <DialogDescription>{t('orderHistorySubtitle')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-6 scrollbar-emerald">
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
                        {t('currencySymbol')}{entry.totalCost.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#B45309]">
                        {t('currencySymbol')}{(entry.totalCost - entry.deposit).toLocaleString()}
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

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-[#F1F5F9] bg-[#F8FAFC] px-6 py-5">
            <DialogTitle className="text-xl font-bold text-[#064E3B]">{t('templateAdd')}</DialogTitle>
            <DialogDescription>{t('quickActionsSubtitle')}</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold text-[#475569]">{t('product')}</Label>
                {quickAddProductId && (
                  <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-lg">
                    {t('price')}: {t('currencySymbol')}{getProductPrice(products.find(p => p.id === quickAddProductId)!).toLocaleString()}
                  </span>
                )}
              </div>
              <ProductSearch 
                products={products}
                selectedId={quickAddProductId}
                onSelect={setQuickAddProductId}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-[#475569]">{t('orderLineItems')}</Label>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={addQuickAddRow}
                  className="rounded-lg border-[#D1FAE5] bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('addItem')}
                </Button>
              </div>
              
              <div className="border rounded-xl overflow-hidden border-[#F1F5F9]">
                <Table>
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow className="border-b border-[#F1F5F9] hover:bg-transparent">
                      <TableHead className="font-bold text-[#475569]">{t('size')}</TableHead>
                      <TableHead className="font-bold text-[#475569]">{t('qty')}</TableHead>
                      <TableHead className="font-bold text-[#475569]">{t('unit')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quickAddRows.map((row, index) => (
                      <TableRow key={index} className="border-b border-[#F1F5F9] hover:bg-transparent">
                        <TableCell className="py-2">
                          <Input 
                            type="number" 
                            value={row.size} 
                            onChange={(e) => updateQuickAddRow(index, 'size', Number(e.target.value))}
                            className="rounded-lg h-9"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Input 
                            type="number" 
                            value={row.quantity} 
                            onChange={(e) => updateQuickAddRow(index, 'quantity', Number(e.target.value))}
                            className="rounded-lg h-9"
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm text-[#64748B]">
                            {(() => {
                              const product = products.find(p => p.id === quickAddProductId);
                              const unit = units.find(u => u.id === product?.default_unit_id);
                              return unit ? getUnitLabel(unit) : '';
                            })()}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeQuickAddRow(index)}
                            disabled={quickAddRows.length === 1}
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9]">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('totalQuantity')}</p>
                <p className="text-xl font-black text-[#064E3B] mt-1">
                  {quickAddRows.reduce((acc, r) => acc + (r.size * r.quantity), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{t('totalCost')}</p>
                <p className="text-xl font-black text-[#059669] mt-1">
                  {t('currencySymbol')}{(quickAddRows.reduce((acc, r) => acc + (r.size * r.quantity), 0) * (getProductPrice(products.find(p => p.id === quickAddProductId) || { id: '', name: '', default_unit_id: null, default_price: 0, image_url: null, deleted_at: null } as Product))).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setQuickAddOpen(false)} className="rounded-xl px-6">
                {t('cancel')}
              </Button>
              <Button type="button" onClick={handleQuickAddConfirm} className="bg-[#059669] hover:bg-[#047857] text-white rounded-xl px-8 shadow-md shadow-emerald-600/20 font-bold">
                {t('confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
