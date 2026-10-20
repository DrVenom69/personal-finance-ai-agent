import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { UserFinancials } from '../../types/finance';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Wallet,
  Calendar,
  Sparkles,
  Target,
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, financials, completeOnboarding } = useFinance();
  const [step, setStep] = useState<number>(1);

  // Form states initialized with Alex defaults
  const [monthlyIncome, setMonthlyIncome] = useState<number>(financials.monthlyIncome || 4000);
  const [cash, setCash] = useState<number>(financials.cash || 600);
  const [daysToPayday, setDaysToPayday] = useState<number>(financials.daysToPayday || 9);
  const [committedBills, setCommittedBills] = useState<number>(financials.committedBills || 200);
  const [dailyBaseline, setDailyBaseline] = useState<number>(financials.dailyBaseline || 25);
  const [spendingStyle, setSpendingStyle] = useState<'Frugal Saver' | 'Balanced' | 'Luxury Lover'>(
    financials.spendingStyle || 'Balanced'
  );
  const [savingsGoal, setSavingsGoal] = useState<number>(financials.savingsGoal || 3000);

  if (!isOnboardingOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completeOnboarding({
        monthlyIncome,
        cash,
        daysToPayday,
        committedBills,
        dailyBaseline,
        spendingStyle,
        savingsGoal,
      });
    }
  };

  const handleSkip = () => {
    setIsOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        {/* Header & Step Dots */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Setup Runway
              </h3>
              <p className="text-[10px] text-slate-500">Step {step} of 3</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Skip
          </button>
        </div>

        {/* Step Progress Indicator */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step >= s ? 'bg-teal-800 dark:bg-teal-400' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Income and Payday Date */}
        {step === 1 && (
          <div className="space-y-3.5 py-1">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Income & Payday Schedule
              </h4>
              <p className="text-xs text-slate-500">
                How much arrives each month and when is your next paycheck?
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Monthly Net Income (¥)
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Current Cash on Hand (¥)
              </label>
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Days until next payday
              </label>
              <input
                type="number"
                value={daysToPayday}
                onChange={(e) => setDaysToPayday(Number(e.target.value))}
                min="1"
                max="31"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        )}

        {/* Step 2: Fixed Bills & Daily Baseline */}
        {step === 2 && (
          <div className="space-y-3.5 py-1">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Committed Bills & Baseline
              </h4>
              <p className="text-xs text-slate-500">
                Non-negotiable expenses due before your next payday.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Committed Bills until payday (¥)
              </label>
              <input
                type="number"
                value={committedBills}
                onChange={(e) => setCommittedBills(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                e.g. Electricity ¥120 + Broadband ¥80
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Daily Food & Transit Baseline (¥ / day)
              </label>
              <input
                type="number"
                value={dailyBaseline}
                onChange={(e) => setDailyBaseline(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
              <span className="text-[10px] text-teal-700 dark:text-teal-400 mt-0.5 block">
                Total protected for {daysToPayday}d: ¥{daysToPayday * dailyBaseline}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Spending Style & Savings Goal */}
        {step === 3 && (
          <div className="space-y-3.5 py-1">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Spending Style & Goal
              </h4>
              <p className="text-xs text-slate-500">
                How should the agent balance advice and warnings?
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Financial Persona
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Frugal Saver', 'Balanced', 'Luxury Lover'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setSpendingStyle(style)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl border text-center transition-all ${
                      spendingStyle === style
                        ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Primary Savings Goal (¥)
              </label>
              <input
                type="number"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Current savings pot: ¥{financials.savingsPot}
              </span>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <span>{step === 3 ? 'Save & Calculate Runway' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
