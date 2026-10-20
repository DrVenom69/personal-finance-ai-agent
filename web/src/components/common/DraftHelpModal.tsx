import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { MessageSquare, Copy, Check, X } from 'lucide-react';

export const DraftHelpModal: React.FC = () => {
  const { draftHelpText, setDraftHelpText } = useFinance();
  const [copied, setCopied] = useState<boolean>(false);

  if (!draftHelpText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(draftHelpText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Draft Help Message
              </h3>
              <p className="text-[10px] text-slate-500">Draft only · You review and send</p>
            </div>
          </div>
          <button
            onClick={() => setDraftHelpText(null)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4">
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
            Suggested text (edit freely before sharing):
          </label>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all font-sans">
            {draftHelpText}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Message
              </>
            )}
          </button>
          <button
            onClick={() => setDraftHelpText(null)}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
