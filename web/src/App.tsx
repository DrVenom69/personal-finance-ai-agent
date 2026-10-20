import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/common/TopBar';
import { BottomNav } from './components/common/BottomNav';
import { FooterDisclaimer } from './components/common/FooterDisclaimer';
import { PinPadModal } from './components/common/PinPadModal';
import { DraftHelpModal } from './components/common/DraftHelpModal';
import { HomeScreen } from './components/home/HomeScreen';
import { PurchaseCheckScreen } from './components/check/PurchaseCheckScreen';
import { InsightsScreen } from './components/insights/InsightsScreen';
import { AgentScreen } from './components/agent/AgentScreen';
import { SecurityScreen } from './components/security/SecurityScreen';
import { ImportModal } from './components/import/ImportModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

const AppContent: React.FC = () => {
  const { activeTab } = useFinance();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex justify-center selection:bg-teal-800 selection:text-white transition-colors">
      {/* Mobile-first viewport container (responsive up to desktop framing) */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 dark:bg-slate-950 border-x border-slate-200/80 dark:border-slate-800/80 flex flex-col shadow-xl relative">
        <TopBar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-x-hidden">
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'check' && <PurchaseCheckScreen />}
          {activeTab === 'insights' && <InsightsScreen />}
          {activeTab === 'agent' && <AgentScreen />}
          {activeTab === 'security' && <SecurityScreen />}
        </main>

        <FooterDisclaimer />
        <BottomNav />

        {/* Global Modals & Drawers */}
        <ImportModal />
        <PinPadModal />
        <DraftHelpModal />
        <OnboardingModal />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
