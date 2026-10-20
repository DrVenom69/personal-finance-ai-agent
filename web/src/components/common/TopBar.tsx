import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Moon, Sun, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { scenario, setScenario, darkMode, setDarkMode, setIsOnboardingOpen, financials } = useFinance();

  return (
    <header className="sticky top-0 z-30 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Brand Zone: 1-line text element */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-teal-800 dark:bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
            P
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
              ProAct Finance
            </h1>
            <p className="text-[10px] text-teal-800 dark:text-teal-400 font-medium leading-none">
              Fintech Agent
            </p>
          </div>
        </div>

        {/* Competition Judge Scenario Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Judge Scenario Segmented Selector */}
          <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setScenario('normal')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                scenario === 'normal'
                  ? 'bg-white dark:bg-slate-700 text-teal-900 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Normal: Cash ¥600, Safe ¥175"
            >
              Baseline
            </button>
            <button
              onClick={() => setScenario('shortfall')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                scenario === 'shortfall'
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Shortfall: Cash ¥340, Safe -¥85"
            >
              Shortfall
            </button>
          </div>

          {/* Quick Onboarding Tour */}
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Setup / Onboarding Tour"
            aria-label="Start Onboarding Tour"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
