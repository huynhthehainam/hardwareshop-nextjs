import { requireAuth } from '@/lib/auth';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { createTranslator } from '@/lib/i18n/translate';
import { getLocale } from '@/lib/i18n/server';
import { LogoutButton } from '@/components/LogoutButton';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Store,   Database,
  ChevronRight
} from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = createTranslator(locale);
  const { user, role, systemRole } = await requireAuth();

  const navItems =
    systemRole === 'system_admin'
      ? []
      : [
          { href: '/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
          { href: '/orders', label: t('navOrders'), icon: ShoppingCart },
          { href: '/products', label: t('navProducts'), icon: Package },
          { href: '/customers', label: t('navCustomers'), icon: Users },
        ];

  if (systemRole === 'system_admin') {
    navItems.push({ href: '/admin/shops', label: t('navShopsAdmin'), icon: Store });
    navItems.push({ href: '/admin/system-actions', label: t('navSystemActions'), icon: Database });
  } else if (role === 'admin') {
    navItems.push({ href: '/shops', label: t('navShopsAdmin'), icon: Store });
  }

  return (
    <div className="flex min-h-screen bg-[#ECFDF5]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E2E8F0] shadow-sm hidden md:block flex-shrink-0">
        <div className="p-8 border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#059669] rounded-lg flex items-center justify-center text-white shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#064E3B]">{t('appName')}</h1>
          </div>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className="group flex items-center justify-between px-4 py-3 text-[#475569] hover:bg-[#ECFDF5] hover:text-[#059669] rounded-xl transition-all duration-200 font-medium cursor-pointer"
            >
              <div className="flex items-center">
                <item.icon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                {item.label}
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E2E8F0] h-20 flex items-center justify-between px-10 sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#059669] uppercase tracking-wider">{t('workspace')}</span>
            <span className="text-sm font-medium text-[#64748B]">
              {t('welcomeBack')} <span className="text-[#064E3B]">{user.email}</span>
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <LocaleSwitcher />
            <LogoutButton label={t('logout')} />
          </div>
        </header>
        <main className="p-10 max-w-[1600px]">
          {children}
        </main>
      </div>
    </div>
  );
}
