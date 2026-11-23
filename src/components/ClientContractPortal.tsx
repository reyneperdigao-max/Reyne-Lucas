import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowDownRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  History,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet
} from 'lucide-react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { NexusLogo } from './NexusLogo';
import {
  ClientPortalCharge,
  ClientPortalContract,
  ClientPortalOperationType,
  ClientPortalPayment,
  PendingAsaasReconciliation,
  computeNextDueDateISO
} from '../types/clientPortal';
import {
  createClientPortalPixCharge,
  fetchClientPortalProjection,
  getAsaasStatusMeta,
  syncClientPortalPixCharge
} from '../utils/asaasApi';
import { formatCurrencyInputBRL, parseCurrencyBRL } from '../utils/brFormatters';

interface ClientContractPortalProps {
  token: string;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatBRL(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(isoDate?: string | null): string {
  if (!isoDate) return '-';
  const clean = isoDate.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getDaysRemaining(dueDate?: string): number | null {
  if (!dueDate) return null;
  const parts = dueDate.split('T')[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const due = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getOperationTitle(op: ClientPortalOperationType | 'PAGAMENTO'): string {
  switch (op) {
    case 'JUROS':
      return 'Pagamento de Juros (Renovação)';
    case 'AMORTIZACAO':
      return 'Amortização + Juros';
    case 'QUITACAO':
      return 'Quitação Total';
    default:
      return 'Pagamento Confirmado';
  }
}

export const ClientContractPortal: React.FC<ClientContractPortalProps> = ({ token }) => {
  const [baseContract, setBaseContract] = useState<ClientPortalContract | null>(null);
  const [firestoreCharges, setFirestoreCharges] = useState<ClientPortalCharge[]>([]);
  const [firestorePayments, setFirestorePayments] = useState<ClientPortalPayment[]>([]);
  const [serverCharges, setServerCharges] = useState<ClientPortalCharge[]>([]);
  const [serverPendingSettlements, setServerPendingSettlements] = useState<PendingAsaasReconciliation[]>([]);
  const [serverPayments, setServerPayments] = useState<ClientPortalPayment[]>([]);

  const [portalStatus, setPortalStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [selectedOption, setSelectedOption] = useState<ClientPortalOperationType>('JUROS');
  const [amortizationInputStr, setAmortizationInputStr] = useState('');
  const [activeChargeId, setActiveChargeId] = useState<string | null>(null);
  const [generatingOp, setGeneratingOp] = useState<ClientPortalOperationType | null>(null);
  const [syncingChargeId, setSyncingChargeId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [asaasMissingConfigMsg, setAsaasMissingConfigMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const isValidFormat = useMemo(() => /^cli_[a-zA-Z0-9_-]{20,124}$/.test(token), [token]);

  useEffect(() => {
    document.title = 'Nexus Private · Área do Cliente';
  }, []);

  // Load Firestore isolated contract portal + payment history + charges
  useEffect(() => {
    if (!isValidFormat) {
      setPortalStatus('invalid');
      return;
    }

    const unsubPortal = onSnapshot(
      doc(db, 'client_portals', token),
      (snap) => {
        if (!snap.exists()) {
          setBaseContract(null);
          setPortalStatus('invalid');
          return;
        }
        const data = snap.data() as ClientPortalContract;
        if (!data.active) {
          setBaseContract(null);
          setPortalStatus('invalid');
          return;
        }
        setBaseContract(data);
        setPortalStatus('ready');
      },
      (err) => {
        console.error('Erro ao carregar portal do contrato:', err);
        setPortalStatus('invalid');
      }
    );

    const qCharges = query(
      collection(db, 'client_portals', token, 'charges'),
      where('token', '==', token)
    );
    const unsubCharges = onSnapshot(
      qCharges,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClientPortalCharge));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setFirestoreCharges(list);
      },
      (err) => {
        console.error('Erro ao ouvir cobranças do contrato:', err);
      }
    );

    const qPayments = query(
      collection(db, 'client_portals', token, 'payments'),
      where('token', '==', token)
    );
    const unsubPayments = onSnapshot(
      qPayments,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ClientPortalPayment));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setFirestorePayments(list);
      },
      (err) => {
        console.error('Erro ao ouvir histórico de pagamentos:', err);
      }
    );

    return () => {
      unsubPortal();
      unsubCharges();
      unsubPayments();
    };
  }, [token, isValidFormat]);

  // Fetch server-side projection (covers webhooks / instant settlements before admin reconciles Firestore)
  const refreshServerProjection = async () => {
    if (!isValidFormat) return;
    const res = await fetchClientPortalProjection(token);
    if (res.ok && res.data) {
      setServerCharges(res.data.activeCharges || []);
      setServerPendingSettlements(res.data.pendingSettlements || []);
      setServerPayments(res.data.settledPayments || []);
      if (res.data.asaasConfigured === false) {
        setAsaasMissingConfigMsg(
          'O pagamento PIX automático pelo portal ainda não foi ativado pelo seu consultor. Você continua visualizando normalmente seu saldo, juros, vencimento e histórico — solicite os dados de pagamento pelo WhatsApp enquanto o consultor conclui a configuração em Ajustes > Integração Asaas.'
        );
      } else {
        setAsaasMissingConfigMsg(null);
      }
    }
  };

  useEffect(() => {
    if (portalStatus !== 'ready') return;
    refreshServerProjection();
  }, [portalStatus, token]);

  // Compute effective contract view combining Firestore truth + un-reconciled server webhook settlements
  const effectiveContract = useMemo<ClientPortalContract | null>(() => {
    if (!baseContract) return null;

    const existingPaymentChargeIds = new Set(
      firestorePayments.map((p) => p.asaasChargeId || p.id).filter(Boolean)
    );
    const settledFirestoreChargeIds = new Set(
      firestoreCharges.filter((c) => c.settled).map((c) => c.asaasChargeId || c.id)
    );

    const pendingToApply = serverPendingSettlements
      .filter(
        (s) =>
          !existingPaymentChargeIds.has(s.asaasChargeId) &&
          !settledFirestoreChargeIds.has(s.asaasChargeId)
      )
      .sort((a, b) => (a.settledAt || '').localeCompare(b.settledAt || ''));

    let capital = round2(baseContract.capital);
    let periodInterest = round2(baseContract.periodInterest);
    let totalBruto = round2(baseContract.totalBruto);
    let dueDate = baseContract.dueDate;
    let date = baseContract.date;
    let status = baseContract.status;
    let capitalPago = round2(baseContract.capitalPago);
    let jurosPagos = round2(baseContract.jurosPagos);
    const interestRate = Math.max(0, baseContract.interestRate || 0);

    for (const st of pendingToApply) {
      if (st.operationType === 'JUROS') {
        jurosPagos = round2(jurosPagos + st.interestAmount);
        dueDate = st.dueDateAfter || computeNextDueDateISO(dueDate);
        date = (st.settledAt || new Date().toISOString()).slice(0, 10);
        periodInterest = round2(capital * interestRate);
        totalBruto = round2(capital + periodInterest);
        status = 'Pago';
      } else if (st.operationType === 'AMORTIZACAO') {
        capital = round2(Math.max(0, capital - st.amortizedAmount));
        capitalPago = round2(capitalPago + st.amortizedAmount);
        jurosPagos = round2(jurosPagos + st.interestAmount);
        dueDate = st.dueDateAfter || computeNextDueDateISO(dueDate);
        date = (st.settledAt || new Date().toISOString()).slice(0, 10);
        periodInterest = round2(capital * interestRate);
        totalBruto = round2(capital + periodInterest);
        status = capital === 0 ? 'Pago' : 'Pendente';
      } else if (st.operationType === 'QUITACAO') {
        capitalPago = round2(capitalPago + capital);
        jurosPagos = round2(jurosPagos + st.interestAmount);
        capital = 0;
        periodInterest = 0;
        totalBruto = 0;
        status = 'Pago';
      }
    }

    if (capital > 0 && periodInterest <= 0 && interestRate > 0) {
      periodInterest = round2(capital * interestRate);
      totalBruto = round2(capital + periodInterest);
    }

    return {
      ...baseContract,
      capital,
      periodInterest,
      totalBruto,
      dueDate,
      date,
      status,
      capitalPago,
      jurosPagos
    };
  }, [baseContract, firestorePayments, firestoreCharges, serverPendingSettlements]);

  // Combined payment history (deduplicated by asaasChargeId / id)
  const paymentHistory = useMemo<ClientPortalPayment[]>(() => {
    const map = new Map<string, ClientPortalPayment>();
    for (const p of firestorePayments) {
      map.set(p.asaasChargeId || p.id, p);
    }
    for (const p of serverPayments) {
      const key = p.asaasChargeId || p.id;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [firestorePayments, serverPayments]);

  // Active PIX charge currently awaiting payment (preferring user's selected or most recent unsettled PIX)
  const mergedCharges = useMemo<ClientPortalCharge[]>(() => {
    const map = new Map<string, ClientPortalCharge>();
    for (const c of firestoreCharges) {
      map.set(c.id, c);
    }
    for (const c of serverCharges) {
      const existing = map.get(c.id);
      map.set(c.id, existing ? { ...existing, ...c, settled: existing.settled || c.settled } : c);
    }
    for (const s of serverPendingSettlements) {
      const existing = map.get(s.asaasChargeId);
      if (existing) {
        map.set(s.asaasChargeId, {
          ...existing,
          asaasStatus: s.asaasStatus,
          settled: true,
          settledAt: s.settledAt
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [firestoreCharges, serverCharges, serverPendingSettlements]);

  const activeCharge = useMemo<ClientPortalCharge | null>(() => {
    if (activeChargeId) {
      const found = mergedCharges.find((c) => c.id === activeChargeId);
      if (found) return found;
    }
    const pending = mergedCharges.find(
      (c) => !c.settled && !getAsaasStatusMeta(c.asaasStatus).isPaid
    );
    return pending || null;
  }, [activeChargeId, mergedCharges]);

  // Automatic 5-second background polling while a generated PIX is pending
  useEffect(() => {
    if (!activeCharge || activeCharge.settled || getAsaasStatusMeta(activeCharge.asaasStatus).isPaid) {
      return;
    }

    const interval = setInterval(async () => {
      const res = await syncClientPortalPixCharge(token, activeCharge.asaasChargeId);
      if (res.ok && res.data) {
        setServerCharges((prev) => {
          const next = prev.filter((c) => c.id !== res.data!.id);
          return [res.data!, ...next];
        });
        if (res.data.settled || getAsaasStatusMeta(res.data.asaasStatus).isPaid) {
          setSuccessMsg('Pagamento PIX confirmado automaticamente! Seu contrato foi atualizado.');
          await refreshServerProjection();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCharge?.id, activeCharge?.settled, activeCharge?.asaasStatus, token]);

  const capital = effectiveContract?.capital || 0;
  const periodInterest = effectiveContract?.periodInterest || 0;
  const interestRatePercent = ((effectiveContract?.interestRate || 0) * 100).toLocaleString('pt-BR', {
    maximumFractionDigits: 2
  });
  const isSettled = Boolean(
    effectiveContract && effectiveContract.status === 'Pago' && effectiveContract.capital <= 0
  );
  const daysDiff = getDaysRemaining(effectiveContract?.dueDate);
  const isLate = Boolean(
    effectiveContract &&
      !isSettled &&
      (effectiveContract.status === 'Atrasado' ||
        (daysDiff !== null && daysDiff < 0 && effectiveContract.status === 'Pendente'))
  );
  const nextDueDateISO = useMemo(
    () => (effectiveContract ? computeNextDueDateISO(effectiveContract.dueDate) : ''),
    [effectiveContract?.dueDate]
  );

  // Amortization math & real-time validation
  const amortizedInputValue = useMemo(
    () => round2(parseCurrencyBRL(amortizationInputStr)),
    [amortizationInputStr]
  );

  const amortizationValidationError = useMemo(() => {
    if (!amortizationInputStr.trim()) return null;
    if (amortizedInputValue <= 0) {
      return 'O valor a amortizar deve ser maior que R$ 0,00.';
    }
    if (amortizedInputValue >= capital) {
      return 'Para liquidar 100% do saldo principal, selecione a opção "Quitar contrato" abaixo.';
    }
    return null;
  }, [amortizationInputStr, amortizedInputValue, capital]);

  const isAmortizationValid = amortizedInputValue > 0 && amortizedInputValue < capital;
  const amortizationTotalPix = useMemo(
    () => (isAmortizationValid ? round2(periodInterest + amortizedInputValue) : periodInterest),
    [isAmortizationValid, periodInterest, amortizedInputValue]
  );
  const projectedBalanceAfterAmortization = useMemo(
    () => (isAmortizationValid ? round2(Math.max(0, capital - amortizedInputValue)) : capital),
    [isAmortizationValid, capital, amortizedInputValue]
  );

  const payoffTotalPix = useMemo(() => round2(capital + periodInterest), [capital, periodInterest]);

  const handleGeneratePix = async (operationType: ClientPortalOperationType) => {
    if (!effectiveContract || isSettled) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (operationType === 'AMORTIZACAO' && !isAmortizationValid) {
      setErrorMsg('Informe um valor válido para amortização maior que R$ 0,00 e menor que o saldo principal.');
      return;
    }

    setGeneratingOp(operationType);
    const res = await createClientPortalPixCharge({
      token,
      operationType,
      amortizedAmount: operationType === 'AMORTIZACAO' ? amortizedInputValue : undefined,
      contractSnapshot: {
        loanId: effectiveContract.loanId,
        uid: effectiveContract.uid,
        lenderName: effectiveContract.lenderName,
        clientName: effectiveContract.clientName,
        capital: effectiveContract.capital,
        interestRate: effectiveContract.interestRate,
        periodInterest: effectiveContract.periodInterest,
        dueDate: effectiveContract.dueDate,
        date: effectiveContract.date,
        status: effectiveContract.status,
        asaasCustomerId: effectiveContract.asaasCustomerId || null
      }
    });
    setGeneratingOp(null);

    if (!res.ok || !res.data) {
      if (res.needsUserConfig || res.configured === false) {
        setAsaasMissingConfigMsg(
          res.error ||
            'O pagamento PIX automático ainda não foi ativado para este contrato. Fale com seu consultor pelo WhatsApp enquanto ele configura a chave Asaas em Ajustes > Integração Asaas.'
        );
      } else {
        setErrorMsg(res.error || 'Não foi possível gerar a cobrança PIX no momento.');
      }
      return;
    }

    setAsaasMissingConfigMsg(null);
    const charge = res.data;

    // Persist unsettled charge breakdown in Firestore subcollection for audit & admin reconciliation
    try {
      await setDoc(doc(db, 'client_portals', token, 'charges', charge.id), {
        id: charge.id,
        token: charge.token,
        loanId: charge.loanId,
        uid: charge.uid,
        operationType: charge.operationType,
        totalAmount: charge.totalAmount,
        interestAmount: charge.interestAmount,
        amortizedAmount: charge.amortizedAmount,
        principalBefore: charge.principalBefore,
        projectedNewCapital: charge.projectedNewCapital,
        dueDateBefore: charge.dueDateBefore,
        dueDateAfter: charge.dueDateAfter,
        billingType: 'PIX',
        asaasChargeId: charge.asaasChargeId,
        asaasStatus: charge.asaasStatus || 'PENDING',
        asaasPixPayload: charge.asaasPixPayload || null,
        asaasPixQrCode: charge.asaasPixQrCode || null,
        asaasInvoiceUrl: charge.asaasInvoiceUrl || null,
        asaasExpirationDate: charge.asaasExpirationDate || null,
        settled: false,
        settledAt: null,
        createdAt: charge.createdAt,
        updatedAt: charge.updatedAt
      });
    } catch (err) {
      console.warn('Registro complementar da cobrança no Firestore não concluído:', err);
    }

    setServerCharges((prev) => [charge, ...prev.filter((c) => c.id !== charge.id)]);
    setActiveChargeId(charge.id);
  };

  const handleManualSyncCharge = async (charge: ClientPortalCharge) => {
    setSyncingChargeId(charge.id);
    setErrorMsg(null);
    const res = await syncClientPortalPixCharge(token, charge.asaasChargeId);
    setSyncingChargeId(null);

    if (!res.ok || !res.data) {
      setErrorMsg(res.error || 'Não foi possível consultar o status no Asaas.');
      return;
    }

    setServerCharges((prev) => [res.data!, ...prev.filter((c) => c.id !== res.data!.id)]);
    if (res.data.settled || getAsaasStatusMeta(res.data.asaasStatus).isPaid) {
      setSuccessMsg('Pagamento PIX confirmado! Seu saldo e vencimento foram atualizados.');
      await refreshServerProjection();
    } else {
      setSuccessMsg('Status consultado: aguardando confirmação do pagamento no Asaas.');
    }
  };

  const handleCopyPixPayload = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  if (portalStatus === 'loading') {
    return (
      <div className="min-h-dvh bg-[#07080B] text-white flex flex-col items-center justify-center gap-5 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-11 h-11 rounded-full border border-white/20 border-t-[#F5F5F7] animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-400">
          Carregando Seu Contrato
        </p>
      </div>
    );
  }

  if (portalStatus === 'invalid' || !effectiveContract) {
    return (
      <div className="min-h-dvh bg-[#07080B] text-white flex items-center justify-center px-5 py-10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#101218] p-8 text-center space-y-5 shadow-2xl">
          <div className="flex justify-center">
            <NexusLogo className="w-14 h-14" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
              Nexus Private · Área do Cliente
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Link inválido ou contrato indisponível
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Este acesso exclusivo não está ativo no momento. Solicite o link atualizado diretamente ao seu consultor pelo WhatsApp.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Acesso restrito por token único</span>
          </div>
        </div>
      </div>
    );
  }

  const activeChargeStatusMeta = activeCharge ? getAsaasStatusMeta(activeCharge.asaasStatus) : null;
  const activeChargePaid = Boolean(activeCharge?.settled || activeChargeStatusMeta?.isPaid);

  return (
    <div className="min-h-dvh bg-[#07080B] text-slate-100 flex flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Isolated Client Top Bar */}
      <header className="sticky top-0 z-30 bg-[#07080B]/92 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <NexusLogo className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-white uppercase leading-none truncate">
                Nexus <span className="text-[#E5E5E5]">Private</span>
              </p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.22em] mt-1 truncate">
                Área do Cliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[11px] font-mono font-bold text-slate-300">
              #{effectiveContract.loanId.slice(0, 6).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Contract Primary Card */}
        <section className="rounded-3xl border border-white/12 bg-gradient-to-b from-[#13161F] to-[#0D0F15] p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-white/[0.07]">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 block">
                Contrato Exclusivo
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {effectiveContract.clientName}
              </h1>
              <p className="text-xs text-slate-400">
                Consultor: <span className="text-slate-200 font-semibold">{effectiveContract.lenderName}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start">
              <span
                className={cn(
                  'px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5',
                  isSettled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : isLate
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : effectiveContract.status === 'Pago'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                    : 'bg-white/10 border-white/25 text-[#F5F5F7]'
                )}
              >
                {isSettled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Contrato Quitado
                  </>
                ) : isLate ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Em Atraso
                  </>
                ) : effectiveContract.status === 'Pago' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ciclo Renovado
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Em Aberto
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Exclusively Contract KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Saldo Principal Atual
              </span>
              <p className="text-2xl font-black text-white font-mono tabular-nums tracking-tight">
                {formatBRL(capital)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Juros do Período ({interestRatePercent}%)
              </span>
              <p className="text-2xl font-black text-[#F5F5F7] font-mono tabular-nums tracking-tight">
                {formatBRL(periodInterest)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Vencimento
              </span>
              <p
                className={cn(
                  'text-2xl font-black font-mono tabular-nums tracking-tight',
                  isSettled ? 'text-emerald-400' : isLate ? 'text-rose-400' : 'text-white'
                )}
              >
                {isSettled ? 'Quitado' : formatDateBR(effectiveContract.dueDate)}
              </p>
              {!isSettled && daysDiff !== null && (
                <p
                  className={cn(
                    'text-[11px] font-semibold',
                    isLate ? 'text-rose-400' : 'text-slate-400'
                  )}
                >
                  {daysDiff === 0
                    ? 'Vence hoje'
                    : daysDiff > 0
                    ? `Vence em ${daysDiff} ${daysDiff === 1 ? 'dia' : 'dias'}`
                    : `${Math.abs(daysDiff)} ${Math.abs(daysDiff) === 1 ? 'dia' : 'dias'} em atraso`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#E5E5E5] shrink-0" />
            <span>
              Ambiente isolado: você visualiza exclusivamente os dados e pagamentos deste contrato.
            </span>
          </div>
        </section>

        {/* Friendly notice when owner has not yet configured Asaas key */}
        {asaasMissingConfigMsg && (
          <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F5F5F7]" />
            <div>
              <p className="font-bold text-white mb-0.5">Pagamento PIX online aguardando ativação</p>
              <p className="text-slate-400">{asaasMissingConfigMsg}</p>
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active PIX Checkout Card */}
        {activeCharge && !activeChargePaid && (
          <section className="rounded-3xl border border-white/25 bg-[#10131B] p-5 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#F5F5F7]">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>PIX Asaas Gerado · {getOperationTitle(activeCharge.operationType)}</span>
                </div>
                <p className="text-2xl font-black text-white font-mono tabular-nums">
                  {formatBRL(activeCharge.totalAmount)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeChargeStatusMeta && (
                  <span
                    className={cn(
                      'px-3 py-1.5 rounded-xl border text-xs font-bold',
                      activeChargeStatusMeta.badgeClass
                    )}
                  >
                    {activeChargeStatusMeta.label}
                  </span>
                )}
              </div>
            </div>

            {/* Operation Breakdown Stored on Charge */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-black/40 border border-white/10 p-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Juros</span>
                <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                  {formatBRL(activeCharge.interestAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Amortizado</span>
                <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                  {formatBRL(activeCharge.amortizedAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Novo Saldo</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums mt-0.5 block">
                  {formatBRL(activeCharge.projectedNewCapital)}
                </span>
              </div>
            </div>

            {activeCharge.asaasPixQrCode && (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="bg-white p-3.5 rounded-2xl shadow-lg">
                  <img
                    src={`data:image/png;base64,${activeCharge.asaasPixQrCode}`}
                    alt="QR Code PIX Asaas"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  Escaneie o QR Code no aplicativo do seu banco ou copie o código PIX abaixo.
                </p>
              </div>
            )}

            {activeCharge.asaasPixPayload && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  PIX Copia e Cola
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    readOnly
                    value={activeCharge.asaasPixPayload}
                    className="flex-1 rounded-xl bg-black/50 border border-white/15 px-3.5 py-3 text-xs font-mono text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyPixPayload(activeCharge.asaasPixPayload || '')}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-white via-[#E5E5E5] to-[#D4D4D8] hover:brightness-105 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98]"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? 'Código Copiado!' : 'Copiar PIX'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                disabled={syncingChargeId === activeCharge.id}
                onClick={() => handleManualSyncCharge(activeCharge)}
                className="flex-1 py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={cn('w-4 h-4', syncingChargeId === activeCharge.id && 'animate-spin')}
                />
                <span>
                  {syncingChargeId === activeCharge.id
                    ? 'Verificando no Asaas...'
                    : 'Já Paguei · Verificar Confirmação'}
                </span>
              </button>

              {activeCharge.asaasInvoiceUrl && (
                <a
                  href={activeCharge.asaasInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Fatura Asaas</span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Three PIX Payment Options (when contract still has open principal) */}
        {isSettled ? (
          <section className="rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.06] p-7 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-black text-white">Contrato 100% Quitado</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              O saldo devedor deste contrato foi zerado e todas as parcelas foram liquidadas. Confira o histórico de pagamentos abaixo.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#F5F5F7]" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-white">
                  Opções de Pagamento via PIX
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Confirmação automática Asaas
              </span>
            </div>

            <div className="grid gap-3.5">
              {/* OPTION 1: Pagar só os juros (Renovação) */}
              <div
                onClick={() => setSelectedOption('JUROS')}
                className={cn(
                  'rounded-3xl border p-5 sm:p-6 transition-all cursor-pointer space-y-4',
                  selectedOption === 'JUROS'
                    ? 'border-white/40 bg-[#141720] shadow-[0_0_30px_rgba(255,255,255,0.06)]'
                    : 'border-white/10 bg-[#101218] hover:border-white/25'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white text-black text-xs font-black flex items-center justify-center shrink-0">
                        1
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Pagar só os juros (Renovação)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      Mantém o saldo principal de {formatBRL(capital)} e renova o vencimento para{' '}
                      <strong className="text-slate-200">{formatDateBR(nextDueDateISO)}</strong>.
                    </p>
                  </div>
                  <div className="pl-8 sm:pl-0 sm:text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Valor Exato
                    </span>
                    <span className="text-xl font-black text-white font-mono tabular-nums">
                      {formatBRL(periodInterest)}
                    </span>
                  </div>
                </div>

                {selectedOption === 'JUROS' && (
                  <div className="pt-2 pl-0 sm:pl-8">
                    <button
                      type="button"
                      disabled={generatingOp !== null || periodInterest <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePix('JUROS');
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-white via-[#E5E5E5] to-[#D4D4D8] hover:brightness-105 text-black text-xs font-black uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        {generatingOp === 'JUROS'
                          ? 'Gerando PIX de Renovação...'
                          : `Gerar PIX de Renovação · ${formatBRL(periodInterest)}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* OPTION 2: Amortizar capital (Juros obrigatórios + Parte do capital) */}
              <div
                onClick={() => setSelectedOption('AMORTIZACAO')}
                className={cn(
                  'rounded-3xl border p-5 sm:p-6 transition-all cursor-pointer space-y-4',
                  selectedOption === 'AMORTIZACAO'
                    ? 'border-white/40 bg-[#141720] shadow-[0_0_30px_rgba(255,255,255,0.06)]'
                    : 'border-white/10 bg-[#101218] hover:border-white/25'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white text-black text-xs font-black flex items-center justify-center shrink-0">
                        2
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Amortizar capital (Juros obrigatórios + Parte do capital)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      Abata uma parte do saldo principal junto com os juros obrigatórios e renove o vencimento para{' '}
                      <strong className="text-slate-200">{formatDateBR(nextDueDateISO)}</strong>.
                    </p>
                  </div>
                  <div className="pl-8 sm:pl-0 sm:text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Total Estimado
                    </span>
                    <span className="text-xl font-black text-white font-mono tabular-nums">
                      {formatBRL(amortizationTotalPix)}
                    </span>
                  </div>
                </div>

                {selectedOption === 'AMORTIZACAO' && (
                  <div className="pt-2 pl-0 sm:pl-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* Locked mandatory period interest */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs">
                        <Lock className="w-4 h-4 text-[#E5E5E5] shrink-0" />
                        <div>
                          <p className="font-bold text-white">Juros Obrigatórios do Período</p>
                          <p className="text-[11px] text-slate-400">Valor mínimo travado para renovação</p>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono tabular-nums text-[#F5F5F7]">
                        {formatBRL(periodInterest)}
                      </span>
                    </div>

                    {/* Amortization input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-200 block">
                        Valor que deseja abater do Saldo Principal
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={amortizationInputStr}
                          onChange={(e) => setAmortizationInputStr(formatCurrencyInputBRL(e.target.value))}
                          className="w-full rounded-2xl bg-black/50 border border-white/20 focus:border-white pl-11 pr-4 py-3.5 text-base font-mono font-bold text-white outline-none transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Informe um valor entre R$ 0,01 e {formatBRL(Math.max(0, round2(capital - 0.01)))}.
                      </p>
                      {amortizationValidationError && (
                        <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 pt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{amortizationValidationError}</span>
                        </p>
                      )}
                    </div>

                    {/* Real-time preview of new principal balance */}
                    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 space-y-2.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Juros obrigatórios do período:</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatBRL(periodInterest)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Valor de amortização no capital:</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatBRL(isAmortizationValid ? amortizedInputValue : 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10 text-sm font-black text-white">
                        <span>Total do PIX a pagar:</span>
                        <span className="font-mono tabular-nums text-base">
                          {formatBRL(amortizationTotalPix)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <ArrowDownRight className="w-4 h-4" />
                          Novo saldo devedor após pagamento:
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-400 tabular-nums">
                          {formatBRL(projectedBalanceAfterAmortization)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={generatingOp !== null || !isAmortizationValid}
                      onClick={() => handleGeneratePix('AMORTIZACAO')}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-white via-[#E5E5E5] to-[#D4D4D8] hover:brightness-105 text-black text-xs font-black uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        {generatingOp === 'AMORTIZACAO'
                          ? 'Gerando PIX de Amortização...'
                          : isAmortizationValid
                          ? `Gerar PIX de Amortização · ${formatBRL(amortizationTotalPix)}`
                          : 'Informe o valor para amortizar'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* OPTION 3: Quitar contrato */}
              <div
                onClick={() => setSelectedOption('QUITACAO')}
                className={cn(
                  'rounded-3xl border p-5 sm:p-6 transition-all cursor-pointer space-y-4',
                  selectedOption === 'QUITACAO'
                    ? 'border-white/40 bg-[#141720] shadow-[0_0_30px_rgba(255,255,255,0.06)]'
                    : 'border-white/10 bg-[#101218] hover:border-white/25'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-400 text-black text-xs font-black flex items-center justify-center shrink-0">
                        3
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        Quitar contrato
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 pl-8">
                      Soma Saldo Principal ({formatBRL(capital)}) + Juros do Período ({formatBRL(periodInterest)}). Zera o saldo e encerra o contrato.
                    </p>
                  </div>
                  <div className="pl-8 sm:pl-0 sm:text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Quitação Total
                    </span>
                    <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                      {formatBRL(payoffTotalPix)}
                    </span>
                  </div>
                </div>

                {selectedOption === 'QUITACAO' && (
                  <div className="pt-2 pl-0 sm:pl-8 space-y-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5 flex items-center justify-between text-xs">
                      <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Saldo após pagamento:
                      </span>
                      <span className="font-mono font-black text-emerald-400">R$ 0,00 (Quitado)</span>
                    </div>
                    <button
                      type="button"
                      disabled={generatingOp !== null || payoffTotalPix <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePix('QUITACAO');
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black uppercase tracking-[0.16em] flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>
                        {generatingOp === 'QUITACAO'
                          ? 'Gerando PIX de Quitação...'
                          : `Gerar PIX de Quitação · ${formatBRL(payoffTotalPix)}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contract-Isolated Payment History */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#F5F5F7]" />
              <h2 className="text-sm sm:text-base font-black uppercase tracking-[0.14em] text-white">
                Histórico de Pagamentos
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {paymentHistory.length} {paymentHistory.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {paymentHistory.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#101218] p-6 text-center text-xs text-slate-400">
              Nenhum pagamento registrado neste contrato ainda.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#101218] divide-y divide-white/[0.06] overflow-hidden">
              {paymentHistory.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {getOperationTitle(item.operationType)}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-300 border border-white/10">
                        {item.paymentMethod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatDateBR(item.date)}
                      </span>
                      {item.interestAmount > 0 && (
                        <span>Juros: {formatBRL(item.interestAmount)}</span>
                      )}
                      {item.amortizedAmount > 0 && (
                        <span>Amortizado: {formatBRL(item.amortizedAmount)}</span>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className="text-sm font-black font-mono tabular-nums text-emerald-400">
                      {formatBRL(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
