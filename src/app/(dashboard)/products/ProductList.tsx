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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Package, Plus, Search, Edit, Trash2, Loader2, Image as ImageIcon, MoreVertical, Filter, ArrowUp, Tag, Settings, X, Calculator } from 'lucide-react';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from 'sonner';
import { Product, Unit } from '@/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { useRef, useCallback } from 'react';
import ImageUpload from '@/components/ImageUpload';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import MassPriceUpdateDialog from './MassPriceUpdateDialog';

interface ProductTag {
  id: string;
  name: string;
  color: string;
}

interface ProductTagAssignment {
  tag_id: string;
  product_tag: ProductTag;
}

type ProductWithDetails = Product & { 
  unit?: Unit | null;
  product_tag_assignment?: ProductTagAssignment[];
};

const LIMIT = 20;

export default function ProductList() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [availableTags, setAvailableTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isMassUpdateOpen, setIsMassUpdateOpen] = useState(false);
  
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setOffset(prev => prev + LIMIT);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const [formData, setFormData] = useState({
    name: '',
    default_unit_id: '',
    default_price: 0,
    price_for_frequent_customer: null as number | null,
    image_url: '',
    tagIds: [] as string[],
    mass: null as number | null,
    mass_price: null as number | null,
    frequent_customer_sale_off: 0
  });

  const fetchUnits = async () => {
    try {
      const unitRes = await fetch('/api/units');
      if (unitRes.ok) {
        const unitData = await unitRes.json();
        setUnits(unitData);
      }
    } catch (err) {
      console.error('Failed to fetch units', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/products/tags');
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  const fetchProducts = async (currentOffset: number, currentSearch: string, isInitial: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?limit=${LIMIT}&offset=${currentOffset}&search=${encodeURIComponent(currentSearch)}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const { data, count } = await res.json();
      
      setProducts(prev => isInitial ? data : [...prev, ...data]);
      setHasMore(products.length + data.length < (count || 0));
    } catch (err) {
      toast.error(t('errLoadProducts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchTags();
  }, []);

  useEffect(() => {
    setProducts([]);
    setOffset(0);
    setHasMore(true);
    fetchProducts(0, debouncedSearchTerm, true);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (offset > 0) {
      fetchProducts(offset, debouncedSearchTerm);
    }
  }, [offset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save product');

      toast.success(editingProduct ? t('productUpdated') : t('productCreated'));
      setIsDialogOpen(false);
      resetForm();
      // Reset and reload
      setSearchTerm('');
      setOffset(0);
      fetchProducts(0, '', true);
    } catch (error) {
      toast.error(t('errSaveProduct'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      default_unit_id: '',
      default_price: 0,
      price_for_frequent_customer: null,
      image_url: '',
      tagIds: [],
      mass: null,
      mass_price: null,
      frequent_customer_sale_off: 0
    });
  };

  const handleEdit = (product: ProductWithDetails) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      default_unit_id: product.default_unit_id || '',
      default_price: product.default_price,
      price_for_frequent_customer: product.price_for_frequent_customer ?? null,
      image_url: product.image_url || '',
      tagIds: product.product_tag_assignment?.map(a => a.tag_id) || [],
      mass: product.mass ?? null,
      mass_price: product.mass_price ?? null,
      frequent_customer_sale_off: product.frequent_customer_sale_off ?? 0
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteProduct'))) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete product');
      toast.success(t('productDeleted'));
      setOffset(0);
      fetchProducts(0, searchTerm, true);
    } catch (error) {
      toast.error(t('errDeleteProduct'));
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [tagSelectorValue, setTagSelectorValue] = useState<string>("");

  const toggleTag = (tagId: string) => {
    setFormData(prev => {
      const tagIds = prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId];
      return { ...prev, tagIds };
    });
    setTagSelectorValue("");
  };

  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [tagFormData, setTagFormData] = useState({ name: '', color: '#64748B' });

  const handleCreateTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tagFormData.name) return;

    try {
      const res = await fetch('/api/products/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagFormData)
      });

      if (res.ok) {
        const newTag = await res.json();
        setAvailableTags(prev => [...prev, newTag]);
        setFormData(prev => ({ ...prev, tagIds: [...prev.tagIds, newTag.id] }));
        toast.success(t('tagCreated'));
        setIsTagDialogOpen(false);
        setTagFormData({ name: '', color: '#64748B' });
      }
    } catch (err) {
      console.error(err);
      toast.error(t('errorSavingTag'));
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-md max-h-[90vh] overflow-y-auto scrollbar-emerald">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1E293B]">
              {t('addTag')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTag} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName" className="text-sm font-medium text-[#475569]">
                {t('tagName')}
              </Label>
              <Input
                id="tagName"
                value={tagFormData.name}
                onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                placeholder={t('tagNamePlaceholder') || 'e.g. Best Seller'}
                className="rounded-xl border-[#E2E8F0] focus:ring-[#4338CA] focus:border-[#4338CA]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagColor" className="text-sm font-medium text-[#475569]">
                {t('tagColor')}
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="tagColor"
                  type="color"
                  value={tagFormData.color}
                  onChange={(e) => setTagFormData({ ...tagFormData, color: e.target.value })}
                  className="w-16 h-12 p-1 rounded-xl cursor-pointer border-[#E2E8F0]"
                />
                <Input
                  value={tagFormData.color}
                  onChange={(e) => setTagFormData({ ...tagFormData, color: e.target.value })}
                  className="rounded-xl border-[#E2E8F0] uppercase"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Label className="w-full text-xs text-[#64748B] mb-1">{t('preview') || 'Preview'}</Label>
              <Badge 
                style={{ backgroundColor: tagFormData.color }}
                className="px-3 py-1 rounded-full text-white font-medium border-none shadow-sm"
              >
                {tagFormData.name || t('tagNamePlaceholder') || 'Tag Preview'}
              </Badge>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsTagDialogOpen(false)}
                className="rounded-xl"
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                className="rounded-xl bg-[#4338CA] hover:bg-[#3730A3] min-w-[100px]"
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#064E3B] tracking-tight">{t('productsManagementTitle')}</h2>
          <p className="text-[#64748B] font-medium mt-1">{t('productsManagementSubtitle')}</p>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={() => setIsMassUpdateOpen(true)}
            variant="outline" 
            className="rounded-xl border-[#059669] text-[#059669] h-12 hover:bg-[#ECFDF5]"
          >
            <Calculator className="w-5 h-5 mr-2" />
            {t('updatePriceOnMass')}
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-[#E2E8F0] h-12 hover:bg-[#F1F5F9]">
            <Link href="/products/tags">
              <Settings className="w-5 h-5 mr-2" />
              {t('manageTags')}
            </Link>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl px-6 h-12 shadow-lg shadow-[#F97316]/20 transition-all hover:scale-[1.02] cursor-pointer">
                <Plus className="w-5 h-5 mr-2" />
                {t('addNewProduct')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] max-h-[90vh] overflow-y-auto scrollbar-emerald">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#064E3B]">
                  {editingProduct ? t('editProduct') : t('addNewProduct')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold text-[#475569]">{t('productName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="rounded-xl border-[#E2E8F0] h-12 focus:ring-[#059669]/10"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mass" className="text-sm font-bold text-[#475569]">{t('mass')}</Label>
                    <Input
                      id="mass"
                      type="number"
                      step="0.01"
                      value={formData.mass ?? ''}
                      onChange={(e) => setFormData({ ...formData, mass: e.target.value ? Number(e.target.value) : null })}
                      className="rounded-xl border-[#E2E8F0] h-12"
                      placeholder="e.g. 1.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="massPrice" className="text-sm font-bold text-[#475569]">{t('massPrice')}</Label>
                    <MoneyInput
                      id="massPrice"
                      value={formData.mass_price}
                      onValueChange={(val) => setFormData({ ...formData, mass_price: val })}
                      className="rounded-xl border-[#E2E8F0] h-12"
                      currencySymbol={t('currencySymbol')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleOff" className="text-sm font-bold text-[#475569]">{t('saleOff')} (%)</Label>
                    <Input
                      id="saleOff"
                      type="number"
                      value={formData.frequent_customer_sale_off}
                      onChange={(e) => setFormData({ ...formData, frequent_customer_sale_off: Number(e.target.value) })}
                      className="rounded-xl border-[#E2E8F0] h-12"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm font-bold text-[#475569]">{t('defaultUnit')}</Label>
                    <Select
                      value={formData.default_unit_id}
                      onValueChange={(val) => setFormData({ ...formData, default_unit_id: val })}
                    >
                      <SelectTrigger className="rounded-xl border-[#E2E8F0] h-12">
                        <SelectValue placeholder={t('unitPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="z-[60] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-[#D9E5E0] bg-white shadow-xl">
                        {units.map((unit) => {
                          const key = `unit_${unit.name}` as any;
                          const translated = t(key);
                          const label = translated === key ? unit.name : translated;
                          return (
                            <SelectItem key={unit.id} value={unit.id}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-bold text-[#475569]">{t('basePrice')}</Label>
                    <MoneyInput
                      id="price"
                      value={formData.default_price}
                      onValueChange={(val) => setFormData({ ...formData, default_price: val ?? 0 })}
                      className="rounded-xl border-[#E2E8F0] h-12 focus:ring-[#059669]/10"
                      required
                      currencySymbol={t('currencySymbol')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequent-price" className="text-sm font-bold text-[#475569]">{t('frequentCustomerPrice')}</Label>
                  <MoneyInput
                    id="frequent-price"
                    value={formData.price_for_frequent_customer}
                    onValueChange={(val) => setFormData({ ...formData, price_for_frequent_customer: val })}
                    className="rounded-xl border-[#E2E8F0] h-12 focus:ring-[#059669]/10"
                    currencySymbol={t('currencySymbol')}
                  />
                  <p className="text-xs text-[#64748B]">{t('frequentCustomerPriceHelp')}</p>
                </div>

                {/* Tags Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-[#475569]">{t('productTags')}</Label>
                  
                  {/* Selected Tags Chips */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tagIds.map(tagId => {
                      const tag = availableTags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <Badge
                          key={tag.id}
                          style={{ 
                            backgroundColor: tag.color,
                            color: 'white',
                          }}
                          className="px-3 py-1 rounded-full border-none shadow-sm font-medium flex items-center gap-1 group transition-all"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Tag Selector */}
                  <Select 
                    value={tagSelectorValue}
                    onValueChange={(val) => {
                      if (val === 'create_new') {
                        setIsTagDialogOpen(true);
                      } else if (val && !formData.tagIds.includes(val)) {
                        toggleTag(val);
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl border-[#E2E8F0] h-12">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#94A3B8]" />
                        <SelectValue placeholder={t('selectTags')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="z-[60] rounded-xl border border-[#D9E5E0] bg-white shadow-xl">
                      {availableTags
                        .filter(tag => !formData.tagIds.includes(tag.id))
                        .map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </div>
                          </SelectItem>
                        ))}
                      <SelectItem value="create_new" className="text-[#4338CA] font-bold border-t mt-1">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          {t('addTag')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  bucket="product-images"
                  label={t('productImage')}
                />
                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#059669] hover:bg-[#047857] text-white rounded-xl h-12 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      editingProduct ? t('updateProduct') : t('saveProduct')
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] group-focus-within:text-[#059669] transition-colors" />
          <Input
            placeholder={t('searchProductsPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-2xl border-none shadow-sm bg-white focus:ring-2 focus:ring-[#059669]/20"
          />
        </div>
        <Button variant="outline" className="h-12 rounded-2xl px-6 border-none shadow-sm bg-white text-[#475569] font-bold cursor-pointer hover:bg-[#F8FAFC]">
          <Filter className="w-4 h-4 mr-2" />
          {t('filters')}
        </Button>
      </div>

      {/* Product Table */}
      <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow className="hover:bg-transparent border-b border-[#F1F5F9]">
                  <TableHead className="px-8 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('product')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('defaultUnit')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('basePrice')}</TableHead>
                  <TableHead className="px-6 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs">{t('frequentCustomerPrice')}</TableHead>
                  <TableHead className="px-8 py-6 font-bold text-[#475569] uppercase tracking-wider text-xs text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-80 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-20 h-20 bg-[#F1F5F9] rounded-3xl flex items-center justify-center">
                          <Package className="w-10 h-10 text-[#94A3B8]" />
                        </div>
                        <p className="text-[#64748B] font-bold text-lg">{t('noProductsFound')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {products.map((product, index) => (
                      <TableRow 
                        key={product.id} 
                        ref={index === products.length - 1 ? lastElementRef : null}
                        className="group hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9]"
                      >
                        <TableCell className="px-8 py-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-[#ECFDF5] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 overflow-hidden shadow-sm flex-shrink-0">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-7 h-7 text-[#059669]" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="font-bold text-[#064E3B] text-lg leading-tight">{product.name}</p>
                              <div className="flex flex-wrap gap-1">
                                {product.product_tag_assignment?.map(assignment => (
                                  <Badge 
                                    key={assignment.tag_id}
                                    style={{ backgroundColor: assignment.product_tag.color + '20', color: assignment.product_tag.color, borderColor: assignment.product_tag.color + '40' }}
                                    className="px-2 py-0 text-[10px] font-bold rounded-md border"
                                  >
                                    {assignment.product_tag.name}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-[10px] font-semibold text-[#059669] uppercase tracking-widest">ID: {product.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6">
                          <div className="px-3 py-1 bg-[#F1F5F9] text-[#475569] font-bold text-xs rounded-full w-fit">
                            {(() => {
                              if (!product.unit) return '-';
                              const key = `unit_${product.unit.name}` as any;
                              const translated = t(key);
                              return translated === key ? product.unit.name : translated;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-6 font-extrabold text-[#064E3B] text-lg">
                          {t('currencySymbol')}{product.default_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-6 py-6 font-extrabold text-[#0F172A] text-lg">
                          {product.price_for_frequent_customer != null ? `${t('currencySymbol')}${product.price_for_frequent_customer.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                              className="rounded-xl hover:bg-[#ECFDF5] hover:text-[#059669] cursor-pointer"
                            >
                              <Edit className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="rounded-xl hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center">
                          <Loader2 className="w-8 h-8 text-[#059669] animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
        <Button 
          onClick={scrollToTop}
          className="w-12 h-12 rounded-full bg-white shadow-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] p-0 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
      </div>

      <MassPriceUpdateDialog 
        open={isMassUpdateOpen} 
        onOpenChange={setIsMassUpdateOpen}
        tags={availableTags}
        onSuccess={() => {
          setOffset(0);
          fetchProducts(0, debouncedSearchTerm, true);
        }}
      />
    </div>
  );
}
