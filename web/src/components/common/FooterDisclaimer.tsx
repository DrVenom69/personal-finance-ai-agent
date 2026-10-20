import React from 'react';
import { Info } from 'lucide-react';

export const FooterDisclaimer: React.FC = () => {
  return (
    <footer className="pt-6 pb-20 text-center text-[11px] text-slate-500 dark:text-slate-500 flex items-center justify-center gap-1.5 px-4 select-none">
      <Info className="w-3.5 h-3.5 shrink-0 opacity-70" />
      <span>Guidance only, not licensed financial advice.</span>
    </footer>
  );
};
