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
import { Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

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
          className="w-full h-11 justify-between rounded-xl border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-200 focus:ring-2 focus:ring-[#059669]/20 font-bold text-[#334155] shadow-sm cursor-pointer"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : (placeholder || t('productPlaceholder'))}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 border-none shadow-2xl rounded-3xl overflow-hidden max-w-md bg-white">
        <Command className="rounded-none border-none">
          <CommandInput 
            placeholder={t('searchProductsPlaceholder')} 
            className="h-14 border-none focus:ring-0 text-base font-medium placeholder:text-[#94A3B8]" 
          />
          <CommandList className="max-h-[350px] scrollbar-emerald">
            <CommandEmpty className="py-10 text-center">
              <div className="flex flex-col items-center">
                <Package className="w-10 h-10 text-[#CBD5E1] mb-2" aria-hidden="true" />
                <p className="text-[#64748B] font-medium">{t('noProductsFound')}</p>
              </div>
            </CommandEmpty>
            <CommandGroup className="p-1">
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onSelect(product.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-xl aria-selected:bg-[#ECFDF5] transition-all duration-150 group"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#064E3B] text-sm truncate">{product.name}</span>
                      <div className="flex gap-1 shrink-0">
                        {(product as any).product_tag_assignment?.slice(0, 3).map((assignment: any) => (
                          <div 
                            key={assignment.tag_id}
                            style={{ backgroundColor: assignment.product_tag.color }}
                            className="w-1.5 h-1.5 rounded-full shadow-sm"
                            title={assignment.product_tag.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-[#475569] leading-tight">
                        {t('currencySymbol')}{product.default_price.toLocaleString()}
                      </span>
                      {product.price_for_frequent_customer != null && (
                        <div className="flex items-center text-[10px] font-bold text-[#059669] opacity-90 leading-tight">
                          <span className="mr-1 text-[8px]">★</span>
                          {t('currencySymbol')}{product.price_for_frequent_customer.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                      selectedId === product.id ? "bg-[#059669] scale-100" : "bg-[#F1F5F9] scale-90 opacity-0 group-hover:opacity-100"
                    )}>
                      <Check
                        className={cn(
                          "h-3 w-3 text-white transition-opacity",
                          selectedId === product.id ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
