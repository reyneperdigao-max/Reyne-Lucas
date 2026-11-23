import { auth } from '../firebase';
import type {
  ClientPortalCharge,
  ClientPortalContract,
  ClientPortalOperationType,
  ClientPortalPayment,
  PendingAsaasReconciliation
} from '../types/clientPortal';

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
  source?: 'user' | 'env' | 'none';
}

export interface UserAsaasConfigView {
  configured: boolean;
  environment: 'sandbox' | 'production';
  apiKeyMasked: string;
  hasWebhookToken: boolean;
  webhookTokenMasked: string;
  webhookUrl: string;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  updatedAt: string | null;
  source: 'user' | 'env' | 'none';
}

export interface UserAsaasConfigActionResult {
  ok: boolean;
  data?: UserAsaasConfigView;
  message?: string;
  error?: string;
}

export interface AsaasStatusMeta {
  label: string;
  isPaid: boolean;
  isOverdue: boolean;
  badgeClass: string;
}

async function resolveAuthToken(explicitIdToken?: string): Promise<string | null> {
  if (explicitIdToken) return explicitIdToken;
  try {
    return (await auth.currentUser?.getIdToken()) || null;
  } catch {
    return null;
  }
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
        badgeClass: 'text-slate-200 border-white/25 bg-white/10'
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
        badgeClass: 'text-[#F5F5F7] border-white/30 bg-white/10'
      };
  }
}

export async function fetchAsaasServerStatus(explicitIdToken?: string): Promise<AsaasServerStatus> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    const headers: Record<string, string> = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const res = await fetch('/api/asaas/status', { headers });
    if (!res.ok) return { configured: false, environment: 'sandbox', source: 'none' };
    return (await res.json()) as AsaasServerStatus;
  } catch {
    return { configured: false, environment: 'sandbox', source: 'none' };
  }
}

export async function fetchUserAsaasConfig(explicitIdToken?: string): Promise<UserAsaasConfigActionResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return { ok: false, error: 'Autenticação necessária para consultar configuração Asaas.' };
    }
    const res = await fetch('/api/asaas/config', {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const json = (await res.json()) as UserAsaasConfigView & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || 'Não foi possível carregar configuração Asaas.' };
    }
    return { ok: true, data: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de comunicação ao carregar configuração Asaas.'
    };
  }
}

export async function saveUserAsaasConfig(
  payload: {
    apiKey?: string;
    environment: 'sandbox' | 'production';
    webhookToken?: string;
    updateWebhookToken?: boolean;
  },
  explicitIdToken?: string
): Promise<UserAsaasConfigActionResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }
    const res = await fetch('/api/asaas/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    const json = (await res.json()) as UserAsaasConfigView & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || 'Não foi possível salvar a configuração Asaas.' };
    }
    return {
      ok: true,
      data: json,
      message: 'Configuração Asaas salva com segurança para a sua conta!'
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de comunicação ao salvar configuração Asaas.'
    };
  }
}

export async function testUserAsaasConfig(
  payload: {
    apiKey?: string;
    environment?: 'sandbox' | 'production';
  },
  explicitIdToken?: string
): Promise<UserAsaasConfigActionResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }
    const res = await fetch('/api/asaas/config/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    const json = (await res.json()) as {
      ok?: boolean;
      message?: string;
      error?: string;
      config?: UserAsaasConfigView;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        data: json.config,
        error: json.error || 'Falha ao validar a conexão com o Asaas.'
      };
    }
    return {
      ok: true,
      data: json.config,
      message: json.message || 'Conexão validada com sucesso!'
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de comunicação ao testar conexão Asaas.'
    };
  }
}

export async function clearUserAsaasConfig(explicitIdToken?: string): Promise<UserAsaasConfigActionResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }
    const res = await fetch('/api/asaas/config', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const json = (await res.json()) as UserAsaasConfigView & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || 'Não foi possível limpar a configuração Asaas.' };
    }
    return {
      ok: true,
      data: json,
      message: 'Configuração Asaas removida da sua conta.'
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao limpar configuração Asaas.'
    };
  }
}

export interface AsaasChargeResult {
  ok: boolean;
  data?: AsaasChargeInfo;
  configured?: boolean;
  needsUserConfig?: boolean;
  error?: string;
}

export async function createAsaasCharge(
  payload: {
    loanId: string;
    clientName: string;
    clientCpf?: string;
    clientPhone?: string;
    clientEmail?: string;
    amount: number;
    dueDate: string;
    description?: string;
    billingType?: AsaasBillingType;
  },
  explicitIdToken?: string
): Promise<AsaasChargeResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return {
        ok: false,
        configured: false,
        error: 'Autenticação necessária para gerar cobranças Asaas.'
      };
    }

    const res = await fetch('/api/asaas/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    const json = (await res.json()) as AsaasChargeInfo & {
      error?: string;
      configured?: boolean;
      needsUserConfig?: boolean;
    };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        needsUserConfig: Boolean(json.needsUserConfig),
        error: json.error || 'Não foi possível gerar cobrança no Asaas.'
      };
    }
    return { ok: true, data: json, configured: true };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro de comunicação com o servidor Asaas.'
    };
  }
}

export async function syncAsaasCharge(
  paymentId: string,
  explicitIdToken?: string
): Promise<AsaasChargeResult> {
  try {
    const idToken = await resolveAuthToken(explicitIdToken);
    if (!idToken) {
      return {
        ok: false,
        configured: false,
        error: 'Autenticação necessária para consultar cobranças Asaas.'
      };
    }

    const res = await fetch(`/api/asaas/charges/${encodeURIComponent(paymentId)}`, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    const json = (await res.json()) as AsaasChargeInfo & {
      error?: string;
      configured?: boolean;
      needsUserConfig?: boolean;
    };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        needsUserConfig: Boolean(json.needsUserConfig),
        error: json.error || 'Não foi possível consultar status no Asaas.'
      };
    }
    return { ok: true, data: json, configured: true };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro ao atualizar status Asaas.'
    };
  }
}

export interface ClientPortalProjectionResponse {
  activeCharges: ClientPortalCharge[];
  pendingSettlements: PendingAsaasReconciliation[];
  settledPayments: ClientPortalPayment[];
  projectedContract?: Partial<ClientPortalContract>;
  asaasConfigured?: boolean;
}

export async function fetchClientPortalProjection(
  token: string
): Promise<{ ok: boolean; data?: ClientPortalProjectionResponse; error?: string }> {
  try {
    const res = await fetch(`/api/client-portal/projection/${encodeURIComponent(token)}`);
    const json = (await res.json()) as ClientPortalProjectionResponse & { error?: string };
    if (!res.ok) {
      return { ok: false, error: json.error || 'Erro ao consultar projeção do contrato.' };
    }
    return { ok: true, data: json };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro de conexão com o servidor.'
    };
  }
}

export async function createClientPortalPixCharge(payload: {
  token: string;
  operationType: ClientPortalOperationType;
  amortizedAmount?: number;
  contractSnapshot: {
    loanId: string;
    uid: string;
    lenderName: string;
    clientName: string;
    capital: number;
    interestRate: number;
    periodInterest: number;
    dueDate: string;
    date: string;
    status: string;
    asaasCustomerId?: string | null;
  };
}): Promise<{
  ok: boolean;
  data?: ClientPortalCharge;
  configured?: boolean;
  needsUserConfig?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/client-portal/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = (await res.json()) as ClientPortalCharge & {
      error?: string;
      configured?: boolean;
      needsUserConfig?: boolean;
    };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        needsUserConfig: Boolean(json.needsUserConfig),
        error: json.error || 'Não foi possível gerar a cobrança PIX no Asaas.'
      };
    }
    return { ok: true, data: json, configured: true };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro de comunicação com o servidor.'
    };
  }
}

export async function syncClientPortalPixCharge(
  token: string,
  chargeId: string
): Promise<{
  ok: boolean;
  data?: ClientPortalCharge;
  configured?: boolean;
  needsUserConfig?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(
      `/api/client-portal/charges/${encodeURIComponent(token)}/${encodeURIComponent(chargeId)}/sync`
    );
    const json = (await res.json()) as ClientPortalCharge & {
      error?: string;
      configured?: boolean;
      needsUserConfig?: boolean;
    };
    if (!res.ok) {
      return {
        ok: false,
        configured: json.configured !== false,
        needsUserConfig: Boolean(json.needsUserConfig),
        error: json.error || 'Não foi possível consultar status do PIX no Asaas.'
      };
    }
    return { ok: true, data: json, configured: true };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro ao verificar pagamento PIX.'
    };
  }
}

export async function syncContractsBillingRegistry(
  idToken: string,
  contracts: Array<{
    token: string;
    loanId: string;
    lenderName: string;
    clientName: string;
    clientCpf?: string;
    clientPhone?: string;
    clientEmail?: string;
    asaasCustomerId?: string | null;
    capital: number;
    interestRate: number;
    periodInterest: number;
    totalBruto: number;
    date: string;
    dueDate: string;
    status: string;
    capitalPago: number;
    jurosPagos: number;
  }>
): Promise<boolean> {
  try {
    const res = await fetch('/api/client-portal/sync-contracts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ contracts })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPendingAsaasReconciliations(
  idToken: string
): Promise<PendingAsaasReconciliation[]> {
  try {
    const res = await fetch('/api/asaas/pending-reconciliations', {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { pending?: PendingAsaasReconciliation[] };
    return Array.isArray(json.pending) ? json.pending : [];
  } catch {
    return [];
  }
}

export async function ackAsaasReconciliation(
  idToken: string,
  chargeId: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/asaas/pending-reconciliations/ack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ chargeId })
    });
    return res.ok;
  } catch {
    return false;
  }
}
