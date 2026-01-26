import React from 'react';
import { LayoutGrid, TrendingUp, TrendingDown, CreditCard, Settings, CameraIcon } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { cn } from '../lib/utils';

export default function Layout({ children, activeTab, onTabChange }) {
  const { t } = useFinance();


 const NavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => onTabChange(id)} 
      className={cn(
        "flex flex-col items-center justify-center w-full h-full transition-all duration-300 active:scale-90",
        activeTab === id 
          ? "text-blue-600 dark:text-blue-400 -translate-y-1" 
          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      <Icon className={cn("w-6 h-6 mb-1", activeTab === id && "fill-current opacity-20")} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* Main Content Area */}
      {/* We render 'children' here. This contains the specific page (Dashboard, Income, etc.) 
          passed from App.jsx, which has the correct onNavigate prop. */}
      <main className="max-w-md mx-auto min-h-screen p-4 pb-32">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-2xl">
        <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
          <nav className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
            <NavButton id="dashboard" icon={LayoutGrid} label={t('dashboard')} />
            <NavButton id="income" icon={TrendingUp} label={t('income')} />
            <NavButton id="expenses" icon={TrendingDown} label={t('expenses')} />
            <NavButton id="credits" icon={CreditCard} label={t('credits')} />
            <NavButton id="snapshot" icon={CameraIcon} label={t('snapshot')} />
            <NavButton id="settings" icon={Settings} label={t('settings')} />
          </nav>
        </div>
      </div>
    </div>
  );
}