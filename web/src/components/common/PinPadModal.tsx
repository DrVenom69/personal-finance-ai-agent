import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Lock, Delete, X, ShieldAlert } from 'lucide-react';

export const PinPadModal: React.FC = () => {
  const { isPinModalOpen, closePinModal, pendingT4Action, executeT4WithPin } = useFinance();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isPinModalOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 6) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const verify = async (finalPin: string) => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 400));
    const success = await executeT4WithPin(finalPin);
    setIsVerifying(false);
    if (!success) {
      setErrorMsg('Invalid PIN. Please enter 6 digits.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Security PIN Authorization
              </h3>
              <p className="text-[11px] text-slate-500">Tier 4 Payment Confirmation</p>
            </div>
          </div>
          <button
            onClick={closePinModal}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Details */}
        <div className="my-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Recipient:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{pendingT4Action?.recipient || 'External Merchant'}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Amount:</span>
            <span className="font-bold text-teal-800 dark:text-teal-400 font-mono text-sm">¥{pendingT4Action?.amount || 120}</span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
            Draft only. Enter simulated PIN (e.g., 123456) to release funds.
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex justify-center items-center gap-3 my-5">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                pin.length > idx
                  ? 'bg-teal-800 dark:bg-teal-400 scale-110'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 text-center mb-3 font-medium flex items-center justify-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleDigit(digit)}
              disabled={isVerifying}
              className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-semibold text-slate-800 dark:text-slate-100 transition-all font-mono"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            disabled={isVerifying}
            className="h-12 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200 text-xs font-medium text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            disabled={isVerifying}
            className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-lg font-semibold text-slate-800 dark:text-slate-100 transition-all font-mono"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isVerifying}
            className="h-12 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200 flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={closePinModal}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium py-1"
          >
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  );
};
