'use client';

import { useState, useEffect } from 'react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Customer } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { toast } from 'sonner';
import { UserPlus, Check, Search, User, Phone, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  customers: Customer[];
  selectedId?: string;
  onSelect: (customer: Customer) => void;
  onCreate?: (customer: Customer) => void;
}

export default function CustomerSearch({ customers: initialCustomers, selectedId, onSelect, onCreate }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [isLoading, setIsLoading] = useState(false);

  const selectedCustomer = (customers || []).find(c => c?.id === selectedId) || 
                          (initialCustomers || []).find(c => c?.id === selectedId);

  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: '20',
          offset: '0',
          search: search,
        });
        
        const res = await fetch(`/api/customers?${params.toString()}`);
        if (!res.ok) throw new Error(t('genericError'));
        
        const data = await res.json();
        setCustomers(data.customers);
      } catch (error) {
        console.error('Error searching customers:', error);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, open, t]);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim()) {
      toast.error(t('enterName'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });

      if (!response.ok) throw new Error(t('customerCreateFailed'));

      const data = await response.json();
      const customer = data.customer || data;
      toast.success(t('customerCreated'));
      
      if (onCreate) onCreate(customer);
      if (customer) onSelect(customer);
      
      setCreateOpen(false);
      setOpen(false);
      setNewName('');
      setNewPhone('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearch('');
    }
  };

  const handleCreateOpenChange = (newOpen: boolean) => {
    setCreateOpen(newOpen);
    if (newOpen) {
      setNewName('');
      setNewPhone('');
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className={cn(
              "flex-1 h-12 justify-start rounded-xl font-medium transition-all border-[#E2E8F0] hover:bg-slate-50",
              selectedCustomer ? "text-[#064E3B] font-bold border-[#059669]/30 bg-[#ECFDF5]/30" : "text-[#475569]"
            )}
          >
            {selectedCustomer ? (
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center mr-3">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm leading-tight">{selectedCustomer.name}</span>
                  <span className="text-[10px] font-medium text-[#059669]/70 uppercase tracking-widest">{selectedCustomer.phone || t('noPhone')}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <Search className="w-5 h-5 mr-3 text-[#94A3B8]" />
                {t('searchOrCreateCustomer')}
              </div>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="p-0 border-none shadow-2xl rounded-3xl overflow-hidden max-w-md">
          <Command className="rounded-none border-none" shouldFilter={false}>
            <div className="flex items-center border-b border-[#F1F5F9] px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput 
                placeholder={t('searchCustomersPlaceholder')} 
                className="h-14 border-none focus:ring-0 text-base"
                value={search}
                onValueChange={setSearch}
              />
            </div>
            <CommandList className="max-h-[350px]">
              {isLoading ? (
                <div className="py-10 text-center text-sm text-[#94A3B8] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('searching')}
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-10 text-center text-sm text-[#94A3B8]">
                    {t('noCustomersFound')}
                  </CommandEmpty>
                  <CommandGroup heading={t('customersManagementTitle')}>
                    {(customers || []).filter(Boolean).map((c) => (
                      <CommandItem 
                        key={c.id} 
                        value={c.id}
                        onSelect={() => { onSelect(c); setOpen(false); }}
                        className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-[#F8FAFC]"
                      >
                        <div className="flex items-center">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center mr-3",
                            selectedId === c.id ? "bg-[#059669] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                          )}>
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#064E3B]">{c.name}</span>
                            <span className="text-xs text-[#64748B]">{c.phone || t('noPhone')}</span>
                          </div>
                        </div>
                        {selectedId === c.id && <Check className="h-5 w-5 text-[#059669]" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem 
                  onSelect={() => {
                    setOpen(false);
                    setTimeout(() => {
                      setCreateOpen(true);
                      setNewName('');
                      setNewPhone('');
                    }, 150);
                  }} 
                  className="text-[#059669] font-bold py-4 px-4 cursor-pointer hover:bg-emerald-50"
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  {t('createNewCustomer')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogTrigger asChild>
          <Button 
            type="button"
            variant="outline" 
            size="icon"
            className="h-12 w-12 rounded-xl border-[#E2E8F0] text-[#059669] hover:bg-emerald-50 hover:border-[#059669]/50 shadow-sm shrink-0"
            title={t('createNewCustomer')}
          >
            <UserPlus className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl max-w-sm">
          <div className="bg-[#059669] p-8 text-white">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white">{t('createNewCustomer')}</DialogTitle>
              <p className="text-emerald-100/70 text-sm font-medium mt-1">{t('customersManagementSubtitle')}</p>
            </DialogHeader>
          </div>
          
          <form onSubmit={handleCreate} className="p-8 space-y-6 bg-white">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-sm font-bold text-[#475569]">{t('customerName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input 
                    id="create-name"
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder={t('enterName')}
                    className="pl-10 h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone" className="text-sm font-bold text-[#475569]">{t('phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input 
                    id="create-phone"
                    value={newPhone} 
                    onChange={e => setNewPhone(e.target.value)} 
                    placeholder={t('enterPhone')}
                    className="pl-10 h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setCreateOpen(false)}
                className="rounded-xl text-[#64748B] font-bold"
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !newName.trim()}
                className="flex-1 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl h-12 font-black shadow-lg shadow-[#F97316]/20 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t('createNewCustomer')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
