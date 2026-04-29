'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { 
  Store, 
  UserPlus, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Lock, 
  ShieldCheck,
  User as UserIcon,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { Shop } from '@/types';
import Link from 'next/link';
import { uploadFile } from '@/lib/supabase/storage';

interface ShopUser {
  user_id: string;
  role: 'admin' | 'staff';
  email: string;
  last_sign_in_at?: string;
}

export default function ShopDetailAdmin() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useI18n();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff'
  });

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/admin/shops/${id}`);
      if (!response.ok) throw new Error('Failed to fetch shop details');
      const data = await response.json();
      setShop(data.shop);
      setUsers(data.users);
    } catch (err) {
      toast.error('Error loading shop details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shop),
      });

      if (!response.ok) throw new Error('Failed to update shop');
      toast.success(t('shopInfoUpdated'));
      router.refresh();
    } catch (error) {
      toast.error(t('shopInfoUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const response = await fetch(`/api/admin/shops/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add user');
      }

      toast.success('User added successfully');
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
    if (!confirm('Are you sure you want to remove this user?')) return;

    try {
      const response = await fetch(`/api/admin/shops/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');
      toast.success('User removed successfully');
      fetchData();
    } catch (error) {
      toast.error('Error deleting user');
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

      // Automatically update DB
      await fetch('/api/admin/shops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShop),
      });

      toast.success(t('logoUploaded'));
    } catch (error) {
      toast.error(t('logoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  if (loading && !shop) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-[#059669] animate-spin" />
      </div>
    );
  }

  if (!shop) return <div>Shop not found</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" asChild className="rounded-xl">
          <Link href="/admin/shops">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Shops
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shop Info Card */}
        <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white h-fit">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#ECFDF5] rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-[#059669]" />
              </div>
              <CardTitle className="text-xl font-bold text-[#064E3B]">{t('shopInfo')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleUpdateShop} className="space-y-6">
              <div className="flex flex-col items-center space-y-4 mb-6">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden bg-[#F8FAFC] group-hover:border-[#059669] transition-colors">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-[#94A3B8]" />
                    )}
                  </div>
                  <label htmlFor="logo-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                    <div className="text-white flex flex-col items-center">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">{t('uploadLogo')}</span>
                    </div>
                  </label>
                  <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={handleUploadLogo} disabled={uploading} />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-3xl">
                      <Loader2 className="w-6 h-6 text-[#059669] animate-spin" />
                    </div>
                  )}
                </div>
                {shop.logo_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShop({ ...shop, logo_url: '' })} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl">
                    <X className="w-4 h-4 mr-1" />
                    {t('removeLogo')}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold text-[#475569]">{t('shopName')}</Label>
                  <Input 
                    id="name" 
                    value={shop.name} 
                    onChange={(e) => setShop({ ...shop, name: e.target.value })} 
                    className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-bold text-[#475569]">{t('shopPhone')}</Label>
                  <Input 
                    id="phone" 
                    value={shop.phone || ''} 
                    onChange={(e) => setShop({ ...shop, phone: e.target.value })} 
                    className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-bold text-[#475569]">{t('shopAddress')}</Label>
                  <Input 
                    id="address" 
                    value={shop.address || ''} 
                    onChange={(e) => setShop({ ...shop, address: e.target.value })} 
                    className="rounded-xl border-[#E2E8F0] focus:ring-[#059669]/10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl h-12 shadow-md shadow-emerald-600/20 mt-4">
                {t('updateShopInfo')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User Management Section */}
        <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#F1F5F9] px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#F0F9FF] rounded-xl flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-[#0EA5E9]" />
                </div>
                <CardTitle className="text-xl font-bold text-[#064E3B]">Shop Users</CardTitle>
              </div>
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl px-4 h-10 shadow-lg shadow-[#0EA5E9]/20">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#064E3B]">Add New User</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddUser} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#475569] flex items-center">
                        <Mail className="w-4 h-4 mr-2" /> Email
                      </Label>
                      <Input 
                        type="email" 
                        value={userFormData.email} 
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} 
                        className="rounded-xl border-[#E2E8F0]"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#475569] flex items-center">
                        <Lock className="w-4 h-4 mr-2" /> Password
                      </Label>
                      <Input 
                        type="password" 
                        value={userFormData.password} 
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} 
                        className="rounded-xl border-[#E2E8F0]"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-[#475569] flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2" /> Role
                      </Label>
                      <Select 
                        value={userFormData.role} 
                        onValueChange={(val: 'admin' | 'staff') => setUserFormData({ ...userFormData, role: val })}
                      >
                        <SelectTrigger className="rounded-xl border-[#E2E8F0]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={submittingUser} className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl h-12 shadow-md">
                        {submittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="px-8 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">User</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">Role</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">Last Login</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <p className="text-[#64748B] font-bold text-lg">No users found for this shop</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.user_id} className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#F1F5F9] rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-[#64748B]" />
                          </div>
                          <span className="font-bold text-[#064E3B]">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-6 text-sm text-[#64748B]">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.user_id)} className="rounded-xl hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
