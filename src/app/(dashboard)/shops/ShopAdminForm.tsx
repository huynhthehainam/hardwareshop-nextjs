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
import ImageUpload from '@/components/ImageUpload';

export default function ShopAdminForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const { t } = useI18n();
  
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone || '');
  const [address, setAddress] = useState(shop.address || '');
  const [logoUrl, setLogoUrl] = useState(shop.logo_url || '');
  const [qrCodeUrl, setQrCodeUrl] = useState(shop.qr_code_url || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          phone, 
          address, 
          logo_url: logoUrl,
          qr_code_url: qrCodeUrl
        }),
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Media Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    bucket="shop-logos"
                    label={t('shopLogo')}
                    folder="logos"
                  />
                  <ImageUpload
                    value={qrCodeUrl}
                    onChange={setQrCodeUrl}
                    bucket="payment-qrs"
                    label={t('shopQRCode')}
                    folder="qrs"
                  />
                </div>
              </div>

              {/* Shop Info Section */}
              <div className="space-y-6">
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
