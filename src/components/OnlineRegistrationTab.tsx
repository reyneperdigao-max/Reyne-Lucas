import React, { useState, useMemo } from 'react';
import {
  Link2,
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  UserPlus,
  Briefcase,
  MapPin,
  Phone,
  FileText,
  Landmark,
  DollarSign,
  Clock,
  Power,
  Search,
  Users,
  X,
  Calendar,
  Sparkles,
  Mail
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { cn } from '../lib/utils';
import { ClientRegistration, RegistrationLink } from '../types/registration';
import { formatBRL, formatBrPhone, formatCurrencyInputBRL, parseCurrencyBRL } from '../utils/brFormatters';

interface OnlineRegistrationTabProps {
  isDark: boolean;
  lenderName?: string;
  activeLink: RegistrationLink | null;
  isGeneratingLink: boolean;
  onGenerateNewLink: () => Promise<void>;
  onToggleLinkActive: (link: RegistrationLink) => Promise<void>;
  registrations: ClientRegistration[];
  defaultInterestRate: number;
  onApproveRegistration: (
    reg: ClientRegistration,
    approval: {
      capital: number;
      interestRatePercent: number;
      date: string;
      dueDate: string;
      status: 'Pendente' | 'Agendado';
    }
  ) => Promise<void>;
  onRejectRegistration: (reg: ClientRegistration) => Promise<void>;
  onDeleteRegistration: (reg: ClientRegistration) => Promise<void>;
  onGoToClient: (clientName: string) => void;
}

export const OnlineRegistrationTab: React.FC<OnlineRegistrationTabProps> = ({
  isDark,
  lenderName,
  activeLink,
  isGeneratingLink,
  onGenerateNewLink,
  onToggleLinkActive,
  registrations,
  defaultInterestRate,
  onApproveRegistration,
  onRejectRegistration,
  onDeleteRegistration,
  onGoToClient
}) => {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [whatsappTargetPhone, setWhatsappTargetPhone] = useState('');

  // Approval Modal State
  const [approvingReg, setApprovingReg] = useState<ClientRegistration | null>(null);
  const [approvalCapitalStr, setApprovalCapitalStr] = useState('');
  const [approvalInterestStr, setApprovalInterestStr] = useState('');
  const [approvalDate, setApprovalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [approvalDueDate, setApprovalDueDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [approvalStatus, setApprovalStatus] = useState<'Pendente' | 'Agendado'>('Pendente');
  const [isApproving, setIsApproving] = useState(false);

  const registrationUrl = useMemo(() => {
    if (!activeLink) return '';
    return `${window.location.origin}/?cadastro=${encodeURIComponent(activeLink.linkId)}`;
  }, [activeLink]);

  const counts = useMemo(() => {
    return {
      pending: registrations.filter((r) => r.status === 'pending').length,
      approved: registrations.filter((r) => r.status === 'approved').length,
      rejected: registrations.filter((r) => r.status === 'rejected').length,
      all: registrations.length
    };
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    let list = registrations;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.cpf.toLowerCase().includes(q) ||
          r.profession.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q)
      );
    }
    return list;
  }, [registrations, statusFilter, searchTerm]);

  const copyText = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedFieldId(id);
      setTimeout(() => setCopiedFieldId(null), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const resolvedLenderName = useMemo(() => {
    const candidate = (lenderName || activeLink?.lenderName || '').trim();
    if (!candidate || candidate.toLowerCase() === 'nexus private') {
      return 'Credor Autorizado';
    }
    return candidate;
  }, [lenderName, activeLink?.lenderName]);

  const getWhatsAppInviteUrl = () => {
    const message = `*NEXUS PRIVATE*\nCredor: *${resolvedLenderName}*\n\nOlá! Segue o link seguro para você preencher seu cadastro online e solicitação de crédito:\n\n${registrationUrl}\n\nApós enviar seus dados, faremos a análise rapidamente.`;
    const digits = whatsappTargetPhone.replace(/\D/g, '');
    if (digits.length >= 10) {
      const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
      return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getClientWhatsAppUrl = (reg: ClientRegistration, isApprovalNotice = false) => {
    const digits = reg.phone.replace(/\D/g, '');
    const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
    const firstName = reg.fullName.trim().split(' ')[0];
    const msg = isApprovalNotice
      ? `Olá ${firstName}! Seu cadastro de crédito foi aprovado no valor de ${formatBRL(reg.approvedAmount || reg.requestedAmount)}. Em breve o valor será transferido para os dados informados!`
      : `Olá ${firstName}! Recebemos sua solicitação de crédito no valor de ${formatBRL(reg.requestedAmount)}.`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(msg)}`;
  };

  const openApprovalModal = (reg: ClientRegistration) => {
    setApprovingReg(reg);
    setApprovalCapitalStr(
      (reg.requestedAmount || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    setApprovalInterestStr(String(defaultInterestRate > 0 ? defaultInterestRate : 10));
    setApprovalDate(format(new Date(), 'yyyy-MM-dd'));
    setApprovalDueDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    setApprovalStatus('Pendente');
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReg) return;
    const capitalNum = parseCurrencyBRL(approvalCapitalStr);
    const interestNum = parseFloat(approvalInterestStr.replace(',', '.')) || 0;
    if (capitalNum <= 0) return;

    setIsApproving(true);
    try {
      await onApproveRegistration(approvingReg, {
        capital: capitalNum,
        interestRatePercent: interestNum,
        date: approvalDate,
        dueDate: approvalDueDate,
        status: approvalStatus
      });
      setApprovingReg(null);
    } finally {
      setIsApproving(false);
    }
  };

  const previewCapital = parseCurrencyBRL(approvalCapitalStr);
  const previewRate = (parseFloat(approvalInterestStr.replace(',', '.')) || 0) / 100;
  const previewInterest = Math.round(previewCapital * previewRate * 100) / 100;
  const previewTotal = Math.round((previewCapital + previewInterest) * 100) / 100;

  return (
    <div className="space-y-8">
      {/* Link Generator & Sharing Card */}
      <div
        className={cn(
          "rounded-[32px] border p-6 sm:p-8 relative overflow-hidden transition-all",
          isDark
            ? "bg-gradient-to-br from-[#121319] via-[#0d0e13] to-black border-[#D4AF37]/25 shadow-2xl"
            : "bg-white border-slate-200 shadow-xl"
        )}
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "text-base sm:text-lg font-black uppercase tracking-tight",
                      isDark ? "text-white" : "text-slate-900"
                    )}
                  >
                    Link de Cadastro Online
                  </h3>
                  {activeLink && (
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                        activeLink.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {activeLink.active ? 'Ativo' : 'Pausado'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Envie este link para o cliente preencher os dados, profissão, renda, chave PIX e valor desejado.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeLink && (
                <button
                  type="button"
                  onClick={() => onToggleLinkActive(activeLink)}
                  className={cn(
                    "px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 active:scale-95",
                    activeLink.active
                      ? isDark
                        ? "bg-white/5 border-white/10 text-slate-300 hover:bg-amber-500/10 hover:text-amber-400"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-amber-50"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  )}
                >
                  <Power className="w-3.5 h-3.5" />
                  {activeLink.active ? 'Pausar Link' : 'Reativar Link'}
                </button>
              )}

              <button
                type="button"
                disabled={isGeneratingLink}
                onClick={onGenerateNewLink}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 active:scale-95",
                  isDark
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                )}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isGeneratingLink && "animate-spin")} />
                {activeLink ? 'Gerar Novo Link' : 'Gerar Link'}
              </button>
            </div>
          </div>

          {activeLink ? (
            <div className="space-y-4">
              {/* Presentation Preview Banner */}
              <div
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-2xl border",
                  isDark ? "bg-[#D4AF37]/[0.06] border-[#D4AF37]/25" : "bg-amber-50/80 border-amber-200"
                )}
              >
                <div>
                  <p className={cn("text-xs font-black uppercase tracking-[0.2em]", isDark ? "text-white" : "text-slate-900")}>
                    Nexus <span className="text-[#D4AF37]">Private</span>
                  </p>
                  <p className={cn("text-xs font-bold mt-0.5", isDark ? "text-slate-300" : "text-slate-700")}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] mr-1.5">
                      Credor:
                    </span>
                    {resolvedLenderName}
                  </p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Apresentação exibida no link
                </span>
              </div>

              {/* URL Display + Copy + Preview */}
              <div
                className={cn(
                  "flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 rounded-2xl border",
                  isDark ? "bg-black/50 border-white/10" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex-1 min-w-0 px-2 py-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">
                    Endereço exclusivo do seu formulário
                  </span>
                  <p
                    className={cn(
                      "text-xs font-mono truncate select-all",
                      isDark ? "text-[#FFF5C0]" : "text-slate-800"
                    )}
                  >
                    {registrationUrl}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyText(registrationUrl)}
                    className={cn(
                      "flex-1 md:flex-none px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95",
                      copiedLink
                        ? "bg-emerald-500 text-white"
                        : "bg-brand-primary text-black hover:brightness-110"
                    )}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
                  </button>

                  <a
                    href={registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 active:scale-95",
                      isDark
                        ? "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                </div>
              </div>

              {/* Direct WhatsApp Send Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={whatsappTargetPhone}
                    onChange={(e) => setWhatsappTargetPhone(formatBrPhone(e.target.value))}
                    placeholder="WhatsApp do cliente (opcional) — ex: (11) 99999-9999"
                    className={cn(
                      "w-full rounded-2xl border pl-11 pr-4 py-3 text-xs outline-none transition-all",
                      isDark
                        ? "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600 focus:border-emerald-500/50"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500"
                    )}
                  />
                </div>
                <a
                  href={getWhatsAppInviteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar Link no WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-[#D4AF37]/30 text-center space-y-3">
              <p className="text-xs text-slate-400">
                Clique em <strong>Gerar Link</strong> para criar seu link exclusivo de cadastro online.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'pending', label: 'Aguardando Análise', count: counts.pending },
              { id: 'approved', label: 'Aprovados', count: counts.approved },
              { id: 'rejected', label: 'Recusados', count: counts.rejected },
              { id: 'all', label: 'Todos', count: counts.all }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                statusFilter === tab.id
                  ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/20"
                  : isDark
                  ? "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[9px] font-mono",
                  statusFilter === tab.id
                    ? "bg-black/20 text-black"
                    : isDark
                    ? "bg-white/10 text-slate-300"
                    : "bg-slate-100 text-slate-700"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nome, CPF ou profissão..."
            className={cn(
              "w-full rounded-2xl border pl-11 pr-4 py-2.5 text-xs outline-none transition-all",
              isDark
                ? "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus:border-brand-primary"
                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand-primary"
            )}
          />
        </div>
      </div>

      {/* Registrations List */}
      {filteredRegistrations.length === 0 ? (
        <div
          className={cn(
            "rounded-[32px] border p-12 text-center space-y-4",
            isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"
          )}
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
            <UserPlus className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4
              className={cn(
                "text-sm font-black uppercase tracking-widest",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Nenhuma solicitação {statusFilter === 'pending' ? 'pendente' : 'encontrada'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Compartilhe seu link acima com seus clientes. Assim que preencherem e enviarem o cadastro, eles aparecerão aqui para aprovação imediata.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRegistrations.map((reg) => {
            const submittedDateStr = (() => {
              try {
                return format(new Date(reg.submittedAt), "dd/MM/yyyy 'às' HH:mm");
              } catch {
                return reg.submittedAt;
              }
            })();

            return (
              <div
                key={reg.id}
                className={cn(
                  "rounded-[32px] border p-6 sm:p-7 space-y-5 transition-all relative overflow-hidden",
                  isDark
                    ? "bg-white/[0.02] border-white/10 hover:border-[#D4AF37]/30"
                    : "bg-white border-slate-200 shadow-lg"
                )}
              >
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-black text-base uppercase shrink-0">
                      {reg.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={cn(
                          "text-base font-black uppercase tracking-tight truncate",
                          isDark ? "text-white" : "text-slate-900"
                        )}
                      >
                        {reg.fullName}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Enviado em {submittedDateStr}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shrink-0",
                      reg.status === 'pending'
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                        : reg.status === 'approved'
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                    )}
                  >
                    {reg.status === 'pending'
                      ? 'Aguardando Análise'
                      : reg.status === 'approved'
                      ? 'Crédito Aprovado'
                      : 'Recusado'}
                  </span>
                </div>

                {/* Highlight Financial Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border",
                      isDark ? "bg-[#D4AF37]/5 border-[#D4AF37]/20" : "bg-amber-50/70 border-amber-200"
                    )}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] block mb-1">
                      Valor Solicitado
                    </span>
                    <p className="text-base font-black text-[#D4AF37] font-mono">
                      {formatBRL(reg.requestedAmount)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border",
                      isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Renda Mensal
                    </span>
                    <p
                      className={cn(
                        "text-sm font-black font-mono",
                        isDark ? "text-white" : "text-slate-900"
                      )}
                    >
                      {formatBRL(reg.monthlyIncome)}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "col-span-2 sm:col-span-1 p-3.5 rounded-2xl border",
                      isDark ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      CPF
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs font-black font-mono truncate",
                          isDark ? "text-slate-200" : "text-slate-800"
                        )}
                      >
                        {reg.cpf}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyText(reg.cpf, `cpf-${reg.id}`)}
                        className="text-slate-400 hover:text-brand-primary transition-colors"
                        title="Copiar CPF"
                      >
                        {copiedFieldId === `cpf-${reg.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Briefcase className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Profissão
                      </span>
                      <span className={cn("font-bold", isDark ? "text-slate-200" : "text-slate-800")}>
                        {reg.profession}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          Contato / WhatsApp
                        </span>
                        <span className={cn("font-bold font-mono", isDark ? "text-slate-200" : "text-slate-800")}>
                          {reg.phone}
                        </span>
                      </div>
                      <a
                        href={getClientWhatsAppUrl(reg, reg.status === 'approved')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </div>
                  </div>

                  {reg.email && (
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          E-mail (Portal e Cobranças)
                        </span>
                        <span className={cn("font-bold", isDark ? "text-slate-200" : "text-slate-800")}>
                          {reg.email}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Endereço
                      </span>
                      <span className={cn("font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
                        {reg.address}
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl border flex items-start justify-between gap-3",
                      isDark ? "bg-black/30 border-white/10" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Landmark className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] block">
                          Dados para Recebimento ({reg.receivingType === 'PIX' ? 'PIX' : 'Conta Bancária'})
                        </span>
                        <p className={cn("text-xs font-bold break-words mt-0.5", isDark ? "text-white" : "text-slate-900")}>
                          {reg.receivingDetails}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(reg.pixKey || reg.receivingDetails, `pix-${reg.id}`)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all flex items-center gap-1",
                        copiedFieldId === `pix-${reg.id}`
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : isDark
                          ? "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                          : "bg-white border-slate-200 text-slate-700"
                      )}
                    >
                      {copiedFieldId === `pix-${reg.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedFieldId === `pix-${reg.id}` ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>

                  {reg.notes && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          Observações do Cliente
                        </span>
                        <span className="text-xs italic text-slate-400">{reg.notes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2.5">
                  {reg.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => openApprovalModal(reg)}
                        className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovar Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectRegistration(reg)}
                        className={cn(
                          "py-3 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95",
                          isDark
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                            : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white"
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                        Recusar
                      </button>
                    </>
                  )}

                  {reg.status === 'approved' && (
                    <>
                      <div className="flex-1 text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Aprovado: {formatBRL(reg.approvedAmount || reg.requestedAmount)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onGoToClient(reg.fullName)}
                        className="py-2.5 px-4 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary hover:text-black text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Ver em Clientes
                      </button>
                    </>
                  )}

                  {reg.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() => openApprovalModal(reg)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Reanalisar e Aprovar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteRegistration(reg)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all active:scale-95",
                      isDark
                        ? "bg-white/5 border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:text-rose-500"
                    )}
                    title="Excluir Solicitação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Approval Modal */}
      {approvingReg && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setApprovingReg(null)}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          <div className="relative w-full h-full sm:h-auto sm:max-w-lg glass-card p-6 sm:p-8 overflow-y-auto sm:rounded-[32px] rounded-none shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Aprovar Crédito
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {approvingReg.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingReg(null)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client Receiving Details for Transfer */}
            <div className="p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">
                  Dados para Transferência ao Cliente
                </span>
                <button
                  type="button"
                  onClick={() => copyText(approvingReg.pixKey || approvingReg.receivingDetails, 'modal-pix')}
                  className="text-[9px] font-black uppercase tracking-wider text-white bg-black/40 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  {copiedFieldId === 'modal-pix' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedFieldId === 'modal-pix' ? 'Copiado' : 'Copiar Chave'}
                </button>
              </div>
              <p className="text-xs font-bold text-white break-words">
                {approvingReg.receivingDetails}
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-[10px] text-slate-300">
                <span>CPF: <strong>{approvingReg.cpf}</strong></span>
                <span>Renda: <strong>{formatBRL(approvingReg.monthlyIncome)}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Valor Aprovado (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={approvalCapitalStr}
                      onChange={(e) => setApprovalCapitalStr(formatCurrencyInputBRL(e.target.value))}
                      className="w-full glass-input pl-10 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Taxa de Juros (% a.m.)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={approvalInterestStr}
                    onChange={(e) => setApprovalInterestStr(e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'))}
                    className="w-full glass-input font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Data de Liberação
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={approvalDate}
                      onChange={(e) => setApprovalDate(e.target.value)}
                      className="w-full glass-input pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Vencimento
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={approvalDueDate}
                      onChange={(e) => setApprovalDueDate(e.target.value)}
                      className="w-full glass-input pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Situação Inicial do Empréstimo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApprovalStatus('Pendente')}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      approvalStatus === 'Pendente'
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    Liberado Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalStatus('Agendado')}
                    className={cn(
                      "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      approvalStatus === 'Agendado'
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                        : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    Agendado
                  </button>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                    Juros do Ciclo
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {formatBRL(previewInterest)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                    Total a Receber
                  </span>
                  <span className="text-base font-black text-[#D4AF37] font-mono">
                    {formatBRL(previewTotal)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isApproving || previewCapital <= 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Cadastrando Cliente...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Aprovação e Cadastrar Cliente</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
