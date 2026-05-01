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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Tag, Loader2, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Product } from '@/types';

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
  const [massPriceChange, setMassPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [fetchingPreview, setFetchingFetchingPreview] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);

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
          massPriceChange
        })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(t('massUpdateSuccess')?.replace('{count}', result.updatedCount.toString()) || `Updated ${result.updatedCount} products`);
        onSuccess();
        onOpenChange(false);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#064E3B] flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#059669]" />
            {t('updatePriceOnMass')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#059669] mt-0.5" />
                <div className="text-sm text-[#065F46]">
                  {fetchingPreview ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  ) : (
                    <p>
                      Found <strong>{previewProducts.length}</strong> products with this tag that have mass and mass price set.
                    </p>
                  )}
                </div>
              </div>

              {previewProducts.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="priceChange" className="text-sm font-bold text-[#475569]">{t('massPriceChange')}</Label>
                  <MoneyInput
                    id="priceChange"
                    value={massPriceChange}
                    onValueChange={(val) => setMassPriceChange(val ?? 0)}
                    className="rounded-xl border-[#E2E8F0] h-12 bg-white"
                    placeholder="+/- Amount"
                    currencySymbol="$"
                  />
                  <p className="text-[10px] text-[#64748B]">
                    New Price = (Mass * (Current Mass Price + {massPriceChange})) rounded to nearest 1000.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
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
