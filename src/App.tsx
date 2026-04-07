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
  KeyRound,
  FileText,
  Share2,
  MessageCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  deleteDoc,
  getDocs
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

interface SystemAction {
  id: string;
  type: 'loan_created' | 'payment_received' | 'loan_deleted' | 'loan_updated';
  description: string;
  amount?: number;
  clientName: string;
  loanId: string;
  date: string;
  uid: string;
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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [actions, setActions] = useState<SystemAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Empréstimos' | 'Clientes' | 'Transações' | 'Histórico'>('Empréstimos');
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [viewingContract, setViewingContract] = useState<Loan[] | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<SystemAction | null>(null);
  const [lastAction, setLastAction] = useState<SystemAction | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [showOnlyCapital, setShowOnlyCapital] = useState(false);
  const [showOnlyInterest, setShowOnlyInterest] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const shareAsPDF = async () => {
    const isReceipt = !!viewingReceipt;
    const data = isReceipt ? viewingReceipt : viewingContract;
    if (!data) return;
    
    const elementId = isReceipt ? 'printable-receipt' : 'printable-contract';
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsGeneratingPDF(true);
    try {
      // Temporarily hide the buttons section for the snapshot
      const buttons = element.querySelector('.no-print-section');
      if (buttons) (buttons as HTMLElement).style.display = 'none';

      const canvas = await html2canvas(element, {
        scale: 1.5, // Slightly lower scale for better performance on mobile
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          try {
            // Fix modern CSS colors (oklch, oklab, color-mix, etc.) for html2canvas which doesn't support them
            // We'll replace them with hex fallbacks in the entire document
            const replaceColors = (text: string) => {
              if (!text) return text;
              // This regex handles up to 2 levels of nested parentheses, which is common in Tailwind 4
              // It replaces oklch, oklab, color-mix, light-dark, and color functions with black
              const nested = '(?:[^()]+|\\((?:[^()]+|\\([^()]*\\))*\\))*';
              const regex = new RegExp(`(oklch|oklab|color-mix|light-dark|color)\\s*\\(${nested}\\)`, 'g');
              return text.replace(regex, '#000000');
            };

            // Process style tags specifically
            const styleTags = clonedDoc.getElementsByTagName('style');
            for (let i = 0; i < styleTags.length; i++) {
              try {
                const style = styleTags[i];
                if (style.innerHTML.includes('oklch') || style.innerHTML.includes('oklab') || style.innerHTML.includes('color-mix')) {
                  style.innerHTML = replaceColors(style.innerHTML);
                }
              } catch (e) {
                console.warn('Error processing style tag:', e);
              }
            }

            // Also check all elements for inline style attributes specifically
            // We avoid body.innerHTML replacement as it's too destructive and slow
            const allElements = clonedDoc.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const el = allElements[i] as HTMLElement;
              
              // Fix inline styles
              const inlineStyle = el.getAttribute('style');
              if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('color-mix') || inlineStyle.includes('light-dark'))) {
                el.setAttribute('style', replaceColors(inlineStyle));
              }

              // Remove problematic properties that can cause parsing errors in html2canvas
              if (el.style) {
                // Some modern properties cause "unexpected EOF" or other parsing errors in older CSS parsers
                const problematicProps = [
                  'field-sizing', 
                  'contain-intrinsic-size', 
                  'content-visibility', 
                  'view-transition-name',
                  'container-type',
                  'container-name',
                  'scroll-timeline',
                  'view-timeline',
                  'anchor-name',
                  'position-anchor'
                ];
                problematicProps.forEach(prop => {
                  try {
                    if (el.style.getPropertyValue(prop)) {
                      el.style.removeProperty(prop);
                    }
                  } catch (e) {}
                });
              }
            }
          } catch (e) {
            console.warn('Error during color replacement in PDF clone:', e);
          }
          
          // Ensure the contract is perfectly styled for the PDF to match the system's look
          const pdfStyle = clonedDoc.createElement('style');
          pdfStyle.innerHTML = `
            #${elementId} {
              width: 672px !important; /* Match max-w-2xl (42rem = 672px) */
              padding: 64px !important;
              background: white !important;
              color: black !important;
              position: relative !important;
              margin: 0 !important;
              transform: none !important;
              max-height: none !important;
              overflow: visible !important;
              border: none !important;
              box-shadow: none !important;
              display: block !important;
              border-radius: 0 !important;
            }
            
            /* Add a subtle watermark */
            #${elementId}::before {
              content: "NEXUS PRIVATE";
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 80px;
              font-weight: 900;
              color: rgba(0, 0, 0, 0.02);
              z-index: 0;
              pointer-events: none;
              white-space: nowrap;
            }

            .no-print-section { display: none !important; }
            
            /* Ensure the fonts are loaded and applied */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: "Plus Jakarta Sans", sans-serif !important;
            }
            .font-mono, [class*="font-mono"] {
              font-family: "JetBrains Mono", monospace !important;
            }
          `;
          // Add a footer for the PDF
          const footer = clonedDoc.createElement('div');
          footer.innerHTML = `
            <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
              <p style="font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Nexus Private - Gestão de Ativos</p>
              <p style="font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">www.nexusprivate.com.br</p>
            </div>
          `;
          const contractEl = clonedDoc.getElementById(elementId);
          if (contractEl) contractEl.appendChild(footer);

          clonedDoc.head.appendChild(pdfStyle);
        }
      });

      if (buttons) (buttons as HTMLElement).style.display = '';

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas generation failed: dimensions are zero.');
      }

      // Use JPEG for smaller file size and better performance
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      // Calculate PDF dimensions based on canvas
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      
      const pdfBlob = pdf.output('blob');
      const clientName = isReceipt ? (data as SystemAction).clientName : (data as Loan[])[0].clientName;
      const fileName = `${isReceipt ? 'Recibo' : 'Contrato'}_${clientName.replace(/\s+/g, '_')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Comprovante Nexus Private',
            text: `${isReceipt ? 'Recibo de pagamento' : 'CONTRATO DE EMPRÉSTIMO'} - ${clientName}`
          });
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            throw shareError;
          }
        }
      } else {
        // Fallback to download if sharing is not supported
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled the share dialog - this is expected behavior, not an error
        console.log('PDF sharing was cancelled by the user.');
      } else {
        console.error('Error generating/sharing PDF:', error);
        setConfirmModal({
          isOpen: true,
          title: 'Erro na Geração',
          message: 'Ocorreu um erro ao gerar ou compartilhar o comprovante. Deseja tentar novamente?',
          onConfirm: () => shareAsPDF()
        });
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };
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

  const getDaysDiff = (dueDateStr: string) => {
    try {
      const dueDate = startOfDay(parseISO(dueDateStr));
      const today = startOfDay(new Date());
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 0;
    }
  };

  // --- Firebase Auth ---
  useEffect(() => {
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

  // Keep payingLoan in sync with loans array
  useEffect(() => {
    if (payingLoan) {
      const updatedLoan = loans.find(l => l.id === payingLoan.id);
      if (updatedLoan && (
        updatedLoan.capital !== payingLoan.capital || 
        updatedLoan.dueDate !== payingLoan.dueDate ||
        updatedLoan.status !== payingLoan.status
      )) {
        setPayingLoan(updatedLoan);
      }
    }
  }, [loans, payingLoan]);

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

    const unsubscribeLoans = onSnapshot(q, (snapshot) => {
      const loanData: Loan[] = [];
      snapshot.forEach((doc) => {
        loanData.push({ id: doc.id, ...doc.data() } as Loan);
      });
      setLoans(loanData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'loans');
    });

    const qActions = query(
      collection(db, 'actions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeActions = onSnapshot(qActions, (snapshot) => {
      const actionData: SystemAction[] = [];
      snapshot.forEach((doc) => {
        actionData.push({ id: doc.id, ...doc.data() } as SystemAction);
      });
      setActions(actionData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'actions');
    });

    return () => {
      unsubscribeLoans();
      unsubscribeActions();
    };
  }, [user, isAuthReady]);

  const logAction = async (type: SystemAction['type'], description: string, clientName: string, loanId: string, amount?: number) => {
    if (!user) return null;
    try {
      const actionData = {
        type,
        description,
        clientName,
        loanId,
        amount: amount || 0,
        date: new Date().toISOString(),
        uid: user.uid
      };
      const docRef = await addDoc(collection(db, 'actions'), actionData);
      return { id: docRef.id, ...actionData } as SystemAction;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'actions');
      return null;
    }
  };

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
        await logAction('loan_updated', `Empréstimo atualizado para ${loanData.clientName}`, loanData.clientName, editingLoanId, loanData.capital);
        
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
        const docRef = await addDoc(collection(db, 'loans'), loanData);
        await logAction('loan_created', `Novo empréstimo para ${loanData.clientName}`, loanData.clientName, docRef.id, loanData.capital);
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
      
      const description = `Amortização de capital: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + amount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          description: newDescription,
          date: new Date().toISOString()
        });
        action = { ...lastAction, amount: newAmount, description: newDescription };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, amount);
      }

      setAmortizationAmount('');
      if (action) setLastAction(action);
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

      const description = `Pagamento de juros: R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + interestAmount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          description: newDescription,
          date: new Date().toISOString()
        });
        action = { ...lastAction, amount: newAmount, description: newDescription };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, interestAmount);
      }

      if (action) setLastAction(action);
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

      const description = `Renovação com pagamento de juros: R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + interestAmount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          description: newDescription,
          date: new Date().toISOString()
        });
        action = { ...lastAction, amount: newAmount, description: newDescription };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, interestAmount);
      }

      if (action) setLastAction(action);
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
          const loanToDelete = loans.find(l => l.id === id);
          await deleteDoc(doc(db, 'loans', id));
          
          // Delete associated actions
          const q = query(
            collection(db, 'actions'), 
            where('loanId', '==', id),
            where('uid', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          const actionDeletions = snapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(actionDeletions);

          if (loanToDelete) {
            await logAction('loan_deleted', `Empréstimo excluído - ${loanToDelete.clientName}`, loanToDelete.clientName, id, loanToDelete.capital);
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `loans/${id}`);
        }
      }
    });
  };

  const clearHistory = async () => {
    if (!user || actions.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Limpar Histórico',
      message: 'Deseja excluir permanentemente todo o histórico de transações? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const q = query(collection(db, 'actions'), where('uid', '==', user.uid));
          const snapshot = await getDocs(q);
          const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletions);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'actions/bulk');
        }
      }
    });
  };

  const deleteAction = async (id: string) => {
    const action = actions.find(a => a.id === id);
    if (!action) return;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir Registro',
      message: 'Deseja excluir este registro? Se for um pagamento, os valores do empréstimo serão estornados no dashboard e no contrato. Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          if (action.type === 'payment_received' && action.loanId) {
            const loan = loans.find(l => l.id === action.loanId);
            if (loan) {
              const amount = action.amount || 0;
              const isCapital = action.description.toLowerCase().includes('amortização');
              const isInterest = action.description.toLowerCase().includes('juros');

              const updates: any = {};
              if (isCapital) {
                updates.capital = loan.capital + amount;
                updates.capitalPago = Math.max(0, (loan.capitalPago || 0) - amount);
                updates.totalBruto = updates.capital * (1 + loan.interestRate);
                if (loan.status === 'Pago') {
                  updates.status = 'Pendente';
                }
              } else if (isInterest) {
                updates.jurosPagos = Math.max(0, (loan.jurosPagos || 0) - amount);
              }

              if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'loans', loan.id), updates);
              }
            }
          }
          await deleteDoc(doc(db, 'actions', id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `actions/${id}`);
        }
      }
    });
  };

  // --- Financial Calculations ---
  const filteredLoans = useMemo(() => {
    if (filterDate) {
      return loans.filter(l => {
        const day = parseISO(l.dueDate).getDate();
        return day === parseInt(filterDate);
      });
    }

    let result = loans;
    if (activeTab === 'Empréstimos') {
      result = loans.filter(l => l.status !== 'Pago');
      if (!command.trim() && !showOnlyOverdue) {
        result = [...result]
          .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())
          .slice(0, 5);
      }
    }
    
    if (showOnlyOverdue) {
      result = result.filter(l => l.status === 'Atrasado' || isOverdue(l));
    }
    
    if (command.trim()) {
      const search = command.toLowerCase();
      const cleanSearch = search.startsWith('cobrança ') ? search.substring(9).trim() : search;
      if (cleanSearch) {
        result = result.filter(l => 
          l.clientName.toLowerCase().includes(cleanSearch) || 
          (l.clientPhone && l.clientPhone.includes(cleanSearch))
        );
      }
    }
    
    return result;
  }, [loans, activeTab, command, showOnlyOverdue, filterDate]);

  const clients = useMemo(() => {
    const clientMap = new Map<string, { name: string, phone: string, totalCapital: number, loanCount: number, activeDebt: number }>();
    
    const relevantLoans = filterDate 
      ? loans.filter(l => {
          const day = parseISO(l.dueDate).getDate();
          return day === parseInt(filterDate);
        })
      : loans;

    relevantLoans.forEach(loan => {
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
    
    let result = Array.from(clientMap.values()).sort((a, b) => b.activeDebt - a.activeDebt);
    
    if (command.trim()) {
      const search = command.toLowerCase();
      const cleanSearch = search.startsWith('cobrança ') ? search.substring(9).trim() : search;
      if (cleanSearch) {
        result = result.filter(c => 
          c.name.toLowerCase().includes(cleanSearch) || 
          (c.phone && c.phone.includes(cleanSearch))
        );
      }
    }
    
    return result;
  }, [loans, command, filterDate]);

  const filteredActions = useMemo(() => {
    if (command.trim()) {
      const search = command.toLowerCase();
      const cleanSearch = search.startsWith('cobrança ') ? search.substring(9).trim() : search;
      if (cleanSearch) {
        return actions.filter(a => 
          a.clientName.toLowerCase().includes(cleanSearch) || 
          a.description.toLowerCase().includes(cleanSearch)
        );
      }
    }
    return actions;
  }, [actions, command]);

  const filteredTransactions = useMemo(() => {
    let result = filteredActions.filter(a => a.type === 'payment_received');
    if (showOnlyCapital) {
      result = result.filter(a => a.description.toLowerCase().includes('capital'));
    }
    if (showOnlyInterest) {
      result = result.filter(a => a.description.toLowerCase().includes('juros'));
    }
    return result;
  }, [filteredActions, showOnlyCapital, showOnlyInterest]);

  const stats = useMemo(() => {
    const capitalLiberado = loans
      .filter(l => l.status !== 'Pago')
      .reduce((acc, curr) => acc + curr.capital, 0);
    
    const capitalRecebido = loans
      .reduce((acc, curr) => acc + (curr.capitalPago || 0), 0);
    
    const jurosRealizados = loans
      .reduce((acc, curr) => acc + (curr.jurosPagos || 0), 0);
    
    const overdueLoans = loans.filter(l => l.status === 'Atrasado' || isOverdue(l));
    const atrasado = overdueLoans.reduce((acc, curr) => acc + curr.totalBruto, 0);
    const atrasadosCount = overdueLoans.length;
    
    return {
      capitalLiberado,
      capitalRecebido,
      jurosRealizados,
      atrasado,
      atrasadosCount
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
  if (!isAuthReady) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white gap-6">
      <div className="w-12 h-12 border-[1px] border-brand-primary/30 border-t-brand-primary rounded-full animate-spin shadow-[0_0_30px_rgba(212,175,55,0.2)]" />
      <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px]">Sincronizando Sistema</span>
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
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=256&h=256&fit=crop" 
                className="w-20 h-20 rounded-[24px] object-cover relative z-10 grayscale hover:grayscale-0 transition-all duration-700" 
                alt="Nexus Logo"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <div className="space-y-3 mb-10">
            <h1 className="text-2xl font-bold text-white tracking-[0.1em] uppercase">Nexus Private</h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-8 bg-brand-primary/20" />
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.5em]">crédito e gestão</span>
              <div className="h-[1px] w-8 bg-brand-primary/20" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 overflow-hidden"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
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
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=64&h=64&fit=crop" 
                className="w-10 h-10 rounded-xl object-cover grayscale" 
                alt="Nexus Logo"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-[0.1em] leading-none">Nexus Private</h1>
              <span className="text-[10px] uppercase tracking-[0.4em] text-brand-primary font-black">crédito e gestão</span>
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
              className="p-3 text-slate-400 hover:text-brand-danger hover:bg-brand-danger/10 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-danger/20"
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
            onClick={() => {
              setActiveTab('Transações');
              setShowOnlyCapital(true);
              setShowOnlyInterest(false);
              setShowOnlyOverdue(false);
              setFilterDate('');
              setCommand('');
            }}
          />
          <StatCard 
            title="Juros Realizados" 
            value={`R$ ${stats.jurosRealizados.toLocaleString('pt-BR')}`} 
            icon={<TrendingUp className="w-5 h-5" />}
            color="secondary"
            trend="Lucro"
            onClick={() => {
              setActiveTab('Transações');
              setShowOnlyInterest(true);
              setShowOnlyCapital(false);
              setShowOnlyOverdue(false);
              setFilterDate('');
              setCommand('');
            }}
          />
          <StatCard 
            title="Atrasados" 
            value={`${stats.atrasadosCount} ${stats.atrasadosCount === 1 ? 'Empréstimo' : 'Empréstimos'}`} 
            icon={<AlertCircle className="w-5 h-5" />}
            color="danger"
            trend="Risco"
            onClick={() => {
              setActiveTab('Empréstimos');
              setShowOnlyOverdue(true);
              setFilterDate('');
              setCommand('');
            }}
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
              onChange={(e) => {
                const val = e.target.value;
                setCommand(val);
                if (val.trim()) {
                  setFilterDate('');
                  setShowOnlyOverdue(false);
                  setShowOnlyCapital(false);
                  setShowOnlyInterest(false);
                }
              }}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-brand-primary/50 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select 
                  className="bg-transparent text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none [color-scheme:dark] cursor-pointer"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    if (e.target.value) {
                      setActiveTab('Clientes');
                      setCommand('');
                      setShowOnlyOverdue(false);
                      setShowOnlyCapital(false);
                      setShowOnlyInterest(false);
                    }
                  }}
                >
                  <option value="" className="bg-slate-900">Dia</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day.toString()} className="bg-slate-900">
                      Dia {day}
                    </option>
                  ))}
                </select>
              </div>
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
            <div className="flex flex-col gap-2">
              <nav className="flex items-center bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] w-fit">
                {(['Empréstimos', 'Clientes', 'Transações', 'Histórico'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setShowOnlyOverdue(false);
                      setShowOnlyCapital(false);
                      setShowOnlyInterest(false);
                      setFilterDate('');
                    }}
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
              {filterDate && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-lg w-fit">
                  <Calendar className="w-3 h-3 text-brand-primary" />
                  <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest">
                    Vencimento dia: {filterDate}
                  </span>
                  <button 
                    onClick={() => setFilterDate('')}
                    className="p-1 hover:bg-brand-primary/20 rounded-md transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-brand-primary" />
                  </button>
                </div>
              )}
              {showOnlyOverdue && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-danger/10 border border-brand-danger/20 rounded-lg w-fit">
                  <AlertCircle className="w-3 h-3 text-brand-danger" />
                  <span className="text-[9px] font-bold text-brand-danger uppercase tracking-widest">
                    Apenas Atrasados
                  </span>
                  <button 
                    onClick={() => setShowOnlyOverdue(false)}
                    className="p-1 hover:bg-brand-danger/20 rounded-md transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-brand-danger" />
                  </button>
                </div>
              )}
              {showOnlyCapital && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-lg w-fit">
                  <Wallet className="w-3 h-3 text-brand-accent" />
                  <span className="text-[9px] font-bold text-brand-accent uppercase tracking-widest">
                    Capital Recebido
                  </span>
                  <button 
                    onClick={() => setShowOnlyCapital(false)}
                    className="p-1 hover:bg-brand-accent/20 rounded-md transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-brand-accent" />
                  </button>
                </div>
              )}
              {showOnlyInterest && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-secondary/10 border border-brand-secondary/20 rounded-lg w-fit">
                  <TrendingUp className="w-3 h-3 text-brand-secondary" />
                  <span className="text-[9px] font-bold text-brand-secondary uppercase tracking-widest">
                    Juros Realizados
                  </span>
                  <button 
                    onClick={() => setShowOnlyInterest(false)}
                    className="p-1 hover:bg-brand-secondary/20 rounded-md transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-brand-secondary" />
                  </button>
                </div>
              )}
            </div>
            
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
                className="bg-gradient-to-r from-brand-primary to-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Plus className="w-5 h-5" />
                Novo Empréstimo
              </motion.button>
            )}

            {activeTab === 'Histórico' && actions.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={clearHistory}
                className="bg-gradient-to-r from-brand-danger to-rose-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-danger/25 hover:shadow-brand-danger/40 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Trash2 className="w-5 h-5" />
                Limpar Histórico
              </motion.button>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === 'Clientes' && !filterDate ? (
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
                        <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-medium">
                          {command.trim() ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                        </td>
                      </tr>
                    ) : (
                      clients.map((client, index) => (
                        <tr key={`client-${client.name}-${index}`} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-6 font-bold text-white">{client.name}</td>
                          <td className="px-8 py-6 text-slate-400 text-sm">{client.phone || '-'}</td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => setViewingClientLoans(client.name)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-slate-300 hover:bg-brand-primary/20 hover:text-brand-primary rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-white/10 hover:border-brand-primary/30"
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
                                  setEditingLoanId(null);
                                  setNewLoan({
                                    clientName: client.name,
                                    clientPhone: client.phone || '',
                                    capital: '',
                                    interestRate: '',
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                                  });
                                  setIsAdding(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-brand-primary/20"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Novo</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const activeLoans = loans.filter(l => l.clientName === client.name && l.status !== 'Pago');
                                  if (activeLoans.length > 0) {
                                    setViewingContract(activeLoans);
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20"
                                title="Gerar contrato com todos os empréstimos ativos"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Contrato</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const latestLoan = loans
                                    .filter(l => l.clientName === client.name)
                                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
                                  if (latestLoan) openEditModal(latestLoan);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20"
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
                                        const loanDeletions = clientLoans.map(l => deleteDoc(doc(db, 'loans', l.id)));
                                        
                                        // Delete associated actions
                                        const q = query(
                                          collection(db, 'actions'), 
                                          where('clientName', '==', client.name),
                                          where('uid', '==', user.uid)
                                        );
                                        const snapshot = await getDocs(q);
                                        const actionDeletions = snapshot.docs.map(d => deleteDoc(d.ref));
                                        
                                        await Promise.all([...loanDeletions, ...actionDeletions]);
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
              ) : activeTab === 'Transações' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Data/Hora</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Descrição</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Recebido</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando transações...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-5 bg-white/[0.03] rounded-[32px] border border-white/[0.05]">
                              <Wallet className="w-8 h-8 text-slate-600" />
                            </div>
                            <span className="text-slate-500 font-medium">
                              {command.trim() ? 'Nenhuma transação encontrada para esta busca.' : 'Nenhuma transação financeira registrada.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((action) => (
                        <tr key={action.id} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                            {safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-8 py-4 text-white font-bold text-xs">
                            {action.clientName}
                          </td>
                          <td className="px-8 py-4 text-slate-400 text-xs italic">
                            {action.description}
                          </td>
                          <td className="px-8 py-4">
                            <span className="text-brand-accent font-black text-xs">
                              R$ {action.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setViewingReceipt(action)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                title="Gerar Recibo"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Recibo</span>
                              </button>
                              <button 
                                onClick={() => deleteAction(action.id)}
                                className="p-2 text-slate-500 hover:text-brand-danger transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : activeTab === 'Histórico' ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Data/Hora</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Ação</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Descrição</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredActions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-5 bg-white/[0.03] rounded-[32px] border border-white/[0.05]">
                              <History className="w-8 h-8 text-slate-600" />
                            </div>
                            <span className="text-slate-500 font-medium">
                              {command.trim() ? 'Nenhum registro encontrado para esta busca.' : 'Nenhuma ação registrada no sistema.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredActions.map((action) => (
                        <tr key={action.id} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                            {safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-8 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border",
                              action.type === 'loan_created' && "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
                              action.type === 'payment_received' && "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
                              action.type === 'loan_deleted' && "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
                              action.type === 'loan_updated' && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}>
                              {action.type === 'loan_created' ? 'Novo Empréstimo' :
                               action.type === 'payment_received' ? 'Pagamento' :
                               action.type === 'loan_deleted' ? 'Exclusão' : 'Atualização'}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-white font-bold text-xs">
                            {action.clientName}
                          </td>
                          <td className="px-8 py-4 text-slate-400 text-xs italic">
                            {action.description}
                          </td>
                          <td className="px-8 py-4 text-white font-bold text-xs">
                            {action.amount && action.amount > 0 ? `R$ ${action.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-8 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {action.type === 'payment_received' && (
                                <button 
                                  onClick={() => {
                                    setViewingReceipt(action);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                  title="Gerar Recibo"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Recibo</span>
                                </button>
                              )}
                              <button 
                                onClick={() => deleteAction(action.id)}
                                className="p-2 text-slate-500 hover:text-brand-danger transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
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
                              <Users className="w-8 h-8 text-slate-600" />
                            </div>
                            <span className="text-slate-500 font-medium">
                              {filterDate ? 'Nenhum Empréstimo Encontrado' : command.trim() ? 'Nenhum empréstimo encontrado para esta busca.' : 'Nenhum empréstimo pendente.'}
                            </span>
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
                              "flex flex-col gap-1",
                              isOverdue(loan) && "text-brand-danger"
                            )}>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                              </div>
                              {loan.status === 'Pendente' && (
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider",
                                  isOverdue(loan) ? "text-brand-danger" : "text-brand-accent"
                                )}>
                                  {getDaysDiff(loan.dueDate) === 0 ? 'Vence hoje' :
                                   getDaysDiff(loan.dueDate) > 0 ? `Faltam ${getDaysDiff(loan.dueDate)} dias` :
                                   `Atrasado ${Math.abs(getDaysDiff(loan.dueDate))} dias`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4 text-brand-accent/80 text-xs">
                            {((loan.interestRate || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
                          </td>
                          <td className="px-8 py-4 text-white font-bold text-sm">
                            R$ {loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-4">
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} />
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => generateWhatsAppMessage(loan)}
                                className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-xl transition-all active:scale-95 border border-[#25D366]/20"
                                title="Enviar Cobrança WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setViewingClientLoans(loan.clientName)}
                                className="p-2 bg-white/5 text-slate-400 hover:bg-brand-primary/20 hover:text-brand-primary rounded-xl transition-all active:scale-95 border border-white/10 hover:border-brand-primary/30"
                                title="Ver Histórico"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setViewingContract([loan])}
                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95 border border-emerald-500/20"
                                title="Emitir Comprovante"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => { setPayingLoan(loan); setLastAction(null); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-xl transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20"
                                >
                                  <DollarSign className="w-4 h-4" />
                                  <span>Pagamento</span>
                                </button>
                              )}
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
                      list="clients-list"
                      className="w-full glass-input"
                      value={newLoan.clientName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const existingClient = clients.find(c => c.name === name);
                        if (existingClient) {
                          setNewLoan({
                            ...newLoan, 
                            clientName: name,
                            clientPhone: existingClient.phone || newLoan.clientPhone
                          });
                        } else {
                          setNewLoan({...newLoan, clientName: name});
                        }
                      }}
                    />
                    <datalist id="clients-list">
                      {clients.map(c => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
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
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white py-5 rounded-2xl font-bold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 transition-all text-lg uppercase tracking-widest"
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
              onClick={() => { setPayingLoan(null); setLastAction(null); }}
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
                  onClick={() => { setPayingLoan(null); setLastAction(null); }}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-600" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {lastAction ? (
                  <motion.div 
                    key="success-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="py-8 text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-10 h-10 text-brand-accent" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Ações Registradas!</h3>
                      <p className="text-brand-accent font-bold text-lg mt-1">
                        Total: R$ {lastAction.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="bg-white/5 p-4 rounded-xl mt-4 text-left border border-white/10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resumo do Recibo:</p>
                        <p className="text-slate-300 text-xs leading-relaxed">{lastAction.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-4">
                      <button 
                        onClick={() => setLastAction(null)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10"
                      >
                        Realizar outra ação
                      </button>
                      <button 
                        onClick={() => {
                          setViewingReceipt(lastAction);
                          setPayingLoan(null);
                          setLastAction(null);
                        }}
                        className="w-full py-4 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-accent/20"
                      >
                        Finalizar e Ver Recibo
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="payment-options"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
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
                          className="px-6 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 active:scale-95"
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
                          className="w-full py-5 bg-white/5 hover:bg-brand-primary/20 text-white rounded-2xl font-bold transition-all border border-white/10 hover:border-brand-primary/30 flex items-center justify-between px-6 active:scale-[0.98] group"
                        >
                          <span className="text-sm">Pagamento de Juros</span>
                          <span className="text-brand-accent font-black text-sm group-hover:text-brand-primary transition-colors">
                            R$ {(payingLoan.totalBruto - payingLoan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </button>
                        <button 
                          onClick={handleRenewLoan}
                          className="w-full py-5 bg-gradient-to-r from-brand-primary to-indigo-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 flex items-center justify-between px-6 active:scale-[0.98]"
                        >
                          <span className="text-sm">Pagar Juros e Renovar</span>
                          <span className="opacity-80 text-[10px] font-black uppercase tracking-tighter">+30 dias</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    className="flex-1 px-6 py-3 bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-danger to-red-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-danger/25 hover:shadow-brand-danger/40 transition-all active:scale-95"
                  >
                    Confirmar Exclusão
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
                <div className="flex items-center gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const activeLoans = loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Pago');
                      if (activeLoans.length > 0) {
                        setViewingClientLoans(null);
                        setViewingContract(activeLoans);
                      }
                    }}
                    className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl font-bold border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
                  >
                    <FileText className="w-4 h-4" />
                    Contrato Unificado
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const clientName = viewingClientLoans;
                      const clientPhone = loans.find(l => l.clientName === clientName)?.clientPhone || '';
                      setViewingClientLoans(null);
                      setEditingLoanId(null);
                      setNewLoan({
                        clientName,
                        clientPhone,
                        capital: '',
                        interestRate: '',
                        date: format(new Date(), 'yyyy-MM-dd'),
                        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                      });
                      setIsAdding(true);
                    }}
                    className="bg-brand-primary/10 text-brand-primary px-4 py-2 rounded-xl font-bold border border-brand-primary/20 hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Empréstimo
                  </motion.button>
                  <button 
                    onClick={() => setViewingClientLoans(null)}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-90 text-slate-600" />
                  </button>
                </div>
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
                              "flex flex-col gap-1",
                              isOverdue(loan) && "text-brand-danger"
                            )}>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                              </div>
                              {loan.status === 'Pendente' && (
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider",
                                  isOverdue(loan) ? "text-brand-danger" : "text-brand-accent"
                                )}>
                                  {getDaysDiff(loan.dueDate) === 0 ? 'Vence hoje' :
                                   getDaysDiff(loan.dueDate) > 0 ? `Faltam ${getDaysDiff(loan.dueDate)} dias` :
                                   `Atrasado ${Math.abs(getDaysDiff(loan.dueDate))} dias`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-white font-bold text-sm">
                            R$ {loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => {
                                    setViewingClientLoans(null);
                                    setPayingLoan(loan);
                                    setLastAction(null);
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
                                  setViewingContract([loan]);
                                }}
                                className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all active:scale-95 border border-brand-primary/20"
                                title="Emitir Comprovante"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
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
        {viewingContract && (
          <div key="modal-contract" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingContract(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl no-print"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              id="printable-contract"
              className="relative w-full max-w-2xl bg-white text-black p-16 rounded-none shadow-2xl overflow-y-auto max-h-[90vh] printable-content"
            >
              {/* Bank-style Header */}
              <div className="flex justify-between items-center mb-16 border-b border-slate-200 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black flex items-center justify-center rounded-sm">
                    <span className="text-white font-black text-xl tracking-tighter">NP</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Nexus Private</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Crédito e Gestão de Ativos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contrato de Operação</p>
                  <p className="text-sm font-mono font-bold">
                    {viewingContract.length === 1 
                      ? `#${viewingContract[0].id.slice(-8).toUpperCase()}`
                      : `MÚLTIPLOS (${viewingContract.length})`}
                  </p>
                </div>
              </div>

              {/* Transaction Title */}
              <div className="text-center mb-12">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">CONTRATO DE EMPRÉSTIMO</h2>
                <p className="text-sm text-slate-500">Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
              </div>

              {/* Main Data Grid */}
              <div className="space-y-8 mb-16">
                <div className="grid grid-cols-1 gap-6 border-y border-slate-100 py-8">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Beneficiário</span>
                    <span className="text-lg font-bold uppercase border-b border-slate-100 pb-1 flex-1 ml-4 text-right">{viewingContract[0].clientName}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF/CNPJ/Telefone</span>
                    <span className="text-sm font-bold border-b border-slate-100 pb-1 flex-1 ml-4 text-right">{viewingContract[0].clientPhone || 'Não informado'}</span>
                  </div>
                </div>

                <div className="space-y-12">
                  {viewingContract.map((loan, index) => (
                    <div key={loan.id} className={cn("space-y-6", index > 0 && "pt-8 border-t border-slate-100")}>
                      <div className="flex items-center gap-2">
                        <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-sm">#{index + 1}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID: {loan.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor do Capital</p>
                          <p className="text-xl font-bold">R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taxa de Juros</p>
                          <p className="text-xl font-bold">{((loan.interestRate || 0) * 100).toLocaleString('pt-BR')}% <span className="text-xs text-slate-400 font-normal">ao mês</span></p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor dos Juros</p>
                          <p className="text-xl font-bold">R$ {(loan.totalBruto - loan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data da Operação</p>
                          <p className="text-lg font-bold">{safeFormatDate(loan.date, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data de Vencimento</p>
                          <p className="text-lg font-bold">{safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Section */}
              <div className="bg-slate-50 p-10 border border-slate-200 mb-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/20 rounded-full -mr-16 -mt-16" />
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Valor Total Bruto a Pagar</p>
                  <p className="text-4xl font-black text-center tracking-tighter">
                    R$ {viewingContract.reduce((acc, l) => acc + l.totalBruto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Bank Footer / Authentication */}
              <div className="border-t-2 border-dashed border-slate-200 pt-8 mt-12">
                <div className="flex justify-between items-start gap-12">
                  <div className="flex-1 space-y-6">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Termos e Condições</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Este documento serve como comprovante de operação financeira realizada através da plataforma Nexus Private. 
                        A quitação do débito está sujeita à confirmação do recebimento dos valores na data de vencimento acordada.
                        Este comprovante é nominal e intransferível.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-4 shrink-0">
                    <div className="w-20 h-20 bg-white border-2 border-slate-100 p-1 flex items-center justify-center rounded-lg shadow-sm">
                      {/* Mock QR Code */}
                      <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-0.5 opacity-80">
                        {[...Array(16)].map((_, i) => (
                          <div key={i} className={`rounded-[1px] ${Math.random() > 0.4 ? 'bg-black' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Autenticação Mecânica</p>
                      <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        {viewingContract[0].id.toUpperCase()}-{new Date().getTime().toString().slice(-6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons (Hidden in PDF) */}
              <div className="text-center space-y-4 mt-12 no-print no-print-section">
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={shareAsPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-slate-900 to-black text-white font-bold rounded-xl shadow-xl shadow-black/20 hover:shadow-black/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Share2 className="w-5 h-5" />
                    )}
                    {isGeneratingPDF ? 'Gerando PDF...' : 'Compartilhar PDF'}
                  </button>
                  <button
                    onClick={() => setViewingContract(null)}
                    className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {viewingReceipt && (
          <div key="modal-receipt" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingReceipt(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl no-print"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              id="printable-receipt"
              className="relative w-full max-w-2xl bg-white text-black p-16 rounded-none shadow-2xl overflow-y-auto max-h-[90vh] printable-content"
            >
              {/* Bank-style Header */}
              <div className="flex justify-between items-center mb-16 border-b border-slate-200 pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black flex items-center justify-center rounded-sm">
                    <span className="text-white font-black text-xl tracking-tighter">NP</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Nexus Private</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Crédito e Gestão de Ativos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Recibo de Pagamento</p>
                  <p className="text-sm font-mono font-bold">#{viewingReceipt.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>

              {/* Receipt Title */}
              <div className="text-center mb-12">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Recibo de Pagamento</h2>
                <p className="text-sm text-slate-500">Emitido em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
              </div>

              {/* Declaration Text */}
              <div className="mb-16 text-lg leading-relaxed text-slate-800">
                <p className="mb-6">
                  Declaro para os devidos fins que recebi de <span className="font-bold uppercase">{viewingReceipt.clientName}</span>, 
                  a importância de <span className="font-bold text-2xl">R$ {viewingReceipt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>, 
                  referente a:
                </p>
                <div className="bg-slate-50 p-8 border-l-4 border-black font-bold italic text-xl">
                  "{viewingReceipt.description}"
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-16 border-t border-slate-100 pt-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data do Recebimento</p>
                  <p className="text-lg font-bold">{safeFormatDate(viewingReceipt.date, 'dd/MM/yyyy')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID da Transação</p>
                  <p className="text-sm font-mono font-bold">#{viewingReceipt.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>

              {/* Footer / Signature Area */}
              <div className="mt-20 pt-12 border-t border-slate-100 text-center">
                <div className="w-64 h-px bg-slate-300 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nexus Private - Gestão de Ativos</p>
                <p className="text-[9px] text-slate-300 mt-1 italic">Este documento é um recibo eletrônico válido.</p>
              </div>

              {/* Action Buttons (Hidden in PDF) */}
              <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center no-print-section no-print">
                <button
                  onClick={shareAsPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingPDF ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Share2 className="w-5 h-5" />
                  )}
                  {isGeneratingPDF ? 'Gerando PDF...' : 'Compartilhar Recibo'}
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ title, value, icon, color, trend, onClick }: { title: string, value: string, icon: React.ReactNode, color: 'primary' | 'secondary' | 'accent' | 'danger', trend?: string, onClick?: () => void }) {
  const colors = {
    primary: 'text-brand-primary bg-brand-primary/5 border-brand-primary/10',
    secondary: 'text-white bg-white/5 border-white/10',
    accent: 'text-brand-accent bg-brand-accent/5 border-brand-accent/10',
    danger: 'text-brand-danger bg-brand-danger/5 border-brand-danger/10',
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.01 }}
      onClick={onClick}
      className={cn(
        "glass-card p-7 space-y-5 group relative overflow-hidden",
        onClick && "cursor-pointer active:scale-95 transition-all"
      )}
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

function StatusBadge({ status }: { status: Loan['status'] }) {
  const styles = {
    'Pendente': 'bg-brand-warning/5 text-brand-warning border-brand-warning/10',
    'Pago': 'bg-brand-accent/5 text-brand-accent border-brand-accent/10',
    'Atrasado': 'bg-brand-danger/5 text-brand-danger border-brand-danger/10',
  };

  return (
    <div 
      className={cn(
        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all inline-block",
        styles[status]
      )}
    >
      {status}
    </div>
  );
}


