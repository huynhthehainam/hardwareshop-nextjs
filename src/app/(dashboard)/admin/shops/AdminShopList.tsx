'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Store, Plus, Edit, Trash2, Loader2, Phone, MapPin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Shop } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import Link from 'next/link';

export default function AdminShopList() {
  const { t } = useI18n();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shops');
      if (!response.ok) throw new Error('Failed to fetch shops');
      const data = await response.json();
      setShops(data);
    } catch (err) {
      toast.error(t('errLoadShops'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = '/api/admin/shops';
      const method = editingShop ? 'PATCH' : 'POST';
      const body = editingShop ? { ...formData, id: editingShop.id } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save shop');

      toast.success(editingShop ? t('shopUpdated') : t('shopCreated'));
      setIsDialogOpen(false);
      setEditingShop(null);
      setFormData({ name: '', phone: '', address: '' });
      fetchShops();
    } catch (error) {
      toast.error(t('errSaveShop'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({ name: shop.name, phone: shop.phone || '', address: shop.address || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteShop'))) return;

    try {
      const response = await fetch(`/api/admin/shops?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete shop');
      toast.success(t('shopDeleted'));
      fetchShops();
    } catch (error) {
      toast.error(t('errDeleteShop'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-[#064E3B] tracking-tight">{t('shopAdminTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('shopAdminSubtitleAdmin')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingShop(null);
            setFormData({ name: '', phone: '', address: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl px-6 h-12 shadow-lg shadow-[#F97316]/20 transition-all hover:scale-[1.02]">
              <Plus className="w-5 h-5 mr-2" />
              {t('addNewShop')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#064E3B]">
                {editingShop ? t('editShop') : t('createNewShop')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-bold text-[#475569]">{t('shopName')}</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-bold text-[#475569]">{t('shopPhone')}</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-bold text-[#475569]">{t('shopAddress')}</Label>
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                />
              </div>
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl h-12 shadow-md shadow-emerald-600/20"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editingShop ? t('updateShop') : t('createShop')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 text-[#059669] animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="px-8 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('shopInfo')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('contact')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center">
                          <Store className="w-8 h-8 text-[#94A3B8]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-lg">{t('noShopsFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  shops.map((shop) => (
                    <TableRow key={shop.id} className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-[#ECFDF5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            {shop.logo_url ? (
                              <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <Store className="w-6 h-6 text-[#059669]" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#064E3B] text-lg leading-tight">{shop.name}</p>
                            <p className="text-xs font-semibold text-[#059669] uppercase tracking-widest mt-1">ID: {shop.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <div className="space-y-1">
                          {shop.phone && (
                            <div className="flex items-center space-x-2 text-[#475569] text-sm">
                              <Phone className="w-4 h-4 text-[#94A3B8]" />
                              <span>{shop.phone}</span>
                            </div>
                          )}
                          {shop.address && (
                            <div className="flex items-center space-x-2 text-[#475569] text-sm">
                              <MapPin className="w-4 h-4 text-[#94A3B8]" />
                              <span className="truncate max-w-[200px]">{shop.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            asChild
                            className="rounded-xl hover:bg-[#F0F9FF] hover:text-[#0EA5E9]"
                          >
                            <Link href={`/admin/shops/${shop.id}`}>
                              <ExternalLink className="w-5 h-5" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(shop)}
                            className="rounded-xl hover:bg-[#ECFDF5] hover:text-[#059669]"
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(shop.id)}
                            className="rounded-xl hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
