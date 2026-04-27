'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/supabase/storage';
import { Upload, Package, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Product } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function ProductImageUpload({ products }: { products: Product[] }) {
  const { t } = useI18n();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProductId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedProductId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to the new bucket using utility
      const publicUrl = await uploadFile('product-images', filePath, file);

      // 2. Update product record
      const response = await fetch(`/api/products/${selectedProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: publicUrl }),
      });

      if (!response.ok) throw new Error('Failed to update product image URL');

      toast.success('Product image uploaded successfully');
      window.location.reload(); // Simple way to refresh the product list
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Upload failed: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white max-w-2xl mx-auto">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-[#059669]" />
          </div>
          <CardTitle className="text-xl font-bold text-[#064E3B]">Product Image Manager</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-bold text-[#475569]">Select Product</Label>
          <Select onValueChange={setSelectedProductId} value={selectedProductId}>
            <SelectTrigger className="h-12 rounded-xl border-[#E2E8F0]">
              <SelectValue placeholder="Select a product..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="space-y-6 flex flex-col items-center p-6 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
            <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden bg-white relative group">
              {selectedProduct.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-16 h-16 text-[#94A3B8]" />
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                </div>
              )}
            </div>

            <div className="w-full">
              <input
                type="file"
                id="product-image-upload"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button 
                asChild 
                className="w-full h-12 bg-[#059669] hover:bg-[#047857] text-white rounded-xl cursor-pointer"
                disabled={uploading}
              >
                <label htmlFor="product-image-upload" className="flex items-center justify-center cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload New Image'}
                </label>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
