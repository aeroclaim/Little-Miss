import React, { useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, ClipboardList, Download, Gem, Languages, LayoutDashboard, LogOut, MapPin, Printer, Receipt,
  Package, Settings, ShoppingBag, Store, Truck, Undo2, Wallet,
} from 'lucide-react';
import { Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DataProvider } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { LOGO_URL } from '@/lib/brand';
import { dataLayer } from '@/data/dataLayer';
import { isDesktop } from '@/lib/runtime';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import WelcomeGate from '@/components/welcome/WelcomeGate';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', he: 'לוח בקרה', en: 'Dashboard', icon: LayoutDashboard },
  { to: '/catalog', he: 'קטלוג', en: 'Catalog', icon: BookOpen },
  { to: '/print-orders', he: 'הזמנות הדפסה', en: 'Print orders', icon: Printer },
  { to: '/stores', he: 'חנויות', en: 'Stores', icon: Store },
  { to: '/deliveries', he: 'אספקות', en: 'Deliveries', icon: Truck },
  { to: '/packages', he: 'אריזת חבילות', en: 'Package builder', icon: Package },
  { to: '/expenses', he: 'הוצאות', en: 'Expenses', icon: Receipt },
  { to: '/sales', he: 'דיווחי מכירות', en: 'Sales reports', icon: ShoppingBag },
  { to: '/returns', he: 'החזרות', en: 'Returns', icon: Undo2 },
  { to: '/payments', he: 'תשלומים', en: 'Payments', icon: Wallet },
  { to: '/preorders', he: 'הזמנות מראש', en: 'Preorders', icon: ClipboardList },
  { to: '/towns', he: 'ערים', en: 'Towns', icon: MapPin },
  { to: '/rarity', he: 'נדירות', en: 'Rarity', icon: Gem },
  { to: '/settings', he: 'הגדרות', en: 'Settings', icon: Settings },
];

export default function Layout() {
  const { t, lang, setLang } = useLang();
  const queryClient = useQueryClient();
  const backupInput = useRef(null);

  async function exportBackup() {
    const backup = await dataLayer.exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `littlemiss-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !window.confirm(t('הייבוא יחליף את כל הנתונים המקומיים. להמשיך?', 'Importing will replace all local data. Continue?'))) return;
    try {
      await dataLayer.importBackup(JSON.parse(await file.text()));
      await queryClient.invalidateQueries();
      window.alert(t('הנתונים יובאו בהצלחה.', 'Data imported successfully.'));
    } catch (error) {
      window.alert(error.message || t('ייבוא הגיבוי נכשל.', 'Backup import failed.'));
    }
  }

  return (
    <DataProvider>
      <WelcomeGate>
        <div className="min-h-screen bg-wash md:flex">
          <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
            <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
              <Image src={LOGO_URL} alt="Little Miss" fittingType="fit" className="h-10 w-10 shrink-0 rounded-xl bg-card object-cover" />
              <span className="font-display text-lg font-bold tracking-tight text-foreground">Little Miss</span>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-visible">
              {NAV.map(({ to, he, en, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn('flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', isActive && 'bg-sidebar-accent text-sidebar-accent-foreground')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(he, en)}
                </NavLink>
              ))}
            </nav>
            <div className="flex gap-1 border-t border-sidebar-border p-3 md:flex-col">
              <Button variant="ghost" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={exportBackup}>
                <Download className="h-4 w-4" />
                {t('ייצוא גיבוי', 'Export backup')}
              </Button>
              {isDesktop && (
                <>
                  <input ref={backupInput} type="file" accept="application/json,.json" className="hidden" onChange={importBackup} />
                  <Button variant="ghost" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => backupInput.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {t('ייבוא גיבוי', 'Import backup')}
                  </Button>
                </>
              )}
              <Button variant="ghost" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>
                <Languages className="h-4 w-4" />
                {lang === 'he' ? 'English' : 'עברית'}
              </Button>
              {!isDesktop && <Button variant="ghost" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => base44.auth.logout()}>
                <LogOut className="h-4 w-4" />
                {t('התנתקות', 'Log out')}
              </Button>}
            </div>
          </aside>
          <main className="min-w-0 flex-1 p-4 sm:px-8 sm:py-7">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </WelcomeGate>
    </DataProvider>
  );
}