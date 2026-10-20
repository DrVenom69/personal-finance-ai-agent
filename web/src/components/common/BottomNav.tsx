import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Gauge, CheckSquare, PieChart, Bot, ShieldCheck } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useFinance();

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Gauge },
    { id: 'check' as const, label: 'Check', icon: CheckSquare },
    { id: 'insights' as const, label: 'Insights', icon: PieChart },
    { id: 'agent' as const, label: 'Agent', icon: Bot },
    { id: 'security' as const, label: 'Security', icon: ShieldCheck },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors relative ${
                isActive
                  ? 'text-teal-800 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-normal'
              }`}
              aria-label={item.label}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
              <span className="text-[11px] tracking-tight mt-1 whitespace-nowrap">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-teal-800 dark:bg-teal-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
