'use client';

import { useState, ChangeEvent, FormEvent, useEffect, useRef, useCallback } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MoneyInput } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Customer } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Search, User, Phone, DollarSign, Eye, Users, Plus, Printer, ChevronLeft, ChevronRight, Edit, Trash2, Loader2, Banknote } from 'lucide-react';
import Link from 'next/link';
import { generateCustomerListPdf } from '@/components/CustomerPDF';
import { toast } from 'sonner';

const LIMIT = 20;

export default function CustomerList({ initialCustomers }: { initialCustomers: Customer[] }) {
  const { t, locale } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState('');
  const [showOnlyDebt, setShowOnlyDebt] = useState(false);
  const [offset, setOffset] = useState(initialCustomers.length);
  const [hasMore, setHasMore] = useState(initialCustomers.length >= LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerToAdjust, setCustomerToAdjust] = useState<Customer | null>(null);
  
  const [adjustmentType, setAdjustmentType] = useState<'payment' | 'add'>('payment');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  
  const loadMore = async (resetSearch = false) => {
    if (isLoading) return;
    setIsLoading(true);
    
    const currentOffset = resetSearch ? 0 : offset;
    
    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: currentOffset.toString(),
        search: search,
        hasDebt: showOnlyDebt.toString()
      });
      
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error(t('genericError'));
      
      const data = await res.json();
      const newCustomers = data.customers;
      
      if (resetSearch) {
        setCustomers(newCustomers);
        setOffset(newCustomers.length);
      } else {
        setCustomers(prev => [...prev, ...newCustomers]);
        setOffset(prev => prev + newCustomers.length);
      }
      
      setHasMore(newCustomers.length === LIMIT);
    } catch (error) {
      console.error('Error loading more customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, offset, search, showOnlyDebt]);

  // Debounced search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMore(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, showOnlyDebt]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePrintAll = async () => {
    setIsGenerating(true);
    try {
      await generateCustomerListPdf({
        customers: customers,
        locale,
        shop: null,
      });
    } catch (error) {
      toast.error(t('genericError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateCustomer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const is_frequent_customer = formData.get('is_frequent_customer') === 'on';

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, is_frequent_customer }),
      });
      if (!res.ok) throw new Error(t('customerCreateFailed'));
      toast.success(t('customerCreated'));
      setOpen(false);
      loadMore(true); // Reset and reload
    } catch (error) {
      toast.error(t('customerCreateFailed'));
    }
  };

  const handleUpdateCustomer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const is_frequent_customer = formData.get('is_frequent_customer') === 'on';

    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, is_frequent_customer }),
      });
      if (!res.ok) throw new Error(t('customerUpdateFailed'));
      toast.success(t('customerUpdated'));
      setEditOpen(false);
      setEditingCustomer(null);
      loadMore(true);
    } catch (error) {
      toast.error(t('customerUpdateFailed'));
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(t('customerDeleteFailed'));
      toast.success(t('customerDeleted'));
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      loadMore(true);
    } catch (error) {
      toast.error(t('customerDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdjustDebt = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerToAdjust || !adjustmentAmount) return;
    
    setIsAdjusting(true);
    // Negative change if payment, positive if adding debt
    const finalAmount = adjustmentType === 'payment' ? -adjustmentAmount : adjustmentAmount;

    try {
      const res = await fetch(`/api/customers/${customerToAdjust.id}/adjust-debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: finalAmount,
          reasonKey: 'manual_adjustment',
          reasonParams: { note: adjustmentReason }
        }),
      });
      
      if (!res.ok) throw new Error(t('debtAdjustFailed'));
      
      toast.success(t('debtAdjustedSuccessfully'));
      setDebtDialogOpen(false);
      setCustomerToAdjust(null);
      setAdjustmentAmount(null);
      setAdjustmentReason('');
      loadMore(true);
    } catch (error) {
      toast.error(t('debtAdjustFailed'));
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#064E3B] tracking-tight">{t('customersManagementTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('customersManagementSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-[#E2E8F0] text-[#475569] h-12 px-6 hover:bg-slate-50 transition-all hover:scale-[1.02]" onClick={handlePrintAll} disabled={isGenerating}>
            <Printer className="w-5 h-5 mr-2" />
            {t('printAll')}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl px-6 h-12 shadow-lg shadow-[#F97316]/20 transition-all hover:scale-[1.02]">
                <Plus className="w-5 h-5 mr-2" />
                {t('createNewCustomer')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createNewCustomer')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('customerName')}</Label>
                  <Input name="name" id="name" placeholder={t('enterName')} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input name="phone" id="phone" placeholder={t('enterPhone')} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox name="is_frequent_customer" id="is_frequent_customer" />
                  <Label htmlFor="is_frequent_customer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t('frequentCustomer')}
                  </Label>
                </div>
                <Button type="submit" className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl h-11 shadow-md shadow-[#F97316]/10">{t('createNewCustomer')}</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={editOpen} onOpenChange={(value) => {
            setEditOpen(value);
            if (!value) {
              setEditingCustomer(null);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('editCustomer')}</DialogTitle>
              </DialogHeader>
              <form key={editingCustomer?.id} onSubmit={handleUpdateCustomer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">{t('customerName')}</Label>
                  <Input name="name" id="edit-name" defaultValue={editingCustomer?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">{t('phone')}</Label>
                  <Input name="phone" id="edit-phone" defaultValue={editingCustomer?.phone} />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox name="is_frequent_customer" id="edit-is_frequent_customer" defaultChecked={editingCustomer?.is_frequent_customer} />
                  <Label htmlFor="edit-is_frequent_customer" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t('frequentCustomer')}
                  </Label>
                </div>
                <Button type="submit" className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl h-11 shadow-md shadow-[#059669]/10">{t('updateCustomer')}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="rounded-3xl border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900">{t('deleteCustomer')}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-slate-600 text-lg leading-relaxed">
                  {t('confirmDeleteCustomer')}
                </p>
                {customerToDelete && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="font-bold text-slate-900">{customerToDelete.name}</p>
                    <p className="text-sm text-slate-500">{customerToDelete.phone || t('noPhone')}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl border-slate-200 text-slate-600 h-12 px-6">
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleDeleteCustomer}
                  disabled={isDeleting}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white h-12 px-8 shadow-lg shadow-red-600/20"
                >
                  {isDeleting ? t('processing') : t('deleteCustomer')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
            <DialogContent className="rounded-3xl border-none shadow-2xl max-w-md">
              <DialogHeader>
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <Banknote className="w-8 h-8 text-[#059669]" />
                </div>
                <DialogTitle className="text-2xl font-black text-slate-900">{t('adjustDebt')}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleAdjustDebt} className="space-y-6 pt-2">
                {customerToAdjust && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-1">{t('customer')}</p>
                    <p className="font-bold text-slate-900 text-lg">{customerToAdjust.name}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                      <span className="text-sm font-medium text-slate-500">{t('currentDebt')}</span>
                      <span className="font-black text-[#064E3B]">{t('currencySymbol')}{customerToAdjust.debt.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">{t('adjustmentType')}</Label>
                  <Select 
                    value={adjustmentType} 
                    onValueChange={(v: any) => setAdjustmentType(v)}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-[#D9E5E0] bg-white shadow-xl">
                      <SelectItem value="payment" className="font-bold text-emerald-600 py-3">{t('payment')}</SelectItem>
                      <SelectItem value="add" className="font-bold text-red-600 py-3">{t('additionalDebt')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-slate-700">{t('adjustmentAmount')}</Label>
                    {customerToAdjust && customerToAdjust.debt > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setAdjustmentType('payment');
                          setAdjustmentAmount(customerToAdjust.debt);
                        }}
                        className="h-7 px-3 text-[10px] uppercase tracking-wider font-black bg-emerald-50 hover:bg-emerald-100 text-[#059669] rounded-lg transition-colors border-none"
                      >
                        {t('payAllDebt')}
                      </Button>
                    )}
                  </div>
                  <MoneyInput 
                    value={adjustmentAmount} 
                    onValueChange={setAdjustmentAmount}
                    currencySymbol={t('currencySymbol')}
                    placeholder="0"
                    className="h-12 rounded-xl border-slate-200 text-lg"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700">{t('adjustmentReason')}</Label>
                  <Textarea 
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder={t('notePlaceholder')}
                    className="rounded-xl border-slate-200 min-h-[100px] resize-none focus:ring-emerald-500/10"
                  />
                </div>

                <DialogFooter className="gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setDebtDialogOpen(false)}
                    className="rounded-xl text-slate-500 font-bold h-12"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isAdjusting || !adjustmentAmount}
                    className={`rounded-xl h-12 px-8 font-black shadow-lg transition-all ${
                      adjustmentType === 'payment' 
                        ? 'bg-[#059669] hover:bg-[#047857] shadow-emerald-600/20' 
                        : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    }`}
                  >
                    {isAdjusting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      t('confirm')
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <Input
            placeholder={t('searchCustomersPlaceholder')}
            value={search}
            onChange={handleSearchChange}
            className="pl-12 h-14 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-[#059669]/20 bg-white text-lg font-medium"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowOnlyDebt(!showOnlyDebt)}
          className={`h-14 px-6 rounded-2xl border-none shadow-sm transition-all font-bold ${
            showOnlyDebt 
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
              : 'bg-white text-[#64748B] hover:bg-slate-50'
          }`}
        >
          <DollarSign className={`w-5 h-5 mr-2 ${showOnlyDebt ? 'animate-pulse' : ''}`} />
          {t('showOnlyDebt')}
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="px-10 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('customerName')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('phone')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('frequentCustomer')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('totalOutstanding')}</TableHead>
                  <TableHead className="px-6 py-6 w-16 text-right font-bold text-[#475569] uppercase tracking-wider text-xs">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-[#F1F5F9] rounded-3xl flex items-center justify-center">
                          <Users className="w-10 h-10 text-[#94A3B8]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-lg">{t('noCustomersFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {customers.map((customer) => (
                      <TableRow key={customer.id} className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                        <TableCell className="px-10 py-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-[#ECFDF5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <User className="w-6 h-6 text-[#059669]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#064E3B] text-lg leading-tight">{customer.name}</p>
                              <p className="text-xs font-semibold text-[#059669] uppercase tracking-widest mt-1">{t('idLabel')}: {customer.id.slice(0, 8)}</p>
                              </div>                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className="flex items-center space-x-2 text-[#475569] font-bold">
                            <Phone className="w-4 h-4 text-[#94A3B8]" />
                            <span>{customer.phone || t('noPhone')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Users className={`w-3 h-3 mr-1 ${customer.is_frequent_customer ? 'text-[#059669]' : 'text-[#94A3B8]'}`} />
                            <span className={customer.is_frequent_customer ? 'text-[#059669]' : 'text-[#64748B]'}>
                              {customer.is_frequent_customer ? t('frequentCustomer') : t('regularCustomer')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6 text-right">
                          <div className="inline-flex flex-col items-end">
                            <div className={`px-4 py-2 rounded-xl flex items-center space-x-2 ${customer.debt > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              <DollarSign className="w-4 h-4" />
                              <span className="text-xl font-black">{t('currencySymbol')}{customer.debt.toLocaleString()}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6 text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-9 text-orange-600 hover:bg-orange-50 hover:text-orange-700 rounded-xl transition-all duration-200"
                              onClick={() => {
                                setCustomerToAdjust(customer);
                                setDebtDialogOpen(true);
                              }}
                              title={t('adjustDebt')}
                            >
                              <Banknote className="size-4.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              asChild 
                              size="icon" 
                              className="size-9 text-[#059669] hover:bg-emerald-50 hover:text-[#047857] rounded-xl transition-all duration-200"
                              title={t('viewDetails')}
                            >
                              <Link href={`/customers/${customer.id}`}>
                                <Eye className="size-4.5" />
                              </Link>
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="size-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all duration-200"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setEditOpen(true);
                              }}
                              title={t('editCustomer')}
                            >
                              <Edit className="size-4.5" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="size-9 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200"
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setDeleteDialogOpen(true);
                              }}
                              title={t('deleteCustomer')}
                            >
                              <Trash2 className="size-4.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div ref={lastElementRef} className="h-20 flex items-center justify-center bg-[#F8FAFC]">
            {isLoading && (
              <div className="flex items-center space-x-2 text-[#059669] font-bold">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('processing')}</span>
              </div>
            )}
            {!hasMore && customers.length > 0 && (
              <p className="text-sm text-[#94A3B8] font-bold uppercase tracking-widest">{t('allRightsReserved')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
