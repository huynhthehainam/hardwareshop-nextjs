'use client';

import { useState } from 'react';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  products: Product[];
  selectedId?: string;
  onSelect: (productId: string) => void;
  placeholder?: string;
}

export default function ProductSearch({ products, selectedId, onSelect, placeholder }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10 font-medium text-left"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : (placeholder || t('productPlaceholder'))}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 border-none shadow-2xl rounded-3xl overflow-hidden max-w-md">
        <Command className="rounded-lg shadow-md">
          <CommandInput placeholder={t('searchProductsPlaceholder')} className="h-12" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{t('noProductsFound')}</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelect(product.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-3 px-4 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-[#064E3B]">{product.name}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(product as any).product_tag_assignment?.map((assignment: any) => (
                        <Badge 
                          key={assignment.tag_id}
                          style={{ 
                            backgroundColor: assignment.product_tag.color + '20', 
                            color: assignment.product_tag.color, 
                            borderColor: assignment.product_tag.color + '40' 
                          }}
                          className="px-1.5 py-0 text-[9px] font-bold rounded-md border shadow-none"
                        >
                          {assignment.product_tag.name}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-xs text-[#64748B] mt-1">${product.default_price.toLocaleString()}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 text-[#059669]",
                      selectedId === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
