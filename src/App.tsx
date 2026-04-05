/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  LogOut,
  AlertCircle,
  Clock,
  ChevronRight,
  Wallet,
  Trash2,
  History,
  Edit2,
  Mail,
  Lock,
  ArrowLeft,
  UserPlus,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { format, addMonths, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db, auth } from './firebase';
import { cn } from './lib/utils';

// --- Types ---
interface Loan {
  id: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  dueDate: string;
  capital: number;
  interestRate: number;
  totalBruto: number;
  capitalPago: number;
  jurosPagos: number;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  uid: string;
  createdAt: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

// --- Constants ---
const PIX_KEY = "SUA_CHAVE_PIX_AQUI"; // Placeholder

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [viewingClientLoans, setViewingClientLoans] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Empréstimos' | 'Clientes' | 'Histórico'>('Empréstimos');
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [amortizationAmount, setAmortizationAmount] = useState('');
  const [newLoan, setNewLoan] = useState({
    clientName: '',
    clientPhone: '',
    capital: '',
    interestRate: '', // No default
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  });

  // Search/Command State
  const [command, setCommand] = useState('');

  // --- Helpers ---
  const parseLocaleNumber = (str: string) => {
    if (!str) return 0;
    // Replace comma with dot for parsing
    const normalized = str.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const safeFormatDate = (dateStr: string | undefined, formatStr: string, fallback: string = '---') => {
    if (!dateStr) return fallback;
    try {
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatStr, { locale: ptBR });
    } catch (e) {
      return fallback;
    }
  };

  const isOverdue = (loan: Loan) => {
    if (!loan.dueDate || loan.status !== 'Pendente') return false;
    try {
      const dueDate = startOfDay(parseISO(loan.dueDate));
      const today = startOfDay(new Date());
      return dueDate < today;
    } catch (e) {
      return false;
    }
  };

  // --- Firebase Auth ---
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection to Firestore as required by guidelines
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        setIsConnecting(false);
      } catch (err: any) {
        console.warn("Firestore connection test (ignore if expected):", err.message);
        if (err.message.includes('the client is offline') || err.message.includes('failed-precondition')) {
          setConnectionError("Erro de conexão com o banco de dados. Verifique sua internet.");
        }
        // We don't block the app if it's just a permission error on the test doc
        setIsConnecting(false);
      }
    };

    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error("Email Login Error:", err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-email':
          setError("E-mail ou senha incorretos.");
          break;
        case 'auth/user-disabled':
          setError("Esta conta foi desativada.");
          break;
        case 'auth/too-many-requests':
          setError("Muitas tentativas. Tente novamente mais tarde.");
          break;
        case 'auth/operation-not-allowed':
          setError("O login por e-mail não está ativado no Firebase Console.");
          break;
        case 'auth/network-request-failed':
          setError("Erro de conexão. Verifique sua internet ou se o Firebase está bloqueado.");
          break;
        case 'auth/internal-error':
          setError("Erro interno do Firebase. Tente novamente.");
          break;
        default:
          setError("Falha ao entrar. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, insira seu e-mail.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("E-mail de recuperação enviado com sucesso!");
      setAuthMode('login');
    } catch (err: any) {
      console.error("Forgot Password Error:", err);
      if (err.code === 'auth/user-not-found') {
        setError("E-mail não encontrado.");
      } else if (err.code === 'auth/invalid-email') {
        setError("E-mail inválido.");
      } else {
        setError("Falha ao enviar e-mail de recuperação.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  // --- Firestore Logic ---
  useEffect(() => {
    if (!user || !isAuthReady) {
      setLoans([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'loans'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData: Loan[] = [];
      snapshot.forEach((doc) => {
        loanData.push({ id: doc.id, ...doc.data() } as Loan);
      });
      setLoans(loanData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'loans');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleFirestoreError = (err: any, type: OperationType, path: string) => {
    const errInfo: FirestoreErrorInfo = {
      error: err instanceof Error ? err.message : String(err),
      operationType: type,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    setError("Erro de permissão ou conexão com o banco de dados.");
  };

  const addLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newLoan.clientName || !newLoan.capital) return;

    const capitalNum = parseLocaleNumber(newLoan.capital);
    const interestRateNum = parseLocaleNumber(newLoan.interestRate) / 100;
    
    const loanData: any = {
      clientName: newLoan.clientName,
      clientPhone: newLoan.clientPhone,
      date: newLoan.date,
      dueDate: newLoan.dueDate,
      capital: capitalNum,
      interestRate: interestRateNum,
      totalBruto: capitalNum * (1 + interestRateNum),
      uid: user.uid,
    };

    try {
      if (editingLoanId) {
        const oldLoan = loans.find(l => l.id === editingLoanId);
        await updateDoc(doc(db, 'loans', editingLoanId), loanData);
        
        // If name or phone changed, bulk update all other loans for this client
        if (oldLoan && (oldLoan.clientName !== newLoan.clientName || oldLoan.clientPhone !== newLoan.clientPhone)) {
          const otherLoans = loans.filter(l => l.clientName === oldLoan.clientName && l.id !== editingLoanId);
          const batch = otherLoans.map(l => 
            updateDoc(doc(db, 'loans', l.id), {
              clientName: newLoan.clientName,
              clientPhone: newLoan.clientPhone,
            })
          );
          await Promise.all(batch);
        }
      } else {
        loanData.status = 'Pendente';
        loanData.createdAt = new Date().toISOString();
        loanData.capitalPago = 0;
        loanData.jurosPagos = 0;
        await addDoc(collection(db, 'loans'), loanData);
      }
      
      setIsAdding(false);
      setEditingLoanId(null);
      setNewLoan({
        clientName: '',
        clientPhone: '',
        capital: '',
        interestRate: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      });
    } catch (err) {
      handleFirestoreError(err, editingLoanId ? OperationType.UPDATE : OperationType.CREATE, 'loans');
    }
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoanId(loan.id);
    setNewLoan({
      clientName: loan.clientName,
      clientPhone: loan.clientPhone || '',
      capital: loan.capital.toString(),
      interestRate: (loan.interestRate * 100).toString(),
      date: loan.date,
      dueDate: loan.dueDate,
    });
    setIsAdding(true);
  };

  const updateStatus = async (loan: Loan, status: Loan['status']) => {
    try {
      const updateData: any = { status };
      
      // If manually marking as Paid, assume full payment of remaining capital and interest
      if (status === 'Pago') {
        updateData.capitalPago = (loan.capitalPago || 0) + loan.capital;
        updateData.jurosPagos = (loan.jurosPagos || 0) + (loan.totalBruto - loan.capital);
        updateData.capital = 0;
        updateData.totalBruto = 0;
      }
      
      await updateDoc(doc(db, 'loans', loan.id), updateData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${loan.id}`);
    }
  };

  const handleAmortization = async () => {
    if (!payingLoan || !amortizationAmount) return;
    const amount = parseFloat(amortizationAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCapital = Math.max(0, payingLoan.capital - amount);
    const newTotalBruto = newCapital * (1 + payingLoan.interestRate);
    const newCapitalPago = (payingLoan.capitalPago || 0) + amount;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        capital: newCapital,
        totalBruto: newTotalBruto,
        capitalPago: newCapitalPago,
        status: newCapital === 0 ? 'Pago' : payingLoan.status
      });
      setPayingLoan(null);
      setAmortizationAmount('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const handleInterestPayment = async () => {
    if (!payingLoan) return;
    const today = startOfDay(new Date());
    let currentDueDate: Date;
    try {
      currentDueDate = parseISO(payingLoan.dueDate);
    } catch (e) {
      currentDueDate = today;
    }
    
    let newDueDate: Date;
    if (isNaN(currentDueDate.getTime())) {
      newDueDate = addMonths(today, 1);
    } else {
      newDueDate = addMonths(currentDueDate, 1);
      if (newDueDate < today) {
        newDueDate = addMonths(today, 1);
      }
    }

    const interestAmount = payingLoan.totalBruto - payingLoan.capital;
    const newJurosPagos = (payingLoan.jurosPagos || 0) + interestAmount;
    
    // Reset the issue date to today and move due date forward
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        date: format(today, 'yyyy-MM-dd'),
        dueDate: format(newDueDate, 'yyyy-MM-dd'),
        jurosPagos: newJurosPagos
      });
      setPayingLoan(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const handleRenewLoan = async () => {
    if (!payingLoan) return;
    const today = startOfDay(new Date());
    let currentDueDate: Date;
    try {
      currentDueDate = parseISO(payingLoan.dueDate);
    } catch (e) {
      currentDueDate = today;
    }
    
    // Add 1 month to the current due date to maintain the cycle (fixed day)
    // If the current due date is invalid, use today + 1 month
    let newDueDate: Date;
    if (isNaN(currentDueDate.getTime())) {
      newDueDate = addMonths(today, 1);
    } else {
      newDueDate = addMonths(currentDueDate, 1);
      // If the new due date is still in the past, maybe the user was very late
      // In that case, we set it to 1 month from today to avoid immediate overdue
      if (newDueDate < today) {
        newDueDate = addMonths(today, 1);
      }
    }
    
    const interestAmount = payingLoan.totalBruto - payingLoan.capital;
    const newJurosPagos = (payingLoan.jurosPagos || 0) + interestAmount;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        date: format(today, 'yyyy-MM-dd'),
        dueDate: format(newDueDate, 'yyyy-MM-dd'),
        status: 'Pendente',
        jurosPagos: newJurosPagos
      });
      setPayingLoan(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const deleteLoan = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Empréstimo',
      message: 'Tem certeza que deseja excluir este empréstimo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'loans', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `loans/${id}`);
        }
      }
    });
  };

  // --- Financial Calculations ---
  const filteredLoans = useMemo(() => {
    if (activeTab === 'Empréstimos') {
      return loans.filter(l => l.status !== 'Pago');
    }
    if (activeTab === 'Histórico') {
      return loans.filter(l => l.status === 'Pago');
    }
    return [];
  }, [loans, activeTab]);

  const clients = useMemo(() => {
    const clientMap = new Map<string, { name: string, phone: string, totalCapital: number, loanCount: number, activeDebt: number }>();
    loans.forEach(loan => {
      const existing = clientMap.get(loan.clientName) || { name: loan.clientName, phone: loan.clientPhone || '', totalCapital: 0, loanCount: 0, activeDebt: 0 };
      existing.totalCapital += loan.capital + (loan.capitalPago || 0);
      existing.loanCount += 1;
      if (loan.status !== 'Pago') {
        existing.activeDebt += loan.totalBruto;
      }
      if (loan.clientPhone && !existing.phone) {
        existing.phone = loan.clientPhone;
      }
      clientMap.set(loan.clientName, existing);
    });
    return Array.from(clientMap.values()).sort((a, b) => b.activeDebt - a.activeDebt);
  }, [loans]);

  const stats = useMemo(() => {
    const capitalLiberado = loans
      .filter(l => l.status !== 'Pago')
      .reduce((acc, curr) => acc + curr.capital, 0);
    
    const capitalRecebido = loans
      .reduce((acc, curr) => acc + (curr.capitalPago || 0), 0);
    
    const jurosRealizados = loans
      .reduce((acc, curr) => acc + (curr.jurosPagos || 0), 0);
    
    const atrasado = loans
      .filter(l => l.status === 'Atrasado' || isOverdue(l))
      .reduce((acc, curr) => acc + curr.totalBruto, 0);
    
    return {
      capitalLiberado,
      capitalRecebido,
      jurosRealizados,
      atrasado
    };
  }, [loans]);

  // --- WhatsApp Command Logic ---
  const generateWhatsAppMessage = (loan: Loan) => {
    const message = `*COBRANÇA EXECUTIVA - GESTÃO DE CARTEIRA*\n\n` +
      `Olá, *${loan.clientName}*.\n\n` +
      `Informamos o detalhamento do seu débito:\n` +
      `• *Capital:* R$ ${loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• *Juros (${(loan.interestRate * 100).toFixed(0)}%):* R$ ${(loan.totalBruto - loan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• *Total a Receber:* R$ ${loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• *Vencimento:* ${safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}\n\n` +
      `*Chave PIX:* ${PIX_KEY}\n\n` +
      `Favor confirmar o pagamento enviando o comprovante.`;
    
    const encoded = encodeURIComponent(message);
    const phone = loan.clientPhone ? loan.clientPhone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.toLowerCase().startsWith('cobrança ')) {
      const name = command.substring(9).trim();
      const loan = loans.find(l => l.clientName.toLowerCase().includes(name.toLowerCase()));
      if (loan) {
        generateWhatsAppMessage(loan);
        setCommand('');
      } else {
        setError(`Cliente "${name}" não encontrado na carteira.`);
      }
    }
  };

  // --- Render Helpers ---
  if (!isAuthReady || isConnecting) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-6">
      <div className="w-12 h-12 border-[1px] border-brand-primary/30 border-t-brand-primary rounded-full animate-spin shadow-[0_0_30px_rgba(212,175,55,0.2)]" />
      <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px]">
        {isConnecting ? 'Verificando Conexão' : 'Sincronizando Sistema'}
      </span>
    </div>
  );

  if (!user) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-black p-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[150px] rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md w-full glass-card p-8 md:p-14 text-center relative z-10"
        >
          <div className="flex justify-center mb-10">
            <div className="p-1 bg-gradient-to-tr from-brand-primary/40 to-transparent rounded-[28px] shadow-2xl relative group">
              <div className="absolute inset-0 bg-brand-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <img 
                src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=256&h=256&fit=crop" 
                className="w-20 h-20 rounded-[24px] object-cover relative z-10 grayscale hover:grayscale-0 transition-all duration-700" 
                alt="RL Logo"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <div className="space-y-3 mb-10">
            <h1 className="text-2xl font-bold text-white tracking-[0.1em] uppercase">Reyne Lucas</h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-8 bg-brand-primary/20" />
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.5em]">Private Finance</span>
              <div className="h-[1px] w-8 bg-brand-primary/20" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(error || connectionError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 overflow-hidden"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error || connectionError}
              </motion.div>
            )}

            {authMode === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailLogin}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-colors"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Entrar'}
                </button>
                <div className="flex items-center justify-center px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setError(null);
                    }}
                    className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-wider"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              </motion.form>
            )}

            {authMode === 'forgot' && (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="E-mail de recuperação"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Recuperar Senha'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                  }}
                  className="w-full text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-wider text-center"
                >
                  Voltar para o Login
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-10 text-[9px] font-black text-slate-600 uppercase tracking-widest">
            Sistema de Gestão de Ativos de Alta Performance
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-300 font-sans selection:bg-brand-primary/20 overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 -right-24 w-[500px] h-[500px] bg-white/5 rounded-full blur-[140px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-2xl border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-gradient-to-br from-brand-primary/30 to-transparent rounded-2xl">
              <img 
                src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=64&h=64&fit=crop" 
                className="w-10 h-10 rounded-xl object-cover grayscale" 
                alt="RL Logo"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-[0.1em] leading-none">REYNE LUCAS</h1>
              <span className="text-[10px] uppercase tracking-[0.4em] text-brand-primary font-black">Private Finance</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-white">{user.displayName}</span>
              <span className="text-xs text-slate-500 font-medium">{user.email}</span>
            </div>
            <div className="h-8 w-px bg-white/10 hidden md:block" />
            <button 
              onClick={handleLogout}
              className="p-3 text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 rounded-2xl transition-all active:scale-90"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Capital Liberado" 
            value={`R$ ${stats.capitalLiberado.toLocaleString('pt-BR')}`} 
            icon={<DollarSign className="w-5 h-5" />}
            color="primary"
            trend="Ativo"
          />
          <StatCard 
            title="Capital Recebido" 
            value={`R$ ${stats.capitalRecebido.toLocaleString('pt-BR')}`} 
            icon={<Wallet className="w-5 h-5" />}
            color="accent"
            trend="Liquidado"
          />
          <StatCard 
            title="Juros Realizados" 
            value={`R$ ${stats.jurosRealizados.toLocaleString('pt-BR')}`} 
            icon={<TrendingUp className="w-5 h-5" />}
            color="secondary"
            trend="Lucro"
          />
          <StatCard 
            title="Atrasado" 
            value={`R$ ${stats.atrasado.toLocaleString('pt-BR')}`} 
            icon={<AlertCircle className="w-5 h-5" />}
            color="danger"
            trend="Risco"
          />
        </div>

        {/* Command Bar */}
        <div className="glass-card p-2 shadow-2xl">
          <form onSubmit={handleCommand} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-500 group-focus-within:text-brand-primary transition-colors" />
              <div className="h-4 w-px bg-white/10" />
            </div>
            <input 
              type="text"
              placeholder="Buscar cliente"
              className="w-full bg-transparent rounded-2xl py-5 pl-16 pr-4 text-white placeholder:text-slate-600 focus:outline-none transition-all text-base font-bold tracking-tight"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2">
              <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] text-slate-500 font-black tracking-widest">ENTER</kbd>
            </div>
          </form>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-5 rounded-[24px] flex items-center justify-between backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold tracking-tight">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <nav className="flex items-center bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] w-fit">
              {(['Empréstimos', 'Clientes', 'Histórico'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-300",
                    activeTab === tab 
                      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {tab}
                </button>
              ))}
            </nav>
            
            {activeTab === 'Empréstimos' && (
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingLoanId(null);
                  setNewLoan({
                    clientName: '',
                    clientPhone: '',
                    capital: '',
                    interestRate: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                  });
                  setIsAdding(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Novo Empréstimo
              </motion.button>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'Clientes' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Telefone</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Contratos</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Capital Total</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Dívida Ativa</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-medium">Nenhum cliente cadastrado.</td>
                      </tr>
                    ) : (
                      clients.map((client, index) => (
                        <tr key={`client-${client.name}-${index}`} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-6 font-bold text-white">{client.name}</td>
                          <td className="px-8 py-6 text-slate-400 text-sm">{client.phone || '-'}</td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => setViewingClientLoans(client.name)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-brand-primary/20"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>{client.loanCount} {client.loanCount === 1 ? 'Contrato' : 'Contratos'}</span>
                            </button>
                          </td>
                          <td className="px-8 py-6 text-white text-sm">R$ {client.totalCapital.toLocaleString('pt-BR')}</td>
                          <td className="px-8 py-6 text-brand-primary font-bold">R$ {client.activeDebt.toLocaleString('pt-BR')}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  const latestLoan = loans
                                    .filter(l => l.clientName === client.name)
                                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
                                  if (latestLoan) openEditModal(latestLoan);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-brand-primary/20"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span>Editar</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Excluir Cliente',
                                    message: `Deseja excluir todos os empréstimos de ${client.name}? Esta ação não pode ser desfeita.`,
                                    onConfirm: async () => {
                                      try {
                                        const clientLoans = loans.filter(l => l.clientName === client.name);
                                        const batch = clientLoans.map(l => deleteDoc(doc(db, 'loans', l.id)));
                                        await Promise.all(batch);
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.DELETE, 'loans/bulk');
                                      }
                                    }
                                  });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-danger/10 text-brand-danger hover:bg-brand-danger hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-brand-danger/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Original</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Vencimento</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Juros</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando dados...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredLoans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-5 bg-white/[0.03] rounded-[32px] border border-white/[0.05]">
                              {activeTab === 'Empréstimos' ? <Users className="w-8 h-8 text-slate-600" /> : <History className="w-8 h-8 text-slate-600" />}
                            </div>
                            <span className="text-slate-500 font-medium">Nenhum empréstimo encontrado.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredLoans.map((loan) => (
                        <tr key={loan.id} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-4">
                            <button 
                              onClick={() => setViewingClientLoans(loan.clientName)}
                              className="font-bold text-white hover:text-brand-primary transition-colors text-left"
                              title="Ver todos os contratos deste cliente"
                            >
                              {loan.clientName}
                            </button>
                            {loan.clientPhone && <div className="text-[10px] text-slate-500 font-medium">{loan.clientPhone}</div>}
                          </td>
                          <td className="px-8 py-4 text-white text-xs">
                            R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                            <div className={cn(
                              "flex items-center gap-1.5",
                              isOverdue(loan) && "text-brand-danger"
                            )}>
                              <Clock className="w-3.5 h-3.5" />
                              {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="px-8 py-4 text-brand-accent/80 text-xs">
                            {((loan.interestRate || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                          </td>
                          <td className="px-8 py-4 text-white font-bold text-sm">
                            R$ {loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-4">
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} onClick={() => {
                              const nextStatus: Record<string, Loan['status']> = {
                                'Pendente': 'Pago',
                                'Pago': 'Atrasado',
                                'Atrasado': 'Pendente'
                              };
                              updateStatus(loan, nextStatus[loan.status]);
                            }} />
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setViewingClientLoans(loan.clientName)}
                                className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 border border-brand-primary/20"
                                title="Ver Histórico"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setPayingLoan(loan)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-brand-accent/20"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>Pagamento</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Loan Modal */}
      <AnimatePresence>
        {isAdding && (
          <div key="modal-add-loan" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {editingLoanId ? 'Editar Empréstimo' : 'Novo Empréstimo'}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-2">Preencha os dados para registrar a operação.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingLoanId(null);
                    setNewLoan({
                      clientName: '',
                      clientPhone: '',
                      capital: '',
                      interestRate: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                    });
                  }}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-500" />
                </button>
              </div>

              <form onSubmit={addLoan} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <input 
                      required
                      type="text"
                      className="w-full glass-input"
                      value={newLoan.clientName}
                      onChange={(e) => setNewLoan({...newLoan, clientName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número de Telefone</label>
                    <input 
                      type="text"
                      placeholder="(00) 00000-0000"
                      className="w-full glass-input"
                      value={newLoan.clientPhone}
                      onChange={(e) => setNewLoan({...newLoan, clientPhone: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Capital (R$)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      className="w-full glass-input"
                      value={newLoan.capital}
                      onChange={(e) => setNewLoan({...newLoan, capital: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Juros (%)</label>
                    <input 
                      required
                      type="number"
                      step="0.1"
                      className="w-full glass-input"
                      value={newLoan.interestRate}
                      onChange={(e) => setNewLoan({...newLoan, interestRate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Emissão</label>
                    <input 
                      required
                      type="date"
                      className="w-full glass-input"
                      value={newLoan.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        try {
                          const dateObj = parseISO(newDate);
                          if (!isNaN(dateObj.getTime())) {
                            const nextMonth = addMonths(dateObj, 1);
                            setNewLoan({
                              ...newLoan, 
                              date: newDate, 
                              dueDate: format(nextMonth, 'yyyy-MM-dd')
                            });
                          } else {
                            setNewLoan({...newLoan, date: newDate});
                          }
                        } catch (err) {
                          setNewLoan({...newLoan, date: newDate});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                    <input 
                      required
                      type="date"
                      className="w-full glass-input"
                      value={newLoan.dueDate}
                      onChange={(e) => setNewLoan({...newLoan, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-[28px] space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Juros Calculados</span>
                    <span className="text-brand-primary">R$ {(parseLocaleNumber(newLoan.capital || '0') * (parseLocaleNumber(newLoan.interestRate || '0') / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-white tracking-tight">
                    <span>Total Bruto</span>
                    <span className="">R$ {(parseLocaleNumber(newLoan.capital || '0') * (1 + parseLocaleNumber(newLoan.interestRate || '0') / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full btn-primary py-5 text-lg"
                >
                  {editingLoanId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Payment Modal */}
        {payingLoan && (
          <div key="modal-payment" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayingLoan(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Pagamento</h2>
                  <p className="text-slate-600 text-sm font-medium mt-1">{payingLoan.clientName}</p>
                </div>
                <button 
                  onClick={() => setPayingLoan(null)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-600" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Loan Summary Section */}
                <div className="glass-card p-6 bg-white/[0.02] border-white/[0.05] space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo do Empréstimo</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Capital Atual</span>
                      <div className="text-sm font-bold text-white">R$ {payingLoan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Juros ({(payingLoan.interestRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span>
                      <div className="text-sm font-bold text-brand-accent">R$ {(payingLoan.totalBruto - payingLoan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Vencimento</span>
                      <div className="text-sm font-bold text-white">{safeFormatDate(payingLoan.dueDate, 'dd/MM/yyyy')}</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Bruto</span>
                      <div className="text-sm font-bold text-brand-primary">R$ {payingLoan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>

                {/* Amortization Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-brand-accent rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amortização</h3>
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="number"
                      placeholder="Valor (R$)"
                      className="flex-1 glass-input"
                      value={amortizationAmount}
                      onChange={(e) => setAmortizationAmount(e.target.value)}
                    />
                    <button 
                      onClick={handleAmortization}
                      className="px-6 bg-brand-accent text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 active:scale-95"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Interest Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções de Juros</h3>
                  </div>
                  <div className="grid gap-3">
                    <button 
                      onClick={handleInterestPayment}
                      className="w-full py-5 bg-brand-primary/10 hover:bg-brand-primary text-white rounded-2xl font-bold transition-all border border-brand-primary/20 flex items-center justify-between px-6 active:scale-[0.98] group"
                    >
                      <span className="text-sm">Pagamento de Juros</span>
                      <span className="text-brand-accent font-black text-sm group-hover:text-white transition-colors">
                        R$ {(payingLoan.totalBruto - payingLoan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </button>
                    <button 
                      onClick={handleRenewLoan}
                      className="w-full py-5 bg-brand-primary text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 flex items-center justify-between px-6 active:scale-[0.98]"
                    >
                      <span className="text-sm">Pagar Juros e Renovar</span>
                      <span className="opacity-80 text-[10px] font-black uppercase tracking-tighter">+30 dias</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {confirmModal.isOpen && (
          <div key="modal-confirm" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm glass-card p-8 text-center"
              >
                <div className="w-16 h-16 bg-brand-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-brand-danger" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h2>
                <p className="text-slate-500 text-sm mb-8">{confirmModal.message}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 px-6 py-3 bg-white/5 text-slate-500 hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 px-6 py-3 bg-brand-danger text-white hover:bg-brand-danger/90 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-danger/20 transition-all active:scale-95"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        {viewingClientLoans && (
          <div key="modal-view-client-loans" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingClientLoans(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl glass-card p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Contratos de {viewingClientLoans}</h2>
                  <p className="text-slate-600 text-sm font-medium mt-1">Histórico completo de empréstimos e pagamentos.</p>
                </div>
                <button 
                  onClick={() => setViewingClientLoans(null)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-600" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-surface-900/50 backdrop-blur-md">
                    <tr className="border-b border-white/[0.03]">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Original</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Vencimento</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Total</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loans
                      .filter(l => l.clientName === viewingClientLoans)
                      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                      .map((loan) => (
                        <tr key={loan.id} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4 text-white text-xs">
                            R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                            <div className={cn(
                              "flex items-center gap-1.5",
                              isOverdue(loan) && "text-brand-danger"
                            )}>
                              <Clock className="w-3.5 h-3.5" />
                              {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-bold text-sm">
                            R$ {loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} onClick={() => {
                              const nextStatus: Record<string, Loan['status']> = {
                                'Pendente': 'Pago',
                                'Pago': 'Atrasado',
                                'Atrasado': 'Pendente'
                              };
                              updateStatus(loan, nextStatus[loan.status]);
                            }} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => {
                                    setViewingClientLoans(null);
                                    setPayingLoan(loan);
                                  }}
                                  className="p-2 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent hover:text-white rounded-xl transition-all active:scale-95 border border-brand-accent/20"
                                  title="Pagamento"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setViewingClientLoans(null);
                                  openEditModal(loan);
                                }}
                                className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 border border-brand-primary/20"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setViewingClientLoans(null);
                                  deleteLoan(loan.id);
                                }}
                                className="p-2 bg-brand-danger/10 text-brand-danger hover:bg-brand-danger hover:text-white rounded-xl transition-all active:scale-95 border border-brand-danger/20"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ title, value, icon, color, trend }: { title: string, value: string, icon: React.ReactNode, color: 'primary' | 'secondary' | 'accent' | 'danger', trend?: string }) {
  const colors = {
    primary: 'text-brand-primary bg-brand-primary/5 border-brand-primary/10',
    secondary: 'text-white bg-white/5 border-white/10',
    accent: 'text-brand-accent bg-brand-accent/5 border-brand-accent/10',
    danger: 'text-brand-danger bg-brand-danger/5 border-brand-danger/10',
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.01 }}
      className="glass-card p-7 space-y-5 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[60px] -mr-16 -mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("p-3.5 rounded-[20px] transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]", colors[color])}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border", colors[color])}>
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] block mb-1.5">{title}</span>
        <div className="text-2xl font-bold text-white tracking-tight group-hover:text-brand-primary transition-colors duration-500">{value}</div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, onClick }: { status: Loan['status'], onClick: () => void }) {
  const styles = {
    'Pendente': 'bg-brand-warning/5 text-brand-warning border-brand-warning/10 hover:bg-brand-warning/10',
    'Pago': 'bg-brand-accent/5 text-brand-accent border-brand-accent/10 hover:bg-brand-accent/10',
    'Atrasado': 'bg-brand-danger/5 text-brand-danger border-brand-danger/10 hover:bg-brand-danger/10',
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all active:scale-90",
        styles[status]
      )}
    >
      {status}
    </button>
  );
}


