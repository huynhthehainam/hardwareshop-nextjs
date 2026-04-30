'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';
import { uploadFile, BucketName } from '@/lib/supabase/storage';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket: BucketName;
  folder?: string;
  label?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  bucket,
  folder = 'images',
  label,
  className = ''
}: ImageUploadProps) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('genericError'));
      return;
    }

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('genericError')); // Or a specific size error
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const publicUrl = await uploadFile(bucket, filePath, file);
      onChange(publicUrl);
      toast.success(t('imageUploaded'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`${t('imageUploadFailed')}: ${message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <Label className="text-sm font-bold text-[#475569]">{label}</Label>}
      
      <div className="relative group w-fit">
        <div className="w-40 h-40 rounded-3xl border-2 border-dashed border-[#E2E8F0] flex items-center justify-center overflow-hidden bg-[#F8FAFC] group-hover:border-[#059669] transition-all duration-300">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center space-y-2 text-[#94A3B8]">
              <ImageIcon className="w-10 h-10" />
              <span className="text-xs font-semibold">{t('noProductsFound')}</span>
            </div>
          )}
        </div>

        <label 
          htmlFor={`image-upload-${label?.replace(/\s+/g, '-').toLowerCase() || 'default'}`}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl"
        >
          <div className="text-white flex flex-col items-center">
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold">{t('uploadImage')}</span>
          </div>
        </label>

        <input 
          id={`image-upload-${label?.replace(/\s+/g, '-').toLowerCase() || 'default'}`}
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleUpload}
          disabled={uploading}
        />

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-3xl">
            <Loader2 className="w-8 h-8 text-[#059669] animate-spin" />
          </div>
        )}
      </div>

      {value && (
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={removeImage}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl px-3 h-8"
        >
          <X className="w-4 h-4 mr-1" />
          {t('removeImage')}
        </Button>
      )}
    </div>
  );
}
