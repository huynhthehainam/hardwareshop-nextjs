'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Customer } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Search, User, Phone, DollarSign, Eye, Users, Plus, Printer, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import Link from 'next/link';
import { generateCustomerListPdf } from '@/components/CustomerPDF';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 10;

export default function CustomerList({ customers }: { customers: Customer[] }) {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handlePrintAll = async () => {
    setIsGenerating(true);
    try {
      await generateCustomerListPdf({
        customers: filteredCustomers,
        locale,
        shop: null, // You might want to fetch the current shop details if available
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
      // Refresh logic would be ideal here; for now, a simple page reload or revalidation
      window.location.reload();
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
      window.location.reload();
    } catch (error) {
      toast.error(t('customerUpdateFailed'));
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
        </div>
      </div>
      
      <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <Input
            placeholder={t('searchCustomersPlaceholder')}
            value={search}
            onChange={handleSearchChange}
            className="pl-12 h-14 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-[#059669]/20 bg-white text-lg font-medium"
          />
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
                  <TableHead className="px-10 py-6 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-[#F1F5F9] rounded-3xl flex items-center justify-center">
                          <Users className="w-10 h-10 text-[#94A3B8]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-lg">{t('noOrdersFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                      <TableCell className="px-10 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#ECFDF5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <User className="w-6 h-6 text-[#059669]" />
                          </div>
                          <div>
                            <p className="font-bold text-[#064E3B] text-lg leading-tight">{customer.name}</p>
                            <p className="text-xs font-semibold text-[#059669] uppercase tracking-widest mt-1">ID: {customer.id.slice(0, 8)}</p>
                          </div>
                        </div>
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
                            <span className="text-xl font-black">{customer.debt.toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" className="rounded-lg border-[#E2E8F0] text-[#475569] hover:bg-[#ECFDF5]" onClick={() => {
                            setEditingCustomer(customer);
                            setEditOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('editCustomer')}
                          </Button>
                          <Button variant="ghost" asChild size="sm" className="text-[#059669] hover:bg-[#ECFDF5] rounded-lg">
                            <Link href={`/customers/${customer.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              {t('viewDetails')}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-6 border-t border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <p className="text-sm text-[#64748B] font-medium">
                {t('showing')} <span className="text-[#0F172A] font-bold">{startIndex + 1}</span> {t('to')} <span className="text-[#0F172A] font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredCustomers.length)}</span> {t('of')} <span className="text-[#0F172A] font-bold">{filteredCustomers.length}</span> {t('results')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#E2E8F0] h-10 px-4 disabled:opacity-50"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t('previous')}
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Show only first, last, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          className={`w-10 h-10 rounded-xl ${
                            currentPage === pageNum 
                              ? 'bg-[#059669] hover:bg-[#047857] text-white' 
                              : 'border-[#E2E8F0] text-[#475569]'
                          }`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (
                      (pageNum === 2 && currentPage > 3) ||
                      (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return <span key={pageNum} className="px-2 text-[#94A3B8]">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#E2E8F0] h-10 px-4 disabled:opacity-50"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('next')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
