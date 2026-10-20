import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { PermissionTier, AuditResult } from '../../types/finance';
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  Lock,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileCheck2,
  EyeOff,
  Cpu,
  Layers,
  FileCode,
} from 'lucide-react';

export const SecurityScreen: React.FC = () => {
  const {
    auditLogs,
    isChainValid,
    simulateTampering,
    resetAuditChain,
    downloadAuditLogJson,
  } = useFinance();
  const [filterResult, setFilterResult] = useState<string>('all');

  const tiers: { tier: PermissionTier; title: string; desc: string; color: string }[] = [
    {
      tier: 'T0',
      title: 'T0 Read',
      desc: 'Queries balances, projected bills, and runway dates. Read-only, zero side-effects.',
      color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    },
    {
      tier: 'T1',
      title: 'T1 Suggest',
      desc: 'Recommends budget shifts, pausing unused streaming services, or waiting on wants.',
      color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    },
    {
      tier: 'T2',
      title: 'T2 Reversible change',
      desc: 'Updates spending style preferences or tags. Undoable in one tap.',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    },
    {
      tier: 'T3',
      title: 'T3 Sandbox money move',
      desc: 'Internal transfers between cash and savings pot. Capped at ¥500/day. Approval card required.',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      tier: 'T4',
      title: 'T4 Payment / External',
      desc: 'Actual bill payments or bank dispatches. AI drafts only; user signs with simulated 6-digit PIN.',
      color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    },
  ];

  const knownRisks = [
    {
      name: 'Prompt Injection',
      mitigation: 'Rule-based filter quarantines adversarial directives before LLM input.',
    },
    {
      name: 'Wrong LLM Numbers',
      mitigation: 'Hard isolation: LLM provides language only; financial runway math is 100% computed in deterministic code.',
    },
    {
      name: 'Over-Permissioned Actions',
      mitigation: 'Strict 5-tier boundary prevents autonomous execution of funds or outbound wires.',
    },
    {
      name: 'Personal Data Sent to Models',
      mitigation: 'On-device parsing: only sanitized, anonymized categorical totals leave local sandbox.',
    },
    {
      name: 'Audit Tampering',
      mitigation: 'Append-only ledger with simulated SHA-256 state hashes and chain validation.',
    },
    {
      name: 'Wrong Transaction Parsing',
      mitigation: 'Confidence scoring routes ambiguous SMS rows to manual one-tap user confirmation.',
    },
  ];

  const filteredLogs = [...auditLogs].reverse().filter((log) => {
    if (filterResult === 'all') return true;
    return log.result === filterResult;
  });

  const getResultBadge = (res: AuditResult) => {
    switch (res) {
      case 'approved':
        return (
          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved
          </span>
        );
      case 'blocked':
        return (
          <span className="text-[10px] font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Blocked
          </span>
        );
      case 'overridden':
        return (
          <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-amber-600" /> Overridden
          </span>
        );
      case 'draft':
        return (
          <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
            <FileCode className="w-3 h-3 text-slate-500" /> Draft
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-150">
      {/* Privacy Mode Card */}
      <div className="p-4 rounded-3xl bg-teal-800 text-white shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-teal-200" />
            <h2 className="text-sm font-bold">Privacy Mode Enforced</h2>
          </div>
          <span className="text-[10px] font-mono bg-teal-900/80 px-2 py-0.5 rounded-full text-teal-200">
            Local First
          </span>
        </div>
        <p className="text-xs text-teal-100 leading-relaxed">
          Reads SMS and wallet statements directly on your phone. Only anonymized categorical summaries go to the AI model. No bank credentials, real names, or account numbers ever leave this device.
        </p>
      </div>

      {/* Permission Tiers Breakdown */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-teal-800 dark:text-teal-400" />
            Authorization Tier Taxonomy
          </h3>
          <span className="text-[10px] text-slate-500">Autonomous bounds</span>
        </div>

        <div className="space-y-2">
          {tiers.map((t) => (
            <div
              key={t.tier}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3"
            >
              <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg shrink-0 ${t.color}`}>
                {t.title}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal pt-0.5">
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail with Export & Chain Verified Badge */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Audit & Execution Trail
            </h3>
            {/* Real result of verifyChain */}
            {isChainValid ? (
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Chain verified ✓
              </span>
            ) : (
              <span className="text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <XCircle className="w-3 h-3 text-rose-600" /> Chain broken
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Simulate Tampering Button */}
            <button
              onClick={simulateTampering}
              className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-medium hover:bg-amber-100 transition-colors"
              title="Edits an entry in memory to simulate ledger tampering"
            >
              Simulate tampering
            </button>

            {/* Reset Button */}
            <button
              onClick={resetAuditChain}
              className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 transition-colors"
              title="Restores the verified cryptographic chain"
            >
              Reset
            </button>

            {/* Export JSON Button */}
            <button
              onClick={downloadAuditLogJson}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              title="Export audit trail as JSON for compliance"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download execution log</span>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto text-xs pb-1">
          {['all', 'approved', 'blocked', 'overridden'].map((res) => (
            <button
              key={res}
              onClick={() => setFilterResult(res)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors text-[11px] font-medium ${
                filterResult === res
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {res}
            </button>
          ))}
        </div>

        {/* Audit Log Entries */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {entry.action}
                </span>
                {getResultBadge(entry.result)}
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {entry.details || entry.ruleUsed}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono border-t border-slate-200 dark:border-slate-700">
                <span>{entry.timestamp}</span>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded font-sans text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    {entry.tier}
                  </span>
                  <span
                    className="font-mono text-[9px] text-teal-800 dark:text-teal-400 bg-teal-50/80 dark:bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/60 cursor-help"
                    title={`Full SHA-256: ${entry.hash}\nPrevious: ${entry.prevHash}`}
                  >
                    {entry.hash.substring(0, 8)}..{entry.hash.substring(entry.hash.length - 6)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Known-Risk Matrix */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Fintech Competition Safety Guardrails
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {knownRisks.map((risk, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-0.5"
            >
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-800 dark:bg-teal-400" />
                {risk.name}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-2.5">
                {risk.mitigation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
