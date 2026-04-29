'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  Clock3,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  Upload,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/components/i18n/I18nProvider';
import { uploadFile } from '@/lib/supabase/storage';
import { Shop } from '@/types';
import { toast } from 'sonner';

interface ShopUser {
  user_id: string;
  role: 'admin' | 'staff';
  email: string;
  last_sign_in_at?: string;
}

interface BusinessMetrics {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  activeProducts: number;
  totalOutstanding: number;
  lastOrderAt: string | null;
}

interface RecentOrder {
  id: string;
  total_cost: number;
  deposit: number;
  created_at: string;
  customer_name: string | null;
}

export default function ShopDetailAdmin() {
  const { id } = useParams();
  const shopId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { t } = useI18n();

  const [shop, setShop] = useState<Shop | null>(null);
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingShop, setSavingShop] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
  });

  const fetchData = async () => {
    if (!shopId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/shops/${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch shop details');
      const data = await response.json();
      setShop(data.shop);
      setUsers(data.users ?? []);
      setBusinessMetrics(data.businessMetrics);
      setRecentOrders(data.recentOrders ?? []);
    } catch {
      toast.error(t('errLoadShopDetail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shopId) return;

    let active = true;

    const loadInitialData = async () => {
      try {
        const response = await fetch(`/api/admin/shops/${shopId}`);
        if (!response.ok) throw new Error('Failed to fetch shop details');
        const data = await response.json();

        if (active) {
          setShop(data.shop);
          setUsers(data.users ?? []);
          setBusinessMetrics(data.businessMetrics);
          setRecentOrders(data.recentOrders ?? []);
        }
      } catch {
        if (active) {
          toast.error(t('errLoadShopDetail'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      active = false;
    };
  }, [shopId, t]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);

  const getRoleLabel = (role: 'admin' | 'staff') =>
    role === 'admin' ? t('roleAdmin') : t('roleStaff');

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    setSavingShop(true);
    try {
      const response = await fetch('/api/admin/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shop),
      });

      if (!response.ok) throw new Error('Failed to update shop');

      toast.success(t('shopInfoUpdated'));
      router.refresh();
    } catch {
      toast.error(t('shopInfoUpdateFailed'));
    } finally {
      setSavingShop(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    setSubmittingUser(true);
    try {
      const response = await fetch(`/api/admin/shops/${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add user');
      }

      toast.success(t('userAdded'));
      setIsUserDialogOpen(false);
      setUserFormData({ email: '', password: '', role: 'staff' });
      fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!shopId || !confirm(t('confirmRemoveUser'))) return;

    try {
      const response = await fetch(`/api/admin/shops/${shopId}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success(t('userRemoved'));
      fetchData();
    } catch {
      toast.error(t('errDeleteUser'));
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${shop.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const publicUrl = await uploadFile('shop-logos', filePath, file);

      const updatedShop = { ...shop, logo_url: publicUrl };
      setShop(updatedShop);

      await fetch('/api/admin/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShop),
      });

      toast.success(t('logoUploaded'));
    } catch {
      toast.error(t('logoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#059669]" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[#D9E5E0] bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-bold text-[#064E3B]">{t('shopNotFound')}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: t('shopMetricOrders'),
      value: businessMetrics?.totalOrders ?? 0,
      icon: ShoppingCart,
      tone: 'bg-[#ECFDF5] text-[#047857]',
    },
    {
      label: t('shopMetricRevenue'),
      value: formatCurrency(businessMetrics?.totalRevenue ?? 0),
      icon: DollarSign,
      tone: 'bg-[#FFF7ED] text-[#C2410C]',
    },
    {
      label: t('shopMetricCustomers'),
      value: businessMetrics?.activeCustomers ?? 0,
      icon: Users,
      tone: 'bg-[#EFF6FF] text-[#1D4ED8]',
    },
    {
      label: t('shopMetricProducts'),
      value: businessMetrics?.activeProducts ?? 0,
      icon: Boxes,
      tone: 'bg-[#F5F3FF] text-[#7C3AED]',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            asChild
            className="h-10 w-fit rounded-xl px-3 text-[#475569] hover:bg-white hover:text-[#064E3B] cursor-pointer"
          >
            <Link href="/admin/shops">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToShops')}
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[#ECFDF5] px-3 text-[#047857]">
                {t('shopOverview')}
              </Badge>
              <Badge variant="outline" className="rounded-full border-[#D9E5E0] px-3 text-[#64748B]">
                {shop.id.slice(0, 8)}
              </Badge>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#064E3B] sm:text-4xl">
              {shop.name}
            </h2>
            <p className="max-w-2xl text-sm font-medium text-[#64748B]">
              {t('shopBusinessSubtitle')}
            </p>
          </div>
        </div>

        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 rounded-2xl bg-[#F97316] px-6 text-white shadow-lg shadow-[#F97316]/20 hover:bg-[#EA580C] cursor-pointer">
              <UserPlus className="mr-2 h-5 w-5" />
              {t('addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2rem] border-none p-0 sm:max-w-[460px]">
            <DialogHeader className="border-b border-[#E2E8F0] px-6 py-5">
              <DialogTitle className="text-2xl font-black text-[#064E3B]">
                {t('addNewUser')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#475569]">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('userEmail')}
                  </span>
                </Label>
                <Input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#475569]">
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('userPassword')}
                  </span>
                </Label>
                <Input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#475569]">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {t('userRole')}
                  </span>
                </Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value: 'admin' | 'staff') =>
                    setUserFormData({ ...userFormData, role: value })
                  }
                >
                  <SelectTrigger className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]">
                    <SelectValue placeholder={t('selectRole')} />
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    side="bottom"
                    sideOffset={8}
                    className="z-[60] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-[#D9E5E0] bg-white shadow-xl"
                  >
                    <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                    <SelectItem value="staff">{t('roleStaff')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={submittingUser}
                  className="h-12 w-full rounded-2xl bg-[#059669] text-white shadow-md shadow-emerald-600/20 hover:bg-[#047857] cursor-pointer"
                >
                  {submittingUser ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('createAccount')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#F8FFFC_0%,#ECFDF5_55%,#FFF7ED_100%)] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#DCEFE8] bg-white shadow-sm">
                {shop.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-8 w-8 text-[#059669]" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black text-[#064E3B]">{shop.name}</h3>
                  <Badge
                    className={
                      shop.logo_url
                        ? 'rounded-full bg-emerald-50 px-3 text-emerald-700'
                        : 'rounded-full bg-amber-50 px-3 text-amber-700'
                    }
                  >
                    {shop.logo_url ? t('logoReady') : t('logoMissing')}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm font-medium text-[#475569]">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#94A3B8]" />
                    <span>{shop.phone || t('phoneNotProvided')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" />
                    <span>{shop.address || t('addressNotProvided')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4">
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-black text-[#064E3B]">{stat.value}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/85 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#64748B]">
              {t('shopBusinessHealth')}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED]">
                <Clock3 className="h-5 w-5 text-[#F97316]" />
              </div>
              <div>
                <p className="text-lg font-black text-[#064E3B]">
                  {businessMetrics?.lastOrderAt
                    ? new Date(businessMetrics.lastOrderAt).toLocaleDateString()
                    : t('shopNoActivityYet')}
                </p>
                <p className="text-sm font-medium text-[#64748B]">{t('shopLastOrderDate')}</p>
              </div>
            </div>
            <div className="mt-5 rounded-[1.25rem] bg-[#F8FAFC] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                {t('shopMetricOutstanding')}
              </p>
              <p className="mt-2 text-2xl font-black text-[#064E3B]">
                {formatCurrency(businessMetrics?.totalOutstanding ?? 0)}
              </p>
              <p className="mt-1 text-sm font-medium text-[#64748B]">
                {t('shopOutstandingHelp')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden rounded-[2rem] border-none bg-white shadow-xl">
          <CardHeader className="border-b border-[#EEF2F7] bg-[#F8FAFC] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECFDF5]">
                <Store className="h-5 w-5 text-[#059669]" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-[#064E3B]">{t('shopInfo')}</CardTitle>
                <p className="text-sm font-medium text-[#64748B]">{t('manageShopDetails')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleUpdateShop} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-[#D9E5E0] bg-[#F8FAFC] p-5">
                  <div className="relative">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[#D9E5E0] bg-white">
                      {shop.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shop.logo_url}
                          alt={shop.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-[#94A3B8]" />
                      )}
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[1.75rem] bg-white/80">
                        <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                      </div>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadLogo}
                        disabled={uploading}
                      />
                      <span className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#D9E5E0] bg-white px-4 text-sm font-bold text-[#064E3B] transition-colors hover:bg-[#F0FDF4]">
                        <Upload className="mr-2 h-4 w-4" />
                        {t('uploadLogo')}
                      </span>
                    </label>
                    {shop.logo_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShop({ ...shop, logo_url: '' })}
                        className="h-11 rounded-2xl border-red-200 px-4 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t('removeLogo')}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold text-[#475569]">
                    {t('shopName')}
                  </Label>
                  <Input
                    id="name"
                    value={shop.name}
                    onChange={(e) => setShop({ ...shop, name: e.target.value })}
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
                    value={shop.phone || ''}
                    onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                    className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-bold text-[#475569]">
                    {t('shopAddress')}
                  </Label>
                  <Input
                    id="address"
                    value={shop.address || ''}
                    onChange={(e) => setShop({ ...shop, address: e.target.value })}
                    className="h-12 rounded-2xl border-[#D9E5E0] bg-[#F8FAFC]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingShop}
                className="h-12 w-full rounded-2xl bg-[#059669] text-white shadow-md shadow-emerald-600/20 hover:bg-[#047857] cursor-pointer"
              >
                {savingShop ? <Loader2 className="h-4 w-4 animate-spin" /> : t('updateShopInfo')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-xl">
          <CardHeader className="border-b border-[#EEF2F7] bg-[#F8FAFC] px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF]">
                  <Users className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-[#064E3B]">
                    {t('shopUsersTitle')}
                  </CardTitle>
                  <p className="text-sm font-medium text-[#64748B]">{t('shopUsersSubtitle')}</p>
                </div>
              </div>
              <Badge variant="outline" className="w-fit rounded-full border-[#D9E5E0] px-3 text-[#64748B]">
                {users.length} {t('usersCount').toLowerCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {users.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#D9E5E0] bg-[#F8FAFC] px-6 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-sm">
                  <Users className="h-8 w-8 text-[#94A3B8]" />
                </div>
                <h3 className="text-xl font-black text-[#064E3B]">{t('noShopUsers')}</h3>
                <p className="mt-2 max-w-md text-sm font-medium text-[#64748B]">
                  {t('noShopUsersHint')}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.75rem] border border-[#EEF2F7]">
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader className="bg-[#F8FAFC]">
                      <TableRow className="border-b border-[#EEF2F7] hover:bg-transparent">
                        <TableHead className="px-8 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                          {t('userEmail')}
                        </TableHead>
                        <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                          {t('userRole')}
                        </TableHead>
                        <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                          {t('lastLogin')}
                        </TableHead>
                        <TableHead className="px-8 py-5 text-right text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                          {t('actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.user_id}
                          className="border-b border-[#EEF2F7] bg-white transition-colors hover:bg-[#FCFDFD]"
                        >
                          <TableCell className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                                <UserIcon className="h-4 w-4 text-[#64748B]" />
                              </div>
                              <div>
                                <p className="font-bold text-[#064E3B]">{user.email}</p>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                                  {user.user_id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-6">
                            <Badge
                              className={
                                user.role === 'admin'
                                  ? 'rounded-full bg-amber-50 px-3 text-amber-700'
                                  : 'rounded-full bg-blue-50 px-3 text-blue-700'
                              }
                            >
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-6 text-sm font-medium text-[#64748B]">
                            {user.last_sign_in_at
                              ? new Date(user.last_sign_in_at).toLocaleString()
                              : t('never')}
                          </TableCell>
                          <TableCell className="px-8 py-6">
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.user_id)}
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

      <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-xl">
        <CardHeader className="border-b border-[#EEF2F7] bg-[#F8FAFC] px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF]">
                <ShoppingCart className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-[#064E3B]">
                  {t('shopBusinessOverviewTitle')}
                </CardTitle>
                <p className="text-sm font-medium text-[#64748B]">{t('shopBusinessOverviewSubtitle')}</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full border-[#D9E5E0] px-3 text-[#64748B]">
              {businessMetrics?.totalOrders ?? 0} {t('shopMetricOrders').toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {recentOrders.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#D9E5E0] bg-[#F8FAFC] px-6 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-sm">
                <ShoppingCart className="h-8 w-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-black text-[#064E3B]">{t('shopNoActivityYet')}</h3>
              <p className="mt-2 max-w-md text-sm font-medium text-[#64748B]">
                {t('shopNoOrdersHint')}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-[#EEF2F7]">
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow className="border-b border-[#EEF2F7] hover:bg-transparent">
                      <TableHead className="px-8 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('orderId')}
                      </TableHead>
                      <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('customer')}
                      </TableHead>
                      <TableHead className="px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('shopMetricOutstanding')}
                      </TableHead>
                      <TableHead className="px-8 py-5 text-right text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">
                        {t('date')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="border-b border-[#EEF2F7] bg-white transition-colors hover:bg-[#FCFDFD]"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                              <ShoppingCart className="h-4 w-4 text-[#64748B]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#064E3B]">#{order.id.slice(0, 8)}</p>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#94A3B8]">
                                {formatCurrency(Number(order.total_cost || 0))}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6 text-sm font-medium text-[#475569]">
                          {order.customer_name || t('walkInCustomer')}
                        </TableCell>
                        <TableCell className="px-6 py-6 text-sm font-bold text-[#064E3B]">
                          {formatCurrency(
                            Math.max(
                              Number(order.total_cost || 0) - Number(order.deposit || 0),
                              0
                            )
                          )}
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right text-sm font-medium text-[#64748B]">
                          {new Date(order.created_at).toLocaleDateString()}
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
