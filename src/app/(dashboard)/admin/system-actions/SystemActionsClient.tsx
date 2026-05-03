'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, Wind, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n/I18nProvider';

export default function SystemActionsClient() {
  const { t } = useI18n();
  const [isCloning, setIsCloning] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackFile, setRollbackFile] = useState<File | null>(null);

  const handleClone = async () => {
    // ... rest of handleClone
  };

  const handleVacuum = async () => {
    // ... rest of handleVacuum
  };

  const handleRollback = async () => {
    if (!rollbackFile) {
      toast.error(t('selectRollbackFile'));
      return;
    }

    if (!confirm(t('confirmRollback'))) {
      return;
    }

    try {
      setIsRollingBack(true);
      const formData = new FormData();
      formData.append('file', rollbackFile);

      const response = await fetch('/api/admin/system-actions/rollback', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rollback failed');
      }

      toast.success(t('rollbackSuccess'));
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to rollback data');
    } finally {
      setIsRollingBack(false);
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
                  {t('cloningDatabase')}
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
                  {t('vacuumingStorage')}
                </>
              ) : (
                t('runStorageVacuum')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rollback Database Card */}
      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-[#FEF2F2] px-8 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#991B1B]">{t('rollbackDatabaseTitle')}</CardTitle>
              <p className="text-sm text-[#991B1B] mt-2 max-w-2xl">{t('rollbackDatabaseDescription')}</p>
            </div>
            <div className="inline-flex items-center justify-center rounded-3xl bg-[#FEE2E2] p-4 text-[#DC2626] shadow-sm">
              <RotateCcw className="w-6 h-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="rounded-[2rem] border border-[#FECACA] bg-[#FFF5F5] p-8 space-y-6">
            <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-[#FECACA] flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#991B1B] uppercase tracking-wider mb-2">{t('selectBackupFile')}</p>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".zip"
                    onChange={(e) => setRollbackFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-3 bg-white border-2 border-dashed border-[#FECACA] group-hover:border-[#F87171] rounded-xl p-3 transition-all">
                    <div className="bg-[#FEF2F2] p-2 rounded-lg text-[#DC2626]">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-[#7F1D1D] truncate">
                      {rollbackFile ? rollbackFile.name : t('clickToUploadZip')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-[#991B1B] leading-7 font-medium">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-[#DC2626] text-white text-[10px] font-black rounded-full mr-2">!</span>
                {t('rollbackWarning')}
              </p>
              
              <Button 
                onClick={handleRollback}
                disabled={isRollingBack || !rollbackFile}
                className="w-full max-w-xs rounded-2xl bg-[#DC2626] text-white hover:bg-[#991B1B] px-6 py-4 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isRollingBack ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('rollingBack')}
                  </>
                ) : (
                  t('restoreFromBackup')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
