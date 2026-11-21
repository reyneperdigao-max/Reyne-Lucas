export interface RegistrationLink {
  id: string;
  linkId: string;
  uid: string;
  lenderName: string;
  active: boolean;
  createdAt: string;
}

export interface ClientRegistration {
  id: string;
  uid: string;
  linkId: string;
  fullName: string;
  cpf: string;
  email?: string;
  phone: string;
  address: string;
  profession: string;
  monthlyIncome: number;
  requestedAmount: number;
  receivingType: 'PIX' | 'CONTA_BANCARIA';
  pixKeyType?: string;
  pixKey?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  accountHolder: string;
  receivingDetails: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  approvedAmount?: number;
  loanId?: string;
}
