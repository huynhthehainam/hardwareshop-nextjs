'use client';

import { useState } from 'react';
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
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Customer } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { toast } from 'sonner';
import { UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  customers: Customer[];
  selectedId?: string;
  onSelect: (customer: Customer) => void;
  onCreate?: (customer: Customer) => void;
}

export default function CustomerSearch({ customers, selectedId, onSelect, onCreate }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const selectedCustomer = customers.find(c => c.id === selectedId);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone }),
      });

      if (!response.ok) throw new Error(t('customerCreateFailed'));

      const { customer } = await response.json();
      toast.success(t('customerCreated'));
      if (onCreate) onCreate(customer);
      onSelect(customer);
      setCreateOpen(false);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('genericError'));
    }
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full h-12 justify-start rounded-xl font-medium text-[#475569]">
            {selectedCustomer ? selectedCustomer.name : t('searchOrCreateCustomer')}
          </Button>
        </DialogTrigger>
        <DialogContent className="p-0 border-none shadow-2xl rounded-3xl overflow-hidden max-w-sm">
          <Command className="rounded-lg shadow-md">
            <CommandInput placeholder={t('searchCustomersPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('noOrdersFound')}</CommandEmpty>
              <CommandGroup heading={t('customersManagementTitle')}>
                {customers.map((c) => (
                  <CommandItem key={c.id} onSelect={() => { onSelect(c); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", selectedId === c.id ? "opacity-100" : "opacity-0")} />
                    {c.name} ({c.phone})
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => setCreateOpen(true)} className="text-[#059669] font-bold">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('createNewCustomer')}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle>{t('createNewCustomer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('customerName')}</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            </div>
            <Button onClick={handleCreate} className="w-full bg-[#059669] text-white rounded-xl h-12">
              {t('createNewCustomer')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
