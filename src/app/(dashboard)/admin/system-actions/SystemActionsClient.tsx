'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function SystemActionsClient() {
  const { t } = useI18n();
  const [isCloning, setIsCloning] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);

  const handleClone = async () => {
    try {
      setIsCloning(true);
      const response = await fetch('/api/admin/system-actions/clone');
      
      if (!response.ok) {
        throw new Error('Clone failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hardware-shop-complete-clone.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(t('cloneSuccess') || 'Database cloned successfully');
    } catch (error) {
      console.error('Clone error:', error);
      toast.error(t('cloneError') || 'Failed to clone database');
    } finally {
      setIsCloning(false);
    }
  };

  const handleVacuum = async () => {
    try {
      setIsVacuuming(true);
      const response = await fetch('/api/admin/system-actions/vacuum', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Vacuum failed');
      }

      const result = await response.json();
      toast.success(
        t('vacuumSuccess')?.replace('{count}', result.deletedCount.toString()) || 
        `Vacuum completed. Removed ${result.deletedCount} orphaned files.`
      );
    } catch (error) {
      console.error('Vacuum error:', error);
      toast.error(t('vacuumError') || 'Failed to vacuum storage');
    } finally {
      setIsVacuuming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-3xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center shadow-sm">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-[#064E3B]">{t('systemActionsTitle')}</h1>
            <p className="text-[#64748B] mt-2 max-w-2xl">{t('systemActionsSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Clone Database Card */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-[#F8FAFC] px-8 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#064E3B]">{t('databaseCloneTitle')}</CardTitle>
              <p className="text-sm text-[#475569] mt-2 max-w-2xl">{t('databaseCloneDescription')}</p>
            </div>
            <div className="inline-flex items-center justify-center rounded-3xl bg-[#DBEAFE] p-4 text-[#1D4ED8] shadow-sm">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="rounded-[2rem] border border-[#E2E8F0] bg-[#F8FAFC] p-8 space-y-6">
            <p className="text-sm text-[#475569] leading-7">{t('databaseCloneNote')}</p>
            <Button 
              onClick={handleClone}
              disabled={isCloning}
              className="w-full max-w-xs rounded-2xl bg-[#059669] text-white hover:bg-[#047857] px-6 py-4 shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('cloningDatabase') || 'Cloning...'}
                </>
              ) : (
                t('downloadDatabaseZip')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vacuum Storage Card */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-[#FFF7ED] px-8 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#9A3412]">{t('vacuumStorageTitle')}</CardTitle>
              <p className="text-sm text-[#7C2D12] mt-2 max-w-2xl">{t('vacuumStorageDescription')}</p>
            </div>
            <div className="inline-flex items-center justify-center rounded-3xl bg-[#FFEDD5] p-4 text-[#C2410C] shadow-sm">
              <Wind className="w-6 h-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="rounded-[2rem] border border-[#FED7AA] bg-[#FFFBF7] p-8 space-y-6">
            <p className="text-sm text-[#7C2D12] leading-7">{t('vacuumStorageNote')}</p>
            <Button 
              onClick={handleVacuum}
              disabled={isVacuuming}
              className="w-full max-w-xs rounded-2xl bg-[#EA580C] text-white hover:bg-[#C2410C] px-6 py-4 shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isVacuuming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('vacuumingStorage') || 'Vacuuming...'}
                </>
              ) : (
                t('runStorageVacuum')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
