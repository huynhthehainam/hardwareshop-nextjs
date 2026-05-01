'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Plus, Edit, Trash2, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { Badge } from '@/components/ui/badge';

interface ProductTag {
  id: string;
  name: string;
  color: string;
  shop_id: string;
}

export default function TagManagement() {
  const { t } = useI18n();
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#64748B'
  });

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags', err);
      toast.error(t('errorFetchingTags') || 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setSubmitting(true);
      const url = editingTag ? `/api/products/tags/${editingTag.id}` : '/api/products/tags';
      const method = editingTag ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingTag ? t('tagUpdated') : t('tagCreated'));
        setIsDialogOpen(false);
        fetchTags();
      } else {
        throw new Error('Failed to save tag');
      }
    } catch (err) {
      console.error(err);
      toast.error(t('errorSavingTag') || 'Failed to save tag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete') || 'Are you sure?')) return;

    try {
      const res = await fetch(`/api/products/tags/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('tagDeleted'));
        fetchTags();
      }
    } catch (err) {
      console.error(err);
      toast.error(t('errorDeletingTag') || 'Failed to delete tag');
    }
  };

  const openAddDialog = () => {
    setEditingTag(null);
    setFormData({ name: '', color: '#64748B' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: ProductTag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center shadow-sm">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">{t('manageTags')}</h1>
            <p className="text-sm text-[#64748B]">{t('manageTagsSubtitle') || 'Organize products with custom labels'}</p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="rounded-xl bg-[#4338CA] hover:bg-[#3730A3] gap-2">
          <Plus className="w-4 h-4" />
          {t('addTag')}
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4338CA]" />
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <p className="text-[#64748B]">{t('noTags')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map((tag) => (
                <div 
                  key={tag.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] hover:border-[#4338CA] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="font-medium text-[#1E293B]">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openEditDialog(tag)}
                      className="h-8 w-8 text-[#64748B] hover:text-[#4338CA] hover:bg-[#EEF2FF]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(tag.id)}
                      className="h-8 w-8 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1E293B]">
              {editingTag ? t('editTag') : t('addTag')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName" className="text-sm font-medium text-[#475569]">
                {t('tagName')}
              </Label>
              <Input
                id="tagName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-12 p-1 rounded-xl cursor-pointer border-[#E2E8F0]"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="rounded-xl border-[#E2E8F0] uppercase"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Label className="w-full text-xs text-[#64748B] mb-1">{t('preview') || 'Preview'}</Label>
              <Badge 
                style={{ backgroundColor: formData.color }}
                className="px-3 py-1 rounded-full text-white font-medium border-none shadow-sm"
              >
                {formData.name || t('tagNamePlaceholder') || 'Tag Preview'}
              </Badge>
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl"
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="rounded-xl bg-[#4338CA] hover:bg-[#3730A3] min-w-[100px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
