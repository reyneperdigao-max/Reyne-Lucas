import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink, RefreshCw, FileText, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AsaasBillingType, AsaasChargeInfo, createAsaasCharge, getAsaasStatusMeta, syncAsaasCharge } from '../utils/asaasApi';

export interface AsaasLoanLike {
  id: string;
  clientName: string;
  clientCpf?: string;
  clientPhone?: string;
  clientEmail?: string;
  dueDate: string;
  capital: number;
  totalBruto: number;
  asaasChargeId?: string | null;
  asaasCustomerId?: string | null;
  asaasBillingType?: string | null;
  asaasStatus?: string | null;
  asaasInvoiceUrl?: string | null;
  asaasBankSlipUrl?: string | null;
  asaasPixPayload?: string | null;
  asaasPixQrCode?: string | null;
  asaasBoletoLine?: string | null;
  asaasLastSyncAt?: string | null;
}

interface AsaasChargeModalProps {
  loan: AsaasLoanLike;
  isDark?: boolean;
  canGenerate?: boolean;
  onClose: () => void;
  onChargeUpdated?: (loanId: string, info: AsaasChargeInfo) => Promise<void> | void;
}

export const AsaasChargeModal: React.FC<AsaasChargeModalProps> = ({
  loan,
  isDark = true,
  canGenerate = false,
  onClose,
  onChargeUpdated
}) => {
  const [liveCharge, setLiveCharge] = useState<AsaasChargeInfo | null>(
    loan.asaasChargeId
      ? {
          asaasChargeId: loan.asaasChargeId,
          asaasCustomerId: loan.asaasCustomerId || null,
          asaasBillingType: loan.asaasBillingType || 'UNDEFINED',
          asaasStatus: loan.asaasStatus || 'PENDING',
          asaasInvoiceUrl: loan.asaasInvoiceUrl || null,
          asaasBankSlipUrl: loan.asaasBankSlipUrl || null,
          asaasPixPayload: loan.asaasPixPayload || null,
          asaasPixQrCode: loan.asaasPixQrCode || null,
          asaasBoletoLine: loan.asaasBoletoLine || null,
          asaasLastSyncAt: loan.asaasLastSyncAt || ''
        }
      : null
  );
  const [billingType, setBillingType] = useState<AsaasBillingType>('UNDEFINED');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'pix' | 'boleto' | null>(null);

  const statusMeta = getAsaasStatusMeta(liveCharge?.asaasStatus);

  const handleCopy = (value: string, type: 'pix' | 'boleto') => {
    navigator.clipboard.writeText(value);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSync = async () => {
    if (!liveCharge?.asaasChargeId) return;
    setIsLoading(true);
    setErrorMsg(null);
    const res = await syncAsaasCharge(liveCharge.asaasChargeId);
    setIsLoading(false);
    if (!res.ok || !res.data) {
      setErrorMsg(res.error || 'Não foi possível atualizar a cobrança no Asaas.');
      return;
    }
    setLiveCharge(res.data);
    await onChargeUpdated?.(loan.id, res.data);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const amount = loan.totalBruto > 0 ? loan.totalBruto : loan.capital;
    const res = await createAsaasCharge({
      loanId: loan.id,
      clientName: loan.clientName,
      clientCpf: loan.clientCpf,
      clientPhone: loan.clientPhone,
      clientEmail: loan.clientEmail,
      amount,
      dueDate: loan.dueDate,
      description: `Empréstimo Nexus Private - ${loan.clientName}`,
      billingType
    });
    setIsLoading(false);
    if (!res.ok || !res.data) {
      setErrorMsg(res.error || 'Não foi possível gerar a cobrança no Asaas.');
      return;
    }
    setLiveCharge(res.data);
    await onChargeUpdated?.(loan.id, res.data);
  };

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto',
          isDark ? 'bg-[#101218] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold text-[#D4AF37]">Cobrança Asaas · PIX &amp; Boleto</p>
            <h3 className="text-lg font-bold tracking-tight mt-0.5">{loan.clientName}</h3>
            <p className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
              Valor: {formatBRL(loan.totalBruto > 0 ? loan.totalBruto : loan.capital)} · Venc.: {loan.dueDate.split('-').reverse().join('/')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {liveCharge ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <span className={cn('px-2.5 py-1 rounded-lg border text-xs font-semibold', statusMeta.badgeClass)}>
                  {statusMeta.label}
                </span>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSync}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                Atualizar Status
              </button>
            </div>

            {liveCharge.asaasPixQrCode && !statusMeta.isPaid && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center gap-3 text-center">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#D4AF37]" />
                  QR Code PIX Asaas
                </span>
                <div className="bg-white p-3 rounded-2xl">
                  <img
                    src={`data:image/png;base64,${liveCharge.asaasPixQrCode}`}
                    alt="QR Code PIX Asaas"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              </div>
            )}

            {liveCharge.asaasPixPayload && !statusMeta.isPaid && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">PIX Copia e Cola</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveCharge.asaasPixPayload}
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-xs font-mono text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(liveCharge.asaasPixPayload || '', 'pix')}
                    className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black text-xs font-bold flex items-center gap-1.5 shrink-0 hover:brightness-110 transition-all"
                  >
                    {copiedKey === 'pix' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'pix' ? 'Copiado' : 'Copiar PIX'}
                  </button>
                </div>
              </div>
            )}

            {liveCharge.asaasBoletoLine && !statusMeta.isPaid && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Linha Digitável do Boleto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={liveCharge.asaasBoletoLine}
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-xs font-mono text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(liveCharge.asaasBoletoLine || '', 'boleto')}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    {copiedKey === 'boleto' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'boleto' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {liveCharge.asaasBankSlipUrl && (
                <a
                  href={liveCharge.asaasBankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  Baixar Boleto PDF
                </a>
              )}
              {liveCharge.asaasInvoiceUrl && (
                <a
                  href={liveCharge.asaasInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'py-3 px-4 rounded-xl bg-[#D4AF37] hover:brightness-110 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all',
                    !liveCharge.asaasBankSlipUrl && 'sm:col-span-2'
                  )}
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Fatura (Pix / Boleto)
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Este contrato ainda não possui uma cobrança emitida no Asaas.
            </p>
            {canGenerate && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Forma de Cobrança Asaas</label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value as AsaasBillingType)}
                    className="w-full rounded-xl bg-[#161922] border border-white/10 px-3.5 py-3 text-xs text-white outline-none focus:border-[#D4AF37]"
                  >
                    <option value="UNDEFINED">Pix e Boleto (Cliente escolhe)</option>
                    <option value="PIX">Somente PIX</option>
                    <option value="BOLETO">Somente Boleto Bancário</option>
                  </select>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGenerate}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#D4AF37] hover:brightness-110 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  {isLoading ? 'Gerando Cobrança no Asaas...' : 'Gerar Cobrança Asaas Agora'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
