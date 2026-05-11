'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Tag, Loader2, Calculator, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Product } from '@/types';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface ProductTag {
  id: string;
  name: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: ProductTag[];
  onSuccess: () => void;
}

export default function MassPriceUpdateDialog({ open, onOpenChange, tags, onSuccess }: Props) {
  const { t } = useI18n();
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [updateType, setUpdateType] = useState<"increase" | "decrease">("increase");
  const [massPriceChange, setMassPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingPreview, setFetchingFetchingPreview] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedTagId("");
      setUpdateType("increase");
      setMassPriceChange(0);
      setPreviewProducts([]);
    }
  }, [open]);

  useEffect(() => {
    if (selectedTagId) {
      fetchPreview();
    } else {
      setPreviewProducts([]);
    }
  }, [selectedTagId]);

  const fetchPreview = async () => {
    try {
      setFetchingFetchingPreview(true);
      // We'll use the regular products API but filter by tag and mass/mass_price logic
      // For simplicity in this demo, we'll fetch all and filter client side
      const res = await fetch(`/api/products?limit=1000`);
      if (res.ok) {
        const { data } = await res.json();
        const filtered = data.filter((p: any) =>
          p.product_tag_assignment?.some((a: any) => a.tag_id === selectedTagId) &&
          p.mass !== null && p.mass_price !== null
        );
        setPreviewProducts(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingFetchingPreview(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTagId) return;

    try {
      setLoading(true);
      const res = await fetch('/api/products/mass-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagId: selectedTagId,
          massPriceChange: updateType === "increase" ? massPriceChange : -massPriceChange
        })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(t('massUpdateSuccess')?.replace('{count}', result.updatedCount.toString()) || `Updated ${result.updatedCount} products`);
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        throw new Error(error.error || t('errUpdateFailed'));
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-screen-xl max-h-[90vh] rounded-[2.5rem] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-8 pb-4 flex-shrink-0 border-b border-[#F1F5F9]">
          <DialogTitle className="text-2xl font-bold text-[#064E3B] flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#059669]" />
            {t('updatePriceOnMass')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Sticky Inputs Section */}
          <div className="px-8 py-6 space-y-6 flex-shrink-0 bg-white border-b border-[#F1F5F9]">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#475569]">{t('selectTag')}</Label>
              <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                <SelectTrigger className="rounded-xl border-[#E2E8F0] h-12">
                  <SelectValue placeholder={t('selectTags')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[#D9E5E0] bg-white shadow-xl">
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTagId && (
              <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#059669] mt-0.5" />
                  <div className="text-sm text-[#065F46]">
                    {fetchingPreview ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    ) : (
                      <p>
                        {t('massUpdatePreview').split('{count}')[0]}
                        <strong>{previewProducts.length}</strong>
                        {t('massUpdatePreview').split('{count}')[1]}
                      </p>
                    )}
                  </div>
                </div>

                {previewProducts.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#475569]">{t('adjustmentType')}</Label>
                      <Tabs value={updateType} onValueChange={(v) => setUpdateType(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 rounded-xl h-11 p-1 bg-[#F1F5F9]">
                          <TabsTrigger
                            value="increase"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#059669] data-[state=active]:shadow-sm flex items-center gap-2"
                          >
                            <TrendingUp className="w-4 h-4" />
                            {t('increase')}
                          </TabsTrigger>
                          <TabsTrigger
                            value="decrease"
                            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#DC2626] data-[state=active]:shadow-sm flex items-center gap-2"
                          >
                            <TrendingDown className="w-4 h-4" />
                            {t('decrease')}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priceChange" className="text-sm font-bold text-[#475569]">{t('massPriceChange')}</Label>
                      <MoneyInput
                        id="priceChange"
                        value={massPriceChange}
                        onValueChange={(val) => setMassPriceChange(val ?? 0)}
                        className="rounded-xl border-[#E2E8F0] h-12 bg-white text-lg"
                        placeholder={t('amount')}
                        currencySymbol={t('currencySymbol')}
                      />
                      <p className="text-[10px] text-[#64748B] italic">
                        {t('massUpdateFormula')
                          .replace('{operator}', updateType === 'increase' ? '+' : '-')
                          .replace('{change}', massPriceChange.toLocaleString())}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable Table Section */}
          {selectedTagId && previewProducts.length > 0 && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-8 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex-shrink-0">
                <Label className="text-sm font-bold text-[#475569]">{t('preview')}</Label>
              </div>
              <div className="flex-1 overflow-auto scrollbar-emerald">
                <Table className="min-w-full table-fixed">
                  <TableHeader className="bg-[#F8FAFC] sticky top-0 z-10 shadow-sm">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold py-3 px-8 bg-[#F8FAFC] w-[30%]">{t('product')}</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-8 text-right bg-[#F8FAFC] w-[17.5%]">{t('basePrice')}</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-8 text-right text-[#059669] bg-[#F8FAFC] w-[17.5%]">{t('newPrice')}</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-8 text-right bg-[#F8FAFC] w-[17.5%]">{t('frequentCustomerPrice')}</TableHead>
                      <TableHead className="text-xs font-bold py-3 px-8 text-right text-[#059669] bg-[#F8FAFC] w-[17.5%]">{t('newFrequentPrice')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewProducts.map((product) => {
                      const currentMassPrice = Number(product.mass_price) || 0;
                      const mass = Number(product.mass) || 0;
                      const change = Number(massPriceChange) || 0;

                      const newMassPrice = updateType === 'increase'
                        ? currentMassPrice + change
                        : currentMassPrice - change;

                      const newPrice = Math.round((mass * newMassPrice) / 1000) * 1000;

                      // Calculate new frequent customer price if applicable
                      const saleOff = Number(product.frequent_customer_sale_off) || 0;

                      const newFrequentPrice = Math.round((newPrice * (1 - saleOff / 100)) / 1000) * 1000;
                      return (
                        <TableRow key={product.id} className="hover:bg-[#F8FAFC] group">
                          <TableCell className="py-3 px-8 text-sm font-medium break-words">{product.name}</TableCell>
                          <TableCell className="py-3 px-8 text-sm text-right text-[#64748B]">
                            {t('currencySymbol')}{(Number(product.default_price) || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-8 text-sm text-right font-bold text-[#059669]">
                            {t('currencySymbol')}{newPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 px-8 text-sm text-right text-[#64748B]">
                            {product.price_for_frequent_customer ? `${t('currencySymbol')}${(Number(product.price_for_frequent_customer) || 0).toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="py-3 px-8 text-sm text-right font-bold text-[#059669]">
                            {t('currencySymbol')}${newFrequentPrice.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {!selectedTagId && (
            <div className="flex-1 flex flex-col items-center justify-center text-[#94A3B8] p-8">
              <Tag className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">{t('selectTag')}</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 pt-4 border-t border-[#F1F5F9] flex-shrink-0 bg-white">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={loading || !selectedTagId || previewProducts.length === 0}
            className="rounded-xl bg-[#059669] hover:bg-[#047857] px-8 min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
}
