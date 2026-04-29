'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Phone,
  MapPin,
  ExternalLink,
  Search,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/components/i18n/I18nProvider';
import { toast } from 'sonner';
import { Shop } from '@/types';

export default function AdminShopList() {
  const { t } = useI18n();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const fetchShops = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shops');
      if (!response.ok) throw new Error('Failed to fetch shops');
      const data = await response.json();
      setShops(data);
    } catch {
      toast.error(t('errLoadShops'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialShops = async () => {
      try {
        const response = await fetch('/api/admin/shops');
        if (!response.ok) throw new Error('Failed to fetch shops');
        const data = await response.json();
        if (active) {
          setShops(data);
        }
      } catch {
        if (active) {
          toast.error(t('errLoadShops'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInitialShops();

    return () => {
      active = false;
    };
  }, [t]);

  const filteredShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return shops;

    return shops.filter((shop) =>
      [shop.name, shop.phone ?? '', shop.address ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [search, shops]);

  const stats = useMemo(() => {
    const branded = shops.filter((shop) => Boolean(shop.logo_url)).length;
    const reachable = shops.filter((shop) => Boolean(shop.phone || shop.address)).length;

    return [
      {
        label: t('totalShops'),
        value: shops.length,
        icon: Store,
        tone: 'bg-white/75 text-[#064E3B]',
      },
      {
        label: t('brandedShops'),
        value: branded,
        icon: BadgeCheck,
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        label: t('reachableShops'),
        value: reachable,
        icon: ShieldCheck,
        tone: 'bg-orange-50 text-orange-700',
      },
    ];
  }, [shops, t]);

  const resetForm = () => {
    setEditingShop(null);
    setFormData({ name: '', phone: '', address: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/shops', {
        method: editingShop ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingShop ? { ...formData, id: editingShop.id } : formData),
      });

      if (!response.ok) throw new Error('Failed to save shop');

      toast.success(editingShop ? t('shopUpdated') : t('shopCreated'));
      setIsDialogOpen(false);
      resetForm();
      fetchShops();
    } catch {
      toast.error(t('errSaveShop'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
    setFormData({
      name: shop.name,
      phone: shop.phone || '',
      address: shop.address || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteShop'))) return;

    try {
      const response = await fetch(`/api/admin/shops?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete shop');
      toast.success(t('shopDeleted'));
      fetchShops();
    } catch {
      toast.error(t('errDeleteShop'));
    }
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#064E3B_0%,#0F766E_58%,#F97316_100%)] shadow-[0_24px_80px_rgba(6,78,59,0.22)]">
        <div className="grid gap-8 px-6 py-7 text-white md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em]">
              <Sparkles className="h-4 w-4" />
              {t('shopAdminTitle')}
            </div>
            <div className="space-y-2">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                {t('shopAdminTitle')}
              </h2>
              <p className="max-w-2xl text-sm font-medium text-emerald-50/90 sm:text-base">
                {t('shopAdminSubtitleAdmin')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/12 p-4 backdrop-blur-sm"
                >
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black">{stat.value}</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/15 bg-white/12 p-4 backdrop-blur-sm">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white/75">{t('manageShopDetails')}</p>
                <p className="mt-1 text-xl font-black">{filteredShops.length} {t('totalShops').toLowerCase()}</p>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="h-12 w-full rounded-2xl bg-white text-[#064E3B] shadow-lg transition-colors hover:bg-emerald-50 cursor-pointer">
                    <Plus className="mr-2 h-5 w-5" />
                    {t('addNewShop')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem] border-none p-0 sm:max-w-[460px]">
                  <DialogHeader className="border-b border-[#E2E8F0] px-6 py-5">
                    <DialogTitle className="text-2xl font-black text-[#064E3B]">
                      {editingShop ? t('editShop') : t('createNewShop')}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-bold text-[#475569]">
                        {t('shopName')}
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-bold text-[#475569]">
                        {t('shopPhone')}
                      </Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-bold text-[#475569]">
                        {t('shopAddress')}
                      </Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="h-12 w-full rounded-2xl bg-[#059669] text-white shadow-md shadow-emerald-600/20 hover:bg-[#047857] cursor-pointer"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : editingShop ? (
                          t('updateShop')
                        ) : (
                          t('createShop')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-xl">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchShopsPlaceholder')}
                className="h-14 rounded-2xl border-[#E2E8F0] bg-[#F8FAFC] pl-12 text-sm font-medium text-[#0F172A]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-[#ECFDF5] px-3 text-[#047857]">
                {filteredShops.length} {t('totalShops').toLowerCase()}
              </Badge>
              <Badge variant="outline" className="h-8 rounded-full border-[#E2E8F0] px-3 text-[#64748B]">
                {shops.filter((shop) => shop.logo_url).length} {t('brandedShops').toLowerCase()}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center rounded-[1.5rem] bg-[#F8FAFC]">
              <Loader2 className="h-10 w-10 animate-spin text-[#059669]" />
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#D9E5E0] bg-[#F8FAFC] px-6 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-sm">
                <Store className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-black text-[#064E3B]">{t('noShopsFound')}</h3>
              <p className="mt-2 max-w-md text-sm font-medium text-[#64748B]">
                {t('manageShopDetails')}
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
                className="mt-6 h-11 rounded-2xl bg-[#F97316] px-5 text-white shadow-lg shadow-[#F97316]/20 hover:bg-[#EA580C] cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('addNewShop')}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-[#EEF2F7]">
              <div className="overflow-x-auto">
                <Table className="min-w-[880px]">
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow className="border-b border-[#EEF2F7] hover:bg-transparent">
                      <TableHead className="px-8 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('shopInfo')}
                      </TableHead>
                      <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('contact')}
                      </TableHead>
                      <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('brandingStatus')}
                      </TableHead>
                      <TableHead className="px-8 py-5 text-right text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShops.map((shop) => (
                      <TableRow
                        key={shop.id}
                        className="border-b border-[#EEF2F7] bg-white transition-colors hover:bg-[#FCFDFD]"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#DCEFE8] bg-[#ECFDF5]">
                              {shop.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={shop.logo_url}
                                  alt={shop.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Store className="h-6 w-6 text-[#059669]" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-lg font-black leading-tight text-[#064E3B]">
                                  {shop.name}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-[#D9E5E0] bg-[#F8FAFC] px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#64748B]"
                                >
                                  {shop.id.slice(0, 8)}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-[#64748B]">
                                {t('manageShopDetails')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className="space-y-2 text-sm font-medium text-[#475569]">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[#94A3B8]" />
                              <span>{shop.phone || t('phoneNotProvided')}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
                              <span className="line-clamp-2">{shop.address || t('addressNotProvided')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <Badge
                            className={
                              shop.logo_url
                                ? 'rounded-full bg-emerald-50 px-3 text-emerald-700'
                                : 'rounded-full bg-amber-50 px-3 text-amber-700'
                            }
                          >
                            {shop.logo_url ? t('logoReady') : t('logoMissing')}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-8 py-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              asChild
                              className="h-10 rounded-xl border-[#D9E5E0] px-4 text-[#064E3B] hover:bg-[#F0FDF4] cursor-pointer"
                            >
                              <Link href={`/admin/shops/${shop.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t('openShopWorkspace')}
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(shop)}
                              className="h-10 w-10 rounded-xl text-[#059669] hover:bg-[#ECFDF5] cursor-pointer"
                            >
                              <Edit className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(shop.id)}
                              className="h-10 w-10 rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
