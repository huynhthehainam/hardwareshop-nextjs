'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import { Store, Upload, Save, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { Shop } from '@/types';
import { uploadFile } from '@/lib/supabase/storage';

export default function ShopAdminForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const { t } = useI18n();
  
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone || '');
  const [address, setAddress] = useState(shop.address || '');
  const [logoUrl, setLogoUrl] = useState(shop.logo_url || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${shop.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const publicUrl = await uploadFile('shop-logos', filePath, file);
      setLogoUrl(publicUrl);
      
      // Automatically update the database record with the new logo URL
      const response = await fetch('/api/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, logo_url: publicUrl }),
      });

      if (!response.ok) throw new Error('Failed to update shop logo URL in database');

      toast.success(t('logoUploaded'));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('logoUploadFailed')}: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, logo_url: logoUrl }),
      });

      if (response.ok) {
        toast.success(t('shopInfoUpdated'));
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error(`${t('shopInfoUpdateFailed')}: ${errorData.error || t('genericError')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('genericError')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-[#059669]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-[#064E3B]">{t('shopAdminTitle')}</CardTitle>
                <p className="text-sm text-[#64748B]">{t('shopAdminSubtitle')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo Upload Section */}
              <div className="flex flex-col items-center space-y-4">
                <Label className="text-sm font-bold text-[#475569] self-start">{t('shopLogo')}</Label>
                <div className="relative group">
                  <div className="w-40 h-40 rounded-3xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden bg-[#F8FAFC] group-hover:border-[#059669] transition-colors">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-[#94A3B8]" />
                    )}
                  </div>
                  <label 
                    htmlFor="logo-upload" 
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl"
                  >
                    <div className="text-white flex flex-col items-center">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs font-bold">{t('uploadLogo')}</span>
                    </div>
                  </label>
                  <input 
                    id="logo-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleUploadLogo}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-3xl">
                      <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
                    </div>
                  )}
                </div>
                {logoUrl && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={removeLogo}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t('removeLogo')}
                  </Button>
                )}
              </div>

              {/* Shop Info Section */}
              <div className="flex-1 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="shop-name" className="text-sm font-bold text-[#475569]">{t('shopName')}</Label>
                  <Input 
                    id="shop-name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                    placeholder={t('shopName')}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="shop-phone" className="text-sm font-bold text-[#475569]">{t('shopPhone')}</Label>
                    <Input 
                      id="shop-phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      className="h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                      placeholder={t('shopPhone')}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="shop-address" className="text-sm font-bold text-[#475569]">{t('shopAddress')}</Label>
                    <Input 
                      id="shop-address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      className="h-12 rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                      placeholder={t('shopAddress')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#F1F5F9] flex justify-end">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-[#059669] hover:bg-[#047857] text-white rounded-xl px-8 h-12 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t('updateShopInfo')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
