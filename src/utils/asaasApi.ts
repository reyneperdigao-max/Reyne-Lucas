export type AsaasBillingType = 'UNDEFINED' | 'PIX' | 'BOLETO';

export interface AsaasChargeInfo {
  asaasCustomerId?: string | null;
  asaasChargeId: string;
  asaasBillingType: string;
  asaasStatus: string;
  asaasInvoiceUrl?: string | null;
  asaasBankSlipUrl?: string | null;
  asaasPixPayload?: string | null;
  asaasPixQrCode?: string | null;
  asaasBoletoLine?: string | null;
  asaasLastSyncAt: string;
}

export interface AsaasServerStatus {
  configured: boolean;
  environment: 'sandbox' | 'production';
}

export interface AsaasStatusMeta {
  label: string;
  isPaid: boolean;
  isOverdue: boolean;
  badgeClass: string;
}

export function getAsaasStatusMeta(status?: string | null): AsaasStatusMeta {
  const normalized = (status || '').toUpperCase().trim();
  switch (normalized) {
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
    case 'DUNNING_RECEIVED':
      return {
        label: 'Pago no Asaas',
        isPaid: true,
        isOverdue: false,
        badgeClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      };
    case 'OVERDUE':
    case 'DUNNING_REQUESTED':
      return {
        label: 'Vencida no Asaas',
        isPaid: false,
        isOverdue: true,
        badgeClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
      };
    case 'AWAITING_RISK_ANALYSIS':
      return {
        label: 'Em Análise Asaas',
        isPaid: false,
        isOverdue: false,
        badgeClass: 'text-amber-300 border-amber-500/30 bg-amber-500/10'
      };
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
      return {
        label: 'Estornada',
        isPaid: false,
        isOverdue: true,
        badgeClass: 'text-rose-300 border-rose-500/30 bg-rose-500/10'
      };
    case 'PENDING':
    default:
      return {
        label: 'Aguardando Pagamento',
        isPaid: false,
        isOverdue: false,
        badgeClass: 'text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10'
      };
  }
}

export async function fetchAsaasServerStatus(): Promise<AsaasServerStatus> {
  try {
    const res = await fetch('/api/asaas/status');
    if (!res.ok) return { configured: false, environment: 'sandbox' };
    return (await res.json()) as AsaasServerStatus;
  } catch {
    return { configured: false, environment: 'sandbox' };
  }
}

export interface AsaasChargeResult {
  ok: boolean;
  data?: AsaasChargeInfo;
  configured?: boolean;
  error?: string;
}

export async function createAsaasCharge(payload: {
  loanId: string;
  clientName: string;
  clientCpf?: string;
  clientPhone?: string;
  clientEmail?: string;
  amount: number;
  dueDate: string;
  description?: string;
  billingType?: AsaasBillingType;
}): Promise<AsaasChargeResult> {
  try {
    const res = await fetch('/api/asaas/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = (await res.json()) as AsaasChargeInfo & { error?: string; configured?: boolean };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        error: json.error || 'Não foi possível gerar cobrança no Asaas.'
      };
    }
    return { ok: true, data: json };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro de comunicação com o servidor Asaas.'
    };
  }
}

export async function syncAsaasCharge(
  paymentId: string
): Promise<AsaasChargeResult> {
  try {
    const res = await fetch(`/api/asaas/charges/${encodeURIComponent(paymentId)}`);
    const json = (await res.json()) as AsaasChargeInfo & { error?: string; configured?: boolean };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        error: json.error || 'Não foi possível consultar status no Asaas.'
      };
    }
    return { ok: true, data: json };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro ao atualizar status Asaas.'
    };
  }
}
