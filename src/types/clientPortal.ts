export type ClientPortalOperationType = 'JUROS' | 'AMORTIZACAO' | 'QUITACAO';

export interface ClientPortalContract {
  token: string;
  loanId: string;
  uid: string;
  lenderName: string;
  clientName: string;
  capital: number;
  interestRate: number;
  periodInterest: number;
  totalBruto: number;
  date: string;
  dueDate: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Agendado';
  capitalPago: number;
  jurosPagos: number;
  asaasCustomerId?: string | null;
  active: boolean;
  updatedAt: string;
}

export interface ClientPortalCharge {
  id: string;
  token: string;
  loanId: string;
  uid: string;
  operationType: ClientPortalOperationType;
  totalAmount: number;
  interestAmount: number;
  amortizedAmount: number;
  principalBefore: number;
  projectedNewCapital: number;
  dueDateBefore: string;
  dueDateAfter: string;
  billingType: 'PIX';
  asaasChargeId: string;
  asaasStatus: string;
  asaasPixPayload?: string | null;
  asaasPixQrCode?: string | null;
  asaasInvoiceUrl?: string | null;
  asaasExpirationDate?: string | null;
  settled: boolean;
  settledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPortalPayment {
  id: string;
  token: string;
  loanId: string;
  uid: string;
  operationType: ClientPortalOperationType | 'PAGAMENTO';
  amount: number;
  interestAmount: number;
  amortizedAmount: number;
  paymentMethod: 'PIX' | 'DINHEIRO';
  description: string;
  asaasChargeId?: string | null;
  date: string;
}

export interface PendingAsaasReconciliation {
  id: string;
  token: string;
  loanId: string;
  uid: string;
  operationType: ClientPortalOperationType;
  totalAmount: number;
  interestAmount: number;
  amortizedAmount: number;
  principalBefore: number;
  projectedNewCapital: number;
  dueDateBefore: string;
  dueDateAfter: string;
  asaasChargeId: string;
  asaasStatus: string;
  settledAt: string;
  webhookEvent?: string | null;
}

export function generateClientAccessToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `cli_${hex}`;
}

export function buildClientPortalUrl(token: string): string {
  if (typeof window === 'undefined') return `/?cliente=${encodeURIComponent(token)}`;
  return `${window.location.origin}/?cliente=${encodeURIComponent(token)}`;
}

export function computeNextDueDateISO(currentDueDateStr: string, referenceNow: Date = new Date()): string {
  const today = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate());
  const parts = (currentDueDateStr || '').split('T')[0].split('-').map(Number);

  const addOneCalendarMonth = (base: Date): Date => {
    const targetMonth = base.getMonth() + 1;
    const year = base.getFullYear() + Math.floor(targetMonth / 12);
    const month = targetMonth % 12;
    const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(base.getDate(), lastDayOfTargetMonth);
    return new Date(year, month, clampedDay);
  };

  let baseDue: Date;
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    baseDue = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    baseDue = today;
  }

  let nextDue = addOneCalendarMonth(baseDue);
  if (isNaN(nextDue.getTime()) || nextDue < today) {
    nextDue = addOneCalendarMonth(today);
  }

  const yyyy = nextDue.getFullYear();
  const mm = String(nextDue.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDue.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
