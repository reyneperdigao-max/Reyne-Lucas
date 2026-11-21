import React, { useMemo, useState } from 'react';
import {
  LogOut,
  QrCode,
  FileText,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NexusLogo } from './NexusLogo';
import { AsaasChargeModal, AsaasLoanLike } from './AsaasChargeModal';
import { AsaasChargeInfo, getAsaasStatusMeta, syncAsaasCharge } from '../utils/asaasApi';

export interface ClientPortalLoan extends AsaasLoanLike {
  date: string;
  interestRate: number;
  capitalPago: number;
  jurosPagos: number;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Agendado';
  createdAt?: string;
}

export interface ClientPortalAction {
  id: string;
  type: string;
  description: string;
  amount?: number;
  paymentMethod?: 'DINHEIRO' | 'PIX';
  loanId: string;
  date: string;
}

interface ClientPortalProps {
  userEmail: string;
  displayName: string;
  loans: ClientPortalLoan[];
  actions: ClientPortalAction[];
  loading: boolean;
  onLogout: () => void;
}

function formatBRL(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(isoDate?: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDaysRemaining(dueDate?: string): number | null {
  if (!dueDate) return null;
  const parts = dueDate.split('T')[0].split('-').map(Number);
  if (parts.length !== 3) return null;
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  userEmail,
  displayName,
  loans,
  actions,
  loading,
  onLogout
}) => {
  const [activeView, setActiveView] = useState<'ativas' | 'historico'>('ativas');
  const [selectedChargeLoan, setSelectedChargeLoan] = useState<ClientPortalLoan | null>(null);
  const [liveOverrides, setLiveOverrides] = useState<Record<string, AsaasChargeInfo>>({});
  const [syncingLoanId, setSyncingLoanId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const mergedLoans = useMemo(() => {
    return loans.map((loan) => {
      const override = liveOverrides[loan.id];
      return override ? { ...loan, ...override } : loan;
    });
  }, [loans, liveOverrides]);

  const activeLoans = useMemo(
    () => mergedLoans.filter((l) => l.status !== 'Pago'),
    [mergedLoans]
  );

  const settledLoans = useMemo(
    () => mergedLoans.filter((l) => l.status === 'Pago'),
    [mergedLoans]
  );

  const summary = useMemo(() => {
    const totalOpen = activeLoans.reduce((sum, l) => sum + (l.totalBruto || 0), 0);
    const nextDueLoan = [...activeLoans]
      .filter((l) => l.status !== 'Agendado')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
    return {
      totalOpen,
      activeCount: activeLoans.length,
      settledCount: settledLoans.length,
      nextDueDate: nextDueLoan ? formatDateBR(nextDueLoan.dueDate) : 'Nenhum'
    };
  }, [activeLoans, settledLoans]);

  const handleRefreshAsaasStatus = async (loan: ClientPortalLoan) => {
    if (!loan.asaasChargeId) return;
    setSyncingLoanId(loan.id);
    setFeedbackMsg(null);
    const res = await syncAsaasCharge(loan.asaasChargeId);
    setSyncingLoanId(null);
    if (!res.ok || !res.data) {
      setFeedbackMsg(res.error || 'Não foi possível consultar status no Asaas.');
      return;
    }
    setLiveOverrides((prev) => ({ ...prev, [loan.id]: res.data as AsaasChargeInfo }));
  };

  return (
    <div className="min-h-screen bg-[#07080B] text-slate-200 flex flex-col">
      {/* Top Bar Contract: 3 clean single-row zones */}
      <header className="sticky top-0 z-30 bg-[#07080B]/90 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <NexusLogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              Nexus <span className="text-[#E5E5E5]">Private</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveView('ativas')}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                activeView === 'ativas'
                  ? 'bg-[#F5F5F7] text-black'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <span className="sm:hidden">Ativas</span>
              <span className="hidden sm:inline">Parcelas Ativas</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('historico')}
              className={cn(
                'px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                activeView === 'historico'
                  ? 'bg-[#F5F5F7] text-black'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              Histórico
            </button>
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Greeting + Identity Metadata */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Olá, {displayName || userEmail.split('@')[0]}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Portal do Cliente</span>
            <span aria-hidden="true">·</span>
            <span>{userEmail}</span>
          </div>
        </div>

        {/* KPI Summary Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#101218] p-5 space-y-1.5">
            <span className="text-xs font-medium text-slate-400 block">Saldo Total em Aberto</span>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">
              {formatBRL(summary.totalOpen)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101218] p-5 space-y-1.5">
            <span className="text-xs font-medium text-slate-400 block">Próximo Vencimento</span>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">
              {summary.nextDueDate}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#101218] p-5 space-y-1.5">
            <span className="text-xs font-medium text-slate-400 block">Parcelas / Contratos</span>
            <p className="text-2xl font-bold text-white font-mono tabular-nums">
              {summary.activeCount} ativos · {summary.settledCount} quitados
            </p>
          </div>
        </section>

        {feedbackMsg && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl border border-white/10 bg-[#101218] animate-pulse" />
            ))}
          </div>
        ) : activeView === 'ativas' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Minhas Parcelas Ativas</h2>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {activeLoans.length} {activeLoans.length === 1 ? 'contrato' : 'contratos'}
              </span>
            </div>

            {activeLoans.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#101218] p-10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">Nenhuma parcela em aberto</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Quando um novo empréstimo ou parcela for cadastrado no seu e-mail ({userEmail}), ele aparecerá aqui com as opções de pagamento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeLoans.map((loan) => {
                  const daysDiff = getDaysRemaining(loan.dueDate);
                  const isLate = loan.status === 'Atrasado' || (daysDiff !== null && daysDiff < 0 && loan.status === 'Pendente');
                  const asaasMeta = loan.asaasChargeId ? getAsaasStatusMeta(loan.asaasStatus) : null;

                  return (
                    <div
                      key={loan.id}
                      className="rounded-2xl border border-white/10 bg-[#101218] p-5 sm:p-6 space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="font-semibold text-white text-sm">Contrato #{loan.id.slice(0, 6).toUpperCase()}</span>
                            <span aria-hidden="true">·</span>
                            <span>Contratado em {formatDateBR(loan.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span className={cn('font-semibold', isLate ? 'text-rose-400' : 'text-emerald-400')}>
                              {loan.status === 'Agendado'
                                ? 'Agendado'
                                : isLate
                                ? 'Em Atraso'
                                : 'Em Aberto'}
                            </span>
                          </div>
                          {asaasMeta && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Cobrança Asaas:</span>
                              <span className={cn('font-semibold', asaasMeta.isPaid ? 'text-emerald-400' : asaasMeta.isOverdue ? 'text-rose-400' : 'text-[#F5F5F7]')}>
                                {asaasMeta.label}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="sm:text-right">
                          <span className="text-xs text-slate-400 block">Valor da Parcela / Quitação</span>
                          <span className="text-xl font-bold text-white font-mono tabular-nums">
                            {formatBRL(loan.totalBruto)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block">Capital</span>
                          <span className="font-semibold text-white font-mono tabular-nums mt-0.5 block">
                            {formatBRL(loan.capital)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Juros ({(loan.interestRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span>
                          <span className="font-semibold text-[#F5F5F7] font-mono tabular-nums mt-0.5 block">
                            {formatBRL(Math.max(0, loan.totalBruto - loan.capital))}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Vencimento</span>
                          <span className={cn('font-semibold font-mono tabular-nums mt-0.5 block', isLate ? 'text-rose-400' : 'text-white')}>
                            {formatDateBR(loan.dueDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Prazo</span>
                          <span className={cn('font-semibold mt-0.5 block', isLate ? 'text-rose-400' : 'text-slate-200')}>
                            {daysDiff === null
                              ? '-'
                              : daysDiff === 0
                              ? 'Vence hoje'
                              : daysDiff > 0
                              ? `Faltam ${daysDiff} dias`
                              : `Atrasado ${Math.abs(daysDiff)} dias`}
                          </span>
                        </div>
                      </div>

                      {/* Payment Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {loan.asaasChargeId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedChargeLoan(loan)}
                              className="px-4 py-2.5 rounded-xl bg-[#F5F5F7] hover:bg-white text-black text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
                            >
                              <QrCode className="w-4 h-4" />
                              Pagar com PIX / Ver QR Code
                            </button>

                            {(loan.asaasBankSlipUrl || loan.asaasInvoiceUrl) && (
                              <a
                                href={loan.asaasBankSlipUrl || loan.asaasInvoiceUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
                              >
                                <FileText className="w-4 h-4 text-[#F5F5F7]" />
                                Abrir Boleto / Fatura
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            )}

                            <button
                              type="button"
                              disabled={syncingLoanId === loan.id}
                              onClick={() => handleRefreshAsaasStatus(loan)}
                              className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              <RefreshCw className={cn('w-3.5 h-3.5', syncingLoanId === loan.id && 'animate-spin')} />
                              Atualizar Status
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <CreditCard className="w-4 h-4 text-slate-500" />
                            <span>Cobrança Asaas pendente de emissão pelo credor.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-6">
            {/* Settled Contracts */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Contratos Quitados</h2>
              {settledLoans.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#101218] p-6 text-xs text-slate-400">
                  Nenhum contrato quitado registrado ainda.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#101218]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="px-5 py-3.5 font-semibold">Contrato</th>
                        <th className="px-5 py-3.5 font-semibold">Data</th>
                        <th className="px-5 py-3.5 font-semibold">Vencimento</th>
                        <th className="px-5 py-3.5 font-semibold text-right">Total Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {settledLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-3.5 font-semibold text-white">
                            #{loan.id.slice(0, 6).toUpperCase()}
                          </td>
                          <td className="px-5 py-3.5 font-mono tabular-nums text-slate-300">
                            {formatDateBR(loan.date)}
                          </td>
                          <td className="px-5 py-3.5 font-mono tabular-nums text-slate-300">
                            {formatDateBR(loan.dueDate)}
                          </td>
                          <td className="px-5 py-3.5 font-mono tabular-nums text-emerald-400 font-semibold text-right">
                            {formatBRL((loan.capitalPago || 0) + (loan.jurosPagos || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action / Payment History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#F5F5F7]" />
                <h2 className="text-lg font-semibold text-white">Histórico de Movimentações</h2>
              </div>

              {actions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#101218] p-6 text-xs text-slate-400">
                  Nenhuma movimentação registrada até o momento.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-[#101218]">
                  {actions.map((act) => (
                    <div key={act.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-white">{act.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{formatDateBR(act.date)}</span>
                          {act.paymentMethod && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{act.paymentMethod}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {typeof act.amount === 'number' && act.amount > 0 && (
                        <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums shrink-0">
                          {formatBRL(act.amount)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {selectedChargeLoan && (
        <AsaasChargeModal
          loan={selectedChargeLoan}
          isDark
          canGenerate={false}
          onClose={() => setSelectedChargeLoan(null)}
          onChargeUpdated={(loanId, info) => {
            setLiveOverrides((prev) => ({ ...prev, [loanId]: info }));
          }}
        />
      )}
    </div>
  );
};
