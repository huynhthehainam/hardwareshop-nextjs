'use client';

import { useState } from 'react';
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
import { Customer } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Search, User, Phone, DollarSign, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';

export default function CustomerList({ customers }: { customers: Customer[] }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#064E3B] tracking-tight">{t('customersManagementTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('customersManagementSubtitle')}</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <Input
            placeholder={t('searchCustomersPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-[#059669]/20 bg-white text-lg font-medium"
          />
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="px-10 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('customerName')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('phone')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('totalOutstanding')}</TableHead>
                  <TableHead className="px-10 py-6 w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-[#F1F5F9] rounded-3xl flex items-center justify-center">
                          <Users className="w-10 h-10 text-[#94A3B8]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-lg">{t('noOrdersFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
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
                          <span>{customer.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6 text-right">
                        <div className="inline-flex flex-col items-end">
                          <div className={`px-4 py-2 rounded-xl flex items-center space-x-2 ${customer.debt > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xl font-black">${customer.debt.toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-10 py-6 text-right">
                        <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-[#059669] hover:text-white transition-all cursor-pointer">
                          <Link href={`/customers/${customer.id}`}>
                            <ChevronRight className="w-6 h-6" />
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
