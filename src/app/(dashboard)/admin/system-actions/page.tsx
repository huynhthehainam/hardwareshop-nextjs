import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import { Database } from 'lucide-react';
import Link from 'next/link';

export default async function SystemActionsPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    redirect('/dashboard');
  }

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
            <Button asChild className="w-full max-w-xs rounded-2xl bg-[#059669] text-white hover:bg-[#047857] px-6 py-4 shadow-lg transition-all">
              <Link href="/api/admin/system-actions/clone">{t('downloadDatabaseZip')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
