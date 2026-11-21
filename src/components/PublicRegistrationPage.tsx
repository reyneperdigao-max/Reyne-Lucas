import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  User,
  MapPin,
  Briefcase,
  DollarSign,
  Phone,
  CreditCard,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  FileText,
  ArrowRight,
  Lock,
  Calculator,
  Info,
  Mail
} from 'lucide-react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { NexusLogo } from './NexusLogo';
import { PROFESSIONS_LIST } from '../data/professions';
import {
  formatCPF,
  isValidCPF,
  formatBrPhone,
  formatCurrencyInputBRL,
  parseCurrencyBRL,
  formatBRL,
  StructuredAddress,
  EMPTY_STRUCTURED_ADDRESS,
  formatStructuredAddress
} from '../utils/brFormatters';
import { AddressFieldsInput } from './AddressFieldsInput';
import { RegistrationLink } from '../types/registration';

interface PublicRegistrationPageProps {
  linkId: string;
}

const POPULAR_BANKS = [
  'Nubank',
  'Itaú',
  'Banco do Brasil',
  'Caixa Econômica',
  'Bradesco',
  'Santander',
  'Inter',
  'C6 Bank',
  'PicPay',
  'Mercado Pago',
  'PagBank',
  'Sicredi',
  'Sicoob',
  'Outro Banco'
];

export const PublicRegistrationPage: React.FC<PublicRegistrationPageProps> = ({ linkId }) => {
  const [linkData, setLinkData] = useState<RegistrationLink | null>(null);
  const [linkStatus, setLinkStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  // Form states
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [structuredAddress, setStructuredAddress] = useState<StructuredAddress>({ ...EMPTY_STRUCTURED_ADDRESS });
  const [profession, setProfession] = useState('');
  const [customProfession, setCustomProfession] = useState('');
  const [professionSearch, setProfessionSearch] = useState('');
  const [isProfessionDropdownOpen, setIsProfessionDropdownOpen] = useState(false);

  const [monthlyIncomeStr, setMonthlyIncomeStr] = useState('');
  const [requestedAmountStr, setRequestedAmountStr] = useState('');

  const [receivingType, setReceivingType] = useState<'PIX' | 'CONTA_BANCARIA'>('PIX');
  const [pixKeyType, setPixKeyType] = useState<'CPF' | 'Celular' | 'E-mail' | 'Aleatória'>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAgency, setBankAgency] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountType, setAccountType] = useState<'Corrente' | 'Poupança'>('Corrente');
  const [accountHolder, setAccountHolder] = useState('');
  const [confirmSameHolder, setConfirmSameHolder] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [notes, setNotes] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<{
    name: string;
    amount: number;
    receiving: string;
  } | null>(null);

  const professionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLink = async () => {
      if (!linkId || !/^[a-zA-Z0-9_-]+$/.test(linkId)) {
        setLinkStatus('invalid');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'registration_links', linkId));
        if (!snap.exists()) {
          setLinkStatus('invalid');
          return;
        }
        const data = { id: snap.id, ...snap.data() } as RegistrationLink;
        if (!data.active) {
          setLinkStatus('invalid');
          return;
        }
        setLinkData(data);
        setLinkStatus('valid');
      } catch (err) {
        console.error('Erro ao validar link de cadastro:', err);
        setLinkStatus('invalid');
      }
    };
    fetchLink();
  }, [linkId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        professionDropdownRef.current &&
        !professionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfessionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProfessions = useMemo(() => {
    const term = professionSearch.trim().toLowerCase();
    if (!term) return PROFESSIONS_LIST;
    return PROFESSIONS_LIST.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }, [professionSearch]);

  const groupedProfessions = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filteredProfessions.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p.name);
    });
    return groups;
  }, [filteredProfessions]);

  const MONTHLY_INTEREST_RATE = 0.10;
  const simulatedAmount = useMemo(() => parseCurrencyBRL(requestedAmountStr), [requestedAmountStr]);
  const simulatedInterest = useMemo(
    () => Math.round(simulatedAmount * MONTHLY_INTEREST_RATE * 100) / 100,
    [simulatedAmount]
  );
  const simulatedTotal = useMemo(
    () => Math.round((simulatedAmount + simulatedInterest) * 100) / 100,
    [simulatedAmount, simulatedInterest]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!linkData) {
      setErrorMsg('Link de cadastro inválido ou expirado.');
      return;
    }

    const cleanName = fullName.trim();
    if (cleanName.length < 5 || !cleanName.includes(' ')) {
      setErrorMsg('Por favor, informe seu nome completo (nome e sobrenome).');
      return;
    }

    if (!isValidCPF(cpf)) {
      setErrorMsg('CPF inválido. Verifique os 11 dígitos informados.');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setErrorMsg('Informe um número de telefone/WhatsApp válido com DDD.');
      return;
    }

    if (!structuredAddress.street.trim()) {
      setErrorMsg('Informe a rua / logradouro do seu endereço.');
      return;
    }

    if (!structuredAddress.number.trim()) {
      setErrorMsg('Informe o número do endereço (ou S/N).');
      return;
    }

    if (!structuredAddress.neighborhood.trim()) {
      setErrorMsg('Informe o bairro do seu endereço.');
      return;
    }

    if (!structuredAddress.city.trim() || structuredAddress.state.trim().length < 2) {
      setErrorMsg('Informe a cidade e o estado (UF), ou pesquise pelo CEP.');
      return;
    }

    const formattedAddress = formatStructuredAddress(structuredAddress);
    if (formattedAddress.length < 5) {
      setErrorMsg('Informe seu endereço completo (Rua, número, bairro e cidade).');
      return;
    }

    const finalProfession =
      profession === 'Outra Profissão' ? customProfession.trim() : profession.trim();
    if (!finalProfession) {
      setErrorMsg('Selecione ou informe sua profissão.');
      return;
    }

    const monthlyIncome = parseCurrencyBRL(monthlyIncomeStr);
    if (monthlyIncome <= 0) {
      setErrorMsg('Informe sua renda mensal aproximada.');
      return;
    }

    const requestedAmount = parseCurrencyBRL(requestedAmountStr);
    if (requestedAmount <= 0) {
      setErrorMsg('Informe o valor do empréstimo desejado.');
      return;
    }

    const holder = (accountHolder.trim() || cleanName).slice(0, 120);
    let receivingDetails = '';

    if (receivingType === 'PIX') {
      if (!pixKey.trim()) {
        setErrorMsg('Informe sua Chave PIX para recebimento.');
        return;
      }
      receivingDetails = `PIX (${pixKeyType}): ${pixKey.trim()}${bankName.trim() ? ` | Banco: ${bankName.trim()}` : ''} | Titular: ${holder}`;
    } else {
      if (!bankName.trim() || !bankAgency.trim() || !bankAccount.trim()) {
        setErrorMsg('Preencha banco, agência e conta para recebimento.');
        return;
      }
      receivingDetails = `Conta ${accountType} - ${bankName.trim()} | Ag: ${bankAgency.trim()} | Conta: ${bankAccount.trim()} | Titular: ${holder}`;
    }

    if (!confirmSameHolder) {
      setErrorMsg('Confirme que a conta ou Chave PIX informada é de titularidade do próprio solicitante do empréstimo.');
      return;
    }

    if (!confirmTerms) {
      setErrorMsg('Marque a caixa no final do formulário confirmando que concorda com os juros de 10% ao mês e demais condições.');
      return;
    }

    setIsSubmitting(true);
    try {
      const regId = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload: Record<string, unknown> = {
        uid: linkData.uid,
        linkId: linkData.linkId,
        fullName: cleanName.slice(0, 120),
        cpf: formatCPF(cpf),
        phone: formatBrPhone(phone),
        address: formattedAddress,
        profession: finalProfession.slice(0, 100),
        monthlyIncome,
        requestedAmount,
        receivingType,
        accountHolder: holder,
        receivingDetails: receivingDetails.slice(0, 500),
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      if (email.trim()) {
        payload.email = email.trim().toLowerCase().slice(0, 256);
      }

      if (receivingType === 'PIX') {
        payload.pixKeyType = pixKeyType;
        payload.pixKey = pixKey.trim().slice(0, 200);
        if (bankName.trim()) payload.bankName = bankName.trim().slice(0, 100);
      } else {
        payload.bankName = bankName.trim().slice(0, 100);
        payload.bankAgency = bankAgency.trim().slice(0, 30);
        payload.bankAccount = `${bankAccount.trim()} (${accountType})`.slice(0, 40);
      }

      if (notes.trim()) {
        payload.notes = notes.trim().slice(0, 500);
      }

      await setDoc(doc(db, 'client_registrations', regId), payload);

      setSubmittedSummary({
        name: cleanName,
        amount: requestedAmount,
        receiving: receivingDetails
      });
      setSubmittedProtocol(regId.toUpperCase().slice(0, 16));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Erro ao enviar cadastro:', err);
      setErrorMsg('Não foi possível enviar sua solicitação no momento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (linkStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#07080B] text-white flex flex-col items-center justify-center p-6 gap-5">
        <NexusLogo className="w-16 h-16" />
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Carregando Formulário Seguro
        </p>
      </div>
    );
  }

  if (linkStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-[#07080B] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111319] border border-white/10 rounded-[32px] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <NexusLogo className="w-16 h-16" />
          </div>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              Link Indisponível
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Este link de cadastro online está pausado, expirado ou não foi encontrado. Entre em contato com seu consultor para receber um novo link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submittedProtocol && submittedSummary) {
    return (
      <div className="min-h-screen bg-[#07080B] text-white flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-lg w-full bg-[#101218] border border-white/25 rounded-[36px] p-8 sm:p-10 text-center space-y-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.12)_0%,_transparent_65%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-5">
            <NexusLogo className="w-14 h-14" />
            <div className="space-y-0.5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white">
                Nexus <span className="text-[#E5E5E5]">Private</span>
              </p>
              {linkData?.lenderName && linkData.lenderName.trim().toLowerCase() !== 'nexus private' && (
                <p className="text-[11px] font-bold text-slate-300">
                  Credor: <span className="text-white">{linkData.lenderName}</span>
                </p>
              )}
            </div>
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5F5F7]">
                Protocolo {submittedProtocol}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Solicitação Enviada!
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Recebemos seu cadastro com sucesso, <span className="text-white font-bold">{submittedSummary.name}</span>. Seus dados já estão em análise de crédito.
              </p>
            </div>

            <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Valor Solicitado
                </span>
                <span className="text-lg font-black text-white font-mono">
                  {formatBRL(submittedSummary.amount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Dados para Recebimento
                </span>
                <p className="text-xs font-semibold text-slate-200 break-words">
                  {submittedSummary.receiving}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Em breve retornaremos com a aprovação</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-white py-6 px-3 sm:py-12 sm:px-6 relative overflow-x-hidden">
      {/* Background luxury ambient glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,_rgba(255,255,255,0.08)_0%,_transparent_50%),radial-gradient(circle_at_80%_100%,_rgba(16,185,129,0.06)_0%,_transparent_50%)]" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        {/* Header Card */}
        <div className="bg-[#101218]/95 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <NexusLogo className="w-16 h-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 border border-white/25 text-[#F5F5F7] text-[9px] font-black uppercase tracking-[0.25em]">
                <Lock className="w-3 h-3" />
                Cadastro Seguro de Crédito
              </div>
              <div className="space-y-0.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                  Nexus <span className="text-[#E5E5E5]">Private</span>
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5F5F7]">
                    Credor:
                  </span>
                  <span>
                    {linkData?.lenderName && linkData.lenderName.trim().toLowerCase() !== 'nexus private'
                      ? linkData.lenderName
                      : 'Credor Autorizado'}
                  </span>
                </p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-0.5">
                Preencha seus dados abaixo para análise e liberação de crédito. Todas as informações são confidenciais.
              </p>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#101218]/95 backdrop-blur-xl border border-white/10 rounded-[32px] p-5 sm:p-8 shadow-2xl space-y-8"
        >
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Dados Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#F5F5F7] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  1. Dados Pessoais
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Identificação e contato do solicitante
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-white px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  CPF *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={cn(
                      "w-full rounded-2xl bg-white/[0.04] border pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono",
                      cpf.replace(/\D/g, '').length === 11
                        ? isValidCPF(cpf)
                          ? "border-emerald-500/50"
                          : "border-red-500/60"
                        : "border-white/10 focus:border-white"
                    )}
                  />
                </div>
                {cpf.replace(/\D/g, '').length === 11 && !isValidCPF(cpf) && (
                  <p className="text-[10px] text-red-400 font-bold ml-1">CPF inválido</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Telefone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatBrPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-white pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  E-mail (Para acesso ao Portal do Cliente e Cobranças) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-white pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 pt-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#F5F5F7]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Endereço Residencial *</span>
                  </div>
                  <AddressFieldsInput
                    value={structuredAddress}
                    onChange={setStructuredAddress}
                    required
                    isDark
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Profissão e Renda */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#F5F5F7] flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  2. Profissão e Renda
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Atividade profissional e ganho mensal
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Searchable Profession Picker */}
              <div className="space-y-1.5 relative" ref={professionDropdownRef}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Profissão *
                </label>
                <button
                  type="button"
                  onClick={() => setIsProfessionDropdownOpen((o) => !o)}
                  className={cn(
                    "w-full rounded-2xl bg-white/[0.04] border px-4 py-3.5 text-sm text-left flex items-center justify-between gap-2 transition-all",
                    isProfessionDropdownOpen ? "border-white" : "border-white/10 hover:border-white/20"
                  )}
                >
                  <span className={profession ? "text-white font-semibold truncate" : "text-slate-500"}>
                    {profession || 'Selecione sua profissão...'}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 shrink-0 transition-transform",
                      isProfessionDropdownOpen && "rotate-180 text-white"
                    )}
                  />
                </button>

                {isProfessionDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#151821] border border-white/25 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="p-2.5 border-b border-white/10 bg-black/40">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={professionSearch}
                          onChange={(e) => setProfessionSearch(e.target.value)}
                          placeholder="Buscar profissão (ex: Motorista, Vendedor)..."
                          autoFocus
                          className="w-full rounded-xl bg-white/5 border border-white/10 focus:border-white pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-2">
                      {Object.keys(groupedProfessions).length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-xs text-slate-400">Profissão não encontrada na lista.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setProfession('Outra Profissão');
                              setCustomProfession(professionSearch);
                              setIsProfessionDropdownOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] text-black text-[10px] font-black uppercase tracking-wider"
                          >
                            Usar "{professionSearch}"
                          </button>
                        </div>
                      ) : (
                        (Object.entries(groupedProfessions) as [string, string[]][]).map(([category, items]) => (
                          <div key={category}>
                            <div className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/75">
                              {category}
                            </div>
                            {items.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setProfession(item);
                                  setIsProfessionDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between",
                                  profession === item
                                    ? "bg-[#F5F5F7] text-black font-bold"
                                    : "text-slate-200 hover:bg-white/10"
                                )}
                              >
                                <span>{item}</span>
                                {profession === item && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {profession === 'Outra Profissão' && (
                  <input
                    type="text"
                    required
                    value={customProfession}
                    onChange={(e) => setCustomProfession(e.target.value)}
                    placeholder="Digite sua profissão..."
                    className="mt-2 w-full rounded-2xl bg-white/[0.04] border border-white/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Renda Mensal (R$) *
                </label>
                <div className="relative">
                  <span className="text-xs font-black text-[#F5F5F7] absolute left-4 top-1/2 -translate-y-1/2">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={monthlyIncomeStr}
                    onChange={(e) => setMonthlyIncomeStr(formatCurrencyInputBRL(e.target.value))}
                    placeholder="0,00"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-white pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Valor do Empréstimo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  3. Valor do Empréstimo
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Quanto você precisa solicitar?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="text-base font-black text-emerald-400 absolute left-4 top-1/2 -translate-y-1/2">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={requestedAmountStr}
                  onChange={(e) => setRequestedAmountStr(formatCurrencyInputBRL(e.target.value))}
                  placeholder="0,00"
                  className="w-full rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/30 focus:border-emerald-400 pl-12 pr-4 py-4 text-xl text-white placeholder:text-slate-600 outline-none transition-all font-mono font-black"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[500, 1000, 1500, 2000, 3000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      setRequestedAmountStr(
                        val.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-white/40 text-[11px] font-bold text-slate-300 hover:text-white transition-all font-mono"
                  >
                    R$ {val.toLocaleString('pt-BR')}
                  </button>
                ))}
              </div>

              {/* Simulação de Juros (10% ao mês) */}
              {simulatedAmount > 0 ? (
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] via-emerald-500/[0.04] to-transparent border border-white/25 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#F5F5F7]" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">
                        Simulação do Empréstimo
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/25 text-[10px] font-black uppercase tracking-widest text-[#F5F5F7]">
                      Juros: 10% ao mês
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                        Valor Solicitado
                      </span>
                      <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
                        {formatBRL(simulatedAmount)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-black/40 border border-white/25 p-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#E5E5E5] block">
                        Juros (10% ao mês)
                      </span>
                      <span className="text-sm sm:text-base font-black text-white font-mono mt-0.5 block">
                        {formatBRL(simulatedInterest)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-black/40 border border-emerald-500/25 p-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                        Total em 30 dias
                      </span>
                      <span className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5 block">
                        {formatBRL(simulatedTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-1.5 text-xs text-slate-300 leading-relaxed">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                      Como funciona o pagamento após 30 dias:
                    </p>
                    <p>
                      • <strong className="text-white">Quitação total:</strong> Pague{' '}
                      <strong className="text-emerald-400 font-mono">{formatBRL(simulatedTotal)}</strong> (valor emprestado + 10% de juros) e encerre o empréstimo.
                    </p>
                    <p>
                      • <strong className="text-white">Renovação mensal:</strong> Caso precise de mais prazo, você pode pagar apenas os juros de{' '}
                      <strong className="text-white font-mono">{formatBRL(simulatedInterest)}</strong> para renovar por mais 30 dias.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 px-4 py-3 flex items-center gap-2.5 text-xs text-slate-400">
                  <Calculator className="w-4 h-4 text-[#F5F5F7] shrink-0" />
                  <span>
                    Taxa da Nexus Private: <strong className="text-white">10% ao mês</strong>. Digite ou selecione um valor acima para visualizar sua simulação.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Dados para Recebimento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-[#F5F5F7] flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  4. Dados para Recebimento
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  Conta ou Chave PIX obrigatoriamente em nome e CPF de quem solicita o empréstimo
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.06] border border-white/25 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#F5F5F7] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-white">
                  Titularidade Obrigatória do Solicitante
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A conta bancária ou Chave PIX informada <strong className="text-white">deve estar obrigatoriamente na titularidade de quem quer o empréstimo</strong> (mesmo nome e CPF deste cadastro). Não realizamos transferências para contas de terceiros.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-1 bg-white/[0.03] rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setReceivingType('PIX')}
                className={cn(
                  "py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  receivingType === 'PIX'
                    ? "bg-[#F5F5F7] text-black shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Chave PIX
              </button>
              <button
                type="button"
                onClick={() => setReceivingType('CONTA_BANCARIA')}
                className={cn(
                  "py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  receivingType === 'CONTA_BANCARIA'
                    ? "bg-[#F5F5F7] text-black shadow-lg"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <CreditCard className="w-4 h-4" />
                Conta Bancária
              </button>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
              <Info className="w-4 h-4 text-[#F5F5F7] shrink-0 mt-0.5" />
              {receivingType === 'PIX' ? (
                <span>
                  <strong className="text-white">Recebimento via PIX:</strong> Após a aprovação, o valor será transferido na hora via PIX para a chave informada abaixo (CPF, celular, e-mail ou chave aleatória vinculada ao seu CPF).
                </span>
              ) : (
                <span>
                  <strong className="text-white">Recebimento via Conta Bancária (TED/Transferência):</strong> Após a aprovação, o depósito será enviado para a conta corrente ou poupança informada abaixo, em seu nome e CPF.
                </span>
              )}
            </div>

            {receivingType === 'PIX' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Tipo de Chave PIX *
                  </label>
                  <select
                    value={pixKeyType}
                    onChange={(e) =>
                      setPixKeyType(
                        e.target.value as 'CPF' | 'Celular' | 'E-mail' | 'Aleatória'
                      )
                    }
                    className="w-full rounded-2xl bg-[#161922] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white outline-none transition-all"
                  >
                    <option value="CPF">CPF</option>
                    <option value="Celular">Celular / WhatsApp</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Aleatória">Chave Aleatória</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Chave PIX *
                    </label>
                    {(cpf || phone) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (pixKeyType === 'CPF' && cpf) setPixKey(cpf);
                          else if (pixKeyType === 'Celular' && phone) setPixKey(phone);
                          else if (cpf) {
                            setPixKeyType('CPF');
                            setPixKey(cpf);
                          }
                        }}
                        className="text-[9px] font-black uppercase tracking-wider text-[#F5F5F7] hover:underline"
                      >
                        Preencher automático
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Informe sua chave PIX"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Banco / Instituição
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-2xl bg-[#161922] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white outline-none transition-all"
                  >
                    <option value="">Selecione o banco (opcional)</option>
                    {POPULAR_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1 gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Titular da Conta (Solicitante)
                    </label>
                    {fullName.trim() && accountHolder !== fullName && (
                      <button
                        type="button"
                        onClick={() => setAccountHolder(fullName)}
                        className="text-[9px] font-black uppercase tracking-wider text-[#F5F5F7] hover:underline shrink-0"
                      >
                        Usar meu nome
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder={fullName ? `${fullName} (mesma titularidade)` : 'Mesmo nome do solicitante'}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Banco *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Bradesco"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Tipo de Conta *
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'Corrente' | 'Poupança')}
                    className="w-full rounded-2xl bg-[#161922] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white outline-none transition-all"
                  >
                    <option value="Corrente">Conta Corrente</option>
                    <option value="Poupança">Conta Poupança</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Agência *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankAgency}
                    onChange={(e) => setBankAgency(e.target.value)}
                    placeholder="0001"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Conta com Dígito *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="123456-7"
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between ml-1 gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Nome do Titular da Conta (Deve ser o solicitante)
                    </label>
                    {fullName.trim() && accountHolder !== fullName && (
                      <button
                        type="button"
                        onClick={() => setAccountHolder(fullName)}
                        className="text-[9px] font-black uppercase tracking-wider text-[#F5F5F7] hover:underline shrink-0"
                      >
                        Usar meu nome
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder={fullName ? `${fullName} (mesma titularidade)` : 'Mesmo nome completo do solicitante'}
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <label className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={confirmSameHolder}
                onChange={(e) => setConfirmSameHolder(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[#F5F5F7] shrink-0 cursor-pointer"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                Declaro que a conta bancária ou Chave PIX informada acima é de <strong className="text-white">minha própria titularidade</strong> (mesmo nome e CPF de quem está solicitando o empréstimo).
              </span>
            </label>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Observações (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma observação adicional sobre sua solicitação (opcional)..."
                className="w-full rounded-2xl bg-white/[0.04] border border-white/10 focus:border-[#F5F5F7] px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Final Terms & Simulation Agreement */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.05] border border-white/30 hover:border-white/55 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={confirmTerms}
              onChange={(e) => setConfirmTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#F5F5F7] shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-200 leading-relaxed">
              Li e <strong className="text-white">concordo com os termos da simulação da Nexus Private</strong> (juros de <strong className="text-white">10% ao mês</strong>
              {simulatedAmount > 0 ? `, equivalente a ${formatBRL(simulatedInterest)} de juros mensais e ${formatBRL(simulatedTotal)} para quitação em 30 dias` : ''}, formas de recebimento e regras de pagamento), confirmando que todas as informações enviadas são verdadeiras.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-white via-[#E5E5E5] to-[#D4D4D8] text-black font-black text-xs sm:text-sm uppercase tracking-[0.2em] shadow-[0_10px_35px_rgba(255,255,255,0.22)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Enviando Cadastro...</span>
              </>
            ) : (
              <>
                <span>Enviar Cadastro para Análise</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-600 pb-6">
          Nexus Private • Ambiente Criptografado
        </p>
      </div>
    </div>
  );
};
