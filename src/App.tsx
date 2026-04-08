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
  Printer,
  Settings,
  X,
  Download,
  QrCode,
  Copy,
  MoreVertical
} from 'lucide-react';
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
  getDocs,
  setDoc
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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
// PIX_KEY is now managed in user profile settings

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
  const [activeTab, setActiveTab] = useState<'Empréstimos' | 'Clientes' | 'Transações' | 'Histórico' | 'Pagamento'>('Empréstimos');
  
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ displayName?: string, pixKey?: string, pixName?: string, pixBank?: string } | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPixKey, setNewPixKey] = useState('');
  const [newPixName, setNewPixName] = useState('');
  const [newPixBank, setNewPixBank] = useState('');

  const generateOFX = (action: SystemAction) => {
    const now = new Date();
    const timestamp = format(now, "yyyyMMddHHmmss");
    const datePosted = format(parseISO(action.date), "yyyyMMdd");
    
    return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<DTSERVER>${timestamp}</DTSERVER>
<LANGUAGE>POR</LANGUAGE>
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>${action.id}</TRNUID>
<STATUS>
<CODE>0</CODE>
<SEVERITY>INFO</SEVERITY>
</STATUS>
<STMTRS>
<CURDEF>BRL</CURDEF>
<BANKTRANLIST>
<DTSTART>${datePosted}</DTSTART>
<DTEND>${datePosted}</DTEND>
<STMTTRN>
<TRNTYPE>CREDIT</TRNTYPE>
<DTPOSTED>${datePosted}</DTPOSTED>
<TRNAMT>${action.amount || 0}</TRNAMT>
<FITID>${action.id}</FITID>
<NAME>${action.clientName.substring(0, 32)}</NAME>
<MEMO>${action.description.substring(0, 255)}</MEMO>
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;
  };

  const downloadOFX = (action: SystemAction) => {
    const ofxContent = generateOFX(action);
    const blob = new Blob([ofxContent], { type: 'application/x-ofx' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante_${action.id}.ofx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareAsPDF = async (forceDownload = false, format: 'pdf' | 'image' = 'pdf', isWhatsApp = false, customElementId?: string) => {
    if (isGeneratingPDF) return;
    const elementId = customElementId || (viewingContract ? 'printable-contract' : 'printable-receipt');
    const element = document.getElementById(elementId);
    if (!element) return;

    setIsGeneratingPDF(true);
    try {
      // Wait for fonts to be fully loaded to ensure consistent typography
      await document.fonts.ready;

      // Hide elements before capture
      const noPrintElements = element.querySelectorAll('.no-print, .no-print-section');
      const originalDisplays: string[] = [];
      noPrintElements.forEach(el => {
        originalDisplays.push((el as HTMLElement).style.display);
        (el as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(element, {
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.overflow = 'visible';
            clonedElement.style.margin = '0';
            clonedElement.style.transform = 'none';
            clonedElement.style.position = 'relative';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';
            clonedElement.style.width = '800px';
            clonedElement.style.padding = '60px';
            clonedElement.style.display = 'block';
            
            const allText = clonedElement.querySelectorAll('*');
            allText.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.wordBreak = 'break-word';
              }
            });
          }
          
          const styleTags = Array.from(clonedDoc.getElementsByTagName('style'));
          styleTags.forEach(tag => {
            try {
              let css = tag.innerHTML;
              if (css.toLowerCase().includes('oklch') || css.toLowerCase().includes('oklab')) {
                css = css.replace(/(oklch|oklab)\s*\([^;}]+\)/gi, '#777777');
                css = css.replace(/--[\w-]+\s*:\s*[^;}]+(oklch|oklab)[^;}]*/gi, (match) => {
                  const parts = match.split(':');
                  return parts.length >= 2 ? `${parts[0]}: #777777` : match;
                });
                tag.innerHTML = css;
              }
            } catch (e) {
              console.warn('Could not sanitize style tag', e);
            }
          });

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

            :root {
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              --color-emerald-600: #059669 !important;
              --color-brand-primary: #d4af37 !important;
              --color-brand-danger: #ff4d4d !important;
            }
            * {
              box-shadow: none !important;
              text-shadow: none !important;
              transition: none !important;
              animation: none !important;
              -webkit-font-smoothing: antialiased !important;
            }
            body, .printable-content, .printable-content * {
              font-family: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif !important;
              color-scheme: light !important;
              background-image: none !important;
              visibility: visible !important;
            }
            .font-mono, .font-mono * {
              font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace !important;
            }
            .flex { display: flex !important; }
            .grid { display: grid !important; }
            .hidden { display: none !important; }
            
            .no-print, .no-print-section {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
            
            .bg-white { background-color: #ffffff !important; }
            .bg-slate-900 { background-color: #0f172a !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-black { background-color: #000000 !important; }
            
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .text-white { color: #ffffff !important; }
            .text-brand-primary { color: #d4af37 !important; }
            .text-neon-red { color: #ff3131 !important; text-shadow: none !important; }
          `;
          clonedDoc.head.appendChild(style);

          const styledElements = clonedDoc.querySelectorAll('[style], [class*="bg-"], [class*="text-"]');
          styledElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            const styleAttr = htmlEl.getAttribute('style');
            if (styleAttr && (styleAttr.toLowerCase().includes('oklch') || styleAttr.toLowerCase().includes('oklab'))) {
              htmlEl.setAttribute('style', styleAttr.replace(/(oklch|oklab)\s*\([^;}]+\)/gi, '#777777'));
            }
            if (htmlEl.style) {
              htmlEl.style.boxShadow = 'none';
              htmlEl.style.textShadow = 'none';
              htmlEl.style.filter = 'none';
              htmlEl.style.transition = 'none';
              htmlEl.style.animation = 'none';
              
              if (htmlEl.style.backgroundImage && (htmlEl.style.backgroundImage.includes('oklch') || htmlEl.style.backgroundImage.includes('oklab'))) {
                htmlEl.style.backgroundImage = 'none';
                htmlEl.style.backgroundColor = '#000000';
              }

              if (htmlEl.classList.contains('bg-gradient-to-r') || htmlEl.classList.contains('bg-gradient-to-br')) {
                htmlEl.style.backgroundImage = 'none';
                htmlEl.style.backgroundColor = '#000000';
              }
            }
          });
        }
      });

      // Restore elements
      noPrintElements.forEach((el, i) => {
        (el as HTMLElement).style.display = originalDisplays[i];
      });

      if (format === 'image') {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const fileName = viewingContract ? 'contrato.png' : 'comprovante.png';
        
        if (forceDownload) {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = imgData;
          link.click();
        } else if (navigator.share) {
          const blob = await (await fetch(imgData)).blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: viewingContract ? 'Contrato Nexus Private' : 'Comprovante Nexus Private',
            text: viewingContract ? 'Segue o contrato da operação Nexus Private.' : 'Segue o comprovante de recebimento Nexus Private.',
          });
        } else {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = imgData;
          link.click();
        }
      } else {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = { width: canvas.width, height: canvas.height };
        const pdfWidth = 210;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, Math.max(pdfHeight, 297)]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const fileName = viewingContract ? 'contrato.pdf' : 'comprovante.pdf';

        if (forceDownload) {
          pdf.save(fileName);
        } else if (navigator.share) {
          const pdfBlob = pdf.output('blob');
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          await navigator.share({
            files: [file],
            title: viewingContract ? 'Contrato Nexus Private' : 'Comprovante Nexus Private',
            text: viewingContract ? 'Segue o contrato da operação Nexus Private.' : 'Segue o comprovante de recebimento Nexus Private.',
          });
        } else {
          pdf.save(fileName);
        }
      }
    } catch (error: any) {
      const isCancellation = 
        error?.name === 'AbortError' || 
        error?.message?.includes('cancellation') ||
        error?.message?.includes('share was cancelled') ||
        error?.message?.includes('Abort due to cancellation');
      
      if (!isCancellation) {
        console.error('Erro ao gerar PDF:', error);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      if (u) {
        // Fetch user profile
        const userRef = doc(db, 'users', u.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as any);
          } else {
            // Create profile if doesn't exist
            setDoc(userRef, {
              email: u.email,
              role: 'user',
              uid: u.uid,
              displayName: u.displayName || '',
              pixKey: '',
              pixName: '',
              pixBank: ''
            }, { merge: true });
          }
        });
        return () => unsubProfile();
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: newDisplayName,
        pixKey: newPixKey,
        pixName: newPixName,
        pixBank: newPixBank
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Erro ao salvar configurações.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      result = result.filter(l => 
        l.clientName.toLowerCase().includes(search) || 
        (l.clientPhone && l.clientPhone.includes(search))
      );
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
        
        <div 
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

          <div>
            {error && (
              <div
                className="mb-6 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 overflow-hidden"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </div>
            )}

            {authMode === 'login' && (
              <form
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
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 flex items-center justify-center gap-2"
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
              </form>
            )}

            {authMode === 'forgot' && (
              <form
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
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 flex items-center justify-center gap-2"
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
              </form>
            )}
          </div>

          <p className="mt-10 text-[9px] font-black text-slate-600 uppercase tracking-widest">
            Sistema de Gestão de Ativos de Alta Performance
          </p>
        </div>
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
      <header className="sticky top-0 z-40 bg-black border-b border-white/[0.03]">
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
              onClick={() => {
                setIsSettingsOpen(true);
                setNewDisplayName(userProfile?.displayName || user?.displayName || '');
                setNewPixKey(userProfile?.pixKey || '');
                setNewPixName(userProfile?.pixName || '');
                setNewPixBank(userProfile?.pixBank || '');
              }}
              className="p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-primary/20"
              title="Configurações"
            >
              <Settings className="w-5 h-5" />
            </button>
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
          <div className="relative group">
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
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-5 rounded-[24px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold tracking-tight">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 rotate-90" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <nav className="flex items-center bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] w-fit relative">
                {(['Empréstimos', 'Clientes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setShowOnlyOverdue(false);
                      setShowOnlyCapital(false);
                      setShowOnlyInterest(false);
                      setFilterDate('');
                      setIsMoreMenuOpen(false);
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

                {/* More Options Menu */}
                <div className="relative ml-1">
                  <button
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      (['Transações', 'Histórico', 'Pagamento'] as string[]).includes(activeTab)
                        ? "bg-brand-primary/20 text-brand-primary"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMoreMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[60]" 
                        onClick={() => setIsMoreMenuOpen(false)} 
                      />
                      <div className="absolute left-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                        {(['Transações', 'Histórico', 'Pagamento'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => {
                              setActiveTab(tab);
                              setShowOnlyOverdue(false);
                              setShowOnlyCapital(false);
                              setShowOnlyInterest(false);
                              setFilterDate('');
                              setIsMoreMenuOpen(false);
                            }}
                            className={cn(
                              "w-full px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] transition-all border-b border-white/5 last:border-0",
                              activeTab === tab 
                                ? "bg-brand-primary/10 text-brand-primary" 
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
              <button 
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
              </button>
            )}

            {activeTab === 'Histórico' && actions.length > 0 && (
              <button 
                onClick={clearHistory}
                className="bg-gradient-to-r from-brand-danger to-rose-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-danger/25 hover:shadow-brand-danger/40 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Trash2 className="w-5 h-5" />
                Limpar Histórico
              </button>
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
              ) : activeTab === 'Pagamento' ? (
                <div className="p-12 flex flex-col items-center text-center">
                  <div id="printable-pix" className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-slate-900 mb-8 printable-content relative overflow-hidden">
                    {/* Background Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none -rotate-12">
                      <span className="text-[80px] font-black tracking-tighter whitespace-nowrap">NEXUS PRIVATE</span>
                    </div>

                    <div className="flex flex-col items-center mb-8 relative z-10">
                      <div className="w-20 h-20 bg-black rounded-[24px] flex items-center justify-center mb-4 shadow-xl">
                        <QrCode className="w-10 h-10 text-brand-primary" />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Dados de Pagamento</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Nexus Private</p>
                    </div>

                    <div className="space-y-6 text-center relative z-10">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Chave PIX</span>
                        <p className="text-xl font-black text-slate-900 break-all select-all">{userProfile?.pixKey || "NÃO CONFIGURADA"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Titular</span>
                          <p className="font-bold text-slate-900 text-[10px] uppercase leading-tight">{userProfile?.pixName || "-"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Banco</span>
                          <p className="font-bold text-slate-900 text-[10px] uppercase leading-tight">{userProfile?.pixBank || "-"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 text-center opacity-30 relative z-10">
                      <p className="text-[8px] font-black uppercase tracking-[0.4em]">Nexus Private - Gestão de Ativos</p>
                    </div>
                  </div>

                  <div className="flex gap-4 w-full max-w-md no-print">
                    <button
                      onClick={() => shareAsPDF(false, 'pdf', false, 'printable-pix')}
                      disabled={isGeneratingPDF}
                      className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                    >
                      {isGeneratingPDF ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {isGeneratingPDF ? 'Gerando...' : 'Compartilhar Dados'}
                    </button>
                    <button
                      onClick={() => {
                        if (userProfile?.pixKey) {
                          navigator.clipboard.writeText(userProfile.pixKey);
                        }
                      }}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar Chave
                    </button>
                  </div>
                </div>
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
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-neon-red font-bold">
                                  {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                                </span>
                              </div>
                              {loan.status === 'Pendente' && (
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider",
                                  isOverdue(loan) ? "text-neon-red" : "text-brand-accent"
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
                                onClick={() => setViewingClientLoans(loan.clientName)}
                                className="p-2 bg-white/5 text-slate-400 hover:bg-brand-primary/20 hover:text-brand-primary rounded-xl border border-white/10 hover:border-brand-primary/30"
                                title="Ver Histórico"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setViewingContract([loan])}
                                className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20"
                                title="Emitir Comprovante"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => { setPayingLoan(loan); setLastAction(null); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20"
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
      {isAdding && (
        <div key="modal-add-loan" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsAdding(false)}
            className="absolute inset-0 bg-black/80"
          />
          <div 
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

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white py-5 rounded-2xl font-bold shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 transition-all text-lg uppercase tracking-widest"
                >
                  {editingLoanId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {payingLoan && (
          <div key="modal-payment" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => { setPayingLoan(null); setLastAction(null); }}
              className="absolute inset-0 bg-black/80"
            />
            <div 
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

              <div>
                {lastAction ? (
                  <div 
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
                  </div>
                ) : (
                  <div 
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
                          <div className="text-sm font-black text-neon-red">{safeFormatDate(payingLoan.dueDate, 'dd/MM/yyyy')}</div>
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
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {confirmModal.isOpen && (
          <div key="modal-confirm" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div 
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/80"
            />
            <div 
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
              </div>
            </div>
          )}
        {viewingClientLoans && (
          <div key="modal-view-client-loans" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setViewingClientLoans(null)}
              className="absolute inset-0 bg-black/80"
            />
            <div 
              className="relative w-full max-w-5xl glass-card p-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Contratos de {viewingClientLoans}</h2>
                  <p className="text-slate-600 text-sm font-medium mt-1">Histórico completo de empréstimos e pagamentos.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
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
                  </button>
                  <button 
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
                  </button>
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
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-neon-red font-bold">
                                  {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                                </span>
                              </div>
                              {loan.status === 'Pendente' && (
                                <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider",
                                  isOverdue(loan) ? "text-neon-red" : "text-brand-accent"
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
            </div>
          </div>
        )}
      {viewingContract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/95 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl my-0 sm:my-8 relative">
            <div id="printable-contract" className="p-10 sm:p-20 bg-white text-slate-900 printable-content relative">
              {/* Elegant Header */}
              <div className="flex flex-col items-center mb-16 relative z-10">
                <div className="w-20 h-20 bg-slate-900 flex items-center justify-center rounded-3xl mb-6 shadow-xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop" 
                    className="w-full h-full object-cover grayscale brightness-125" 
                    alt="Nexus Logo"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900">Nexus Private</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Comprovante de Operação</p>
              </div>

              {/* Main Amount - Elegant Focus */}
              <div className="text-center mb-16 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Valor Total da Operação</p>
                <h2 className="text-6xl font-black tracking-tighter text-slate-900">
                  <span className="text-2xl mr-2 text-slate-300">R$</span>
                  {viewingContract.reduce((acc, l) => acc + l.totalBruto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-12 mb-16 relative z-10 border-t border-slate-100 pt-10">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Capital Emprestado</span>
                  <p className="font-black text-slate-900 uppercase text-base leading-tight">
                    R$ {viewingContract.reduce((acc, l) => acc + l.capital, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Valor dos Juros</span>
                  <p className="font-black text-brand-primary uppercase text-base leading-tight">
                    R$ {viewingContract.reduce((acc, l) => acc + (l.totalBruto - l.capital), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Data e Hora</span>
                  <p className="font-black text-slate-900 uppercase text-base leading-tight">{safeFormatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Vencimento Principal</span>
                  <p className="font-black text-neon-red uppercase text-base leading-tight">{safeFormatDate(viewingContract[0].dueDate, 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Minimalist Authentication */}
              <div className="pt-10 border-t border-slate-100 relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 p-2">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-900 mb-1">Autenticação Digital</p>
                    <p className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">{viewingContract[0].id.toUpperCase()}-{new Date().getTime()}</p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Asset Management</p>
                </div>
              </div>

              {/* Action Buttons (Hidden in PDF) */}
              <div className="flex flex-col gap-4 no-print-section no-print relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => shareAsPDF(false, 'pdf', false)}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isGeneratingPDF ? 'Gerando...' : 'Compartilhar'}
                  </button>
                  <button
                    onClick={() => shareAsPDF(true, 'pdf', false)}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
                <button
                  onClick={() => setViewingContract(null)}
                  className="px-10 py-6 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-sm rounded-3xl hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/95 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl my-0 sm:my-8 relative">
            <div id="printable-receipt" className="p-10 sm:p-20 bg-white text-slate-900 printable-content relative">
              {/* Elegant Header */}
              <div className="flex flex-col items-center mb-16 relative z-10">
                <div className="w-20 h-20 bg-slate-900 flex items-center justify-center rounded-3xl mb-6 shadow-xl overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop" 
                    className="w-full h-full object-cover grayscale brightness-125" 
                    alt="Nexus Logo"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-900">Nexus Private</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Comprovante de Recebimento</p>
              </div>

              {/* Main Amount - Elegant Focus */}
              <div className="text-center mb-16 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Valor Recebido</p>
                <h2 className="text-6xl font-black tracking-tighter text-slate-900">
                  <span className="text-2xl mr-2 text-slate-300">R$</span>
                  {viewingReceipt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-12 mb-16 relative z-10 border-t border-slate-100 pt-10">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Capital Recebido</span>
                  <p className="font-black text-slate-900 uppercase text-base leading-tight">
                    R$ {(viewingReceipt.amount / (1 + (viewingReceipt.description.includes('%') ? parseFloat(viewingReceipt.description.split('%')[0].split(' ').pop() || '0') / 100 : 0))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Valor dos Juros</span>
                  <p className="font-black text-brand-primary uppercase text-base leading-tight">
                    R$ {(viewingReceipt.amount - (viewingReceipt.amount / (1 + (viewingReceipt.description.includes('%') ? parseFloat(viewingReceipt.description.split('%')[0].split(' ').pop() || '0') / 100 : 0)))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Data e Hora</span>
                  <p className="font-black text-slate-900 uppercase text-base leading-tight">{safeFormatDate(viewingReceipt.date, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">ID Transação</span>
                  <p className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{viewingReceipt.id.slice(0, 12)}</p>
                </div>
              </div>

              {/* Description Box - Minimalist */}
              <div className="mb-16 relative z-10 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-4">Descrição da Operação</span>
                <p className="font-bold text-slate-900 text-base leading-relaxed italic">"{viewingReceipt.description}"</p>
              </div>

              {/* Minimalist Authentication */}
              <div className="pt-10 border-t border-slate-100 relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 p-2">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-900 mb-1">Autenticação Digital</p>
                    <p className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">{viewingReceipt.id.toUpperCase()}-{new Date().getTime()}</p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Asset Management</p>
                </div>
              </div>

              {/* Action Buttons (Hidden in PDF) */}
              <div className="flex flex-col gap-4 no-print-section no-print relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => shareAsPDF(false, 'pdf', false)}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isGeneratingPDF ? 'Gerando...' : 'Compartilhar'}
                  </button>
                  <button
                    onClick={() => shareAsPDF(true, 'pdf', false)}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="px-10 py-6 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-sm rounded-3xl hover:bg-slate-200 transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl">
                  <Settings className="w-5 h-5 text-brand-primary" />
                </div>
                <h2 className="text-xl font-bold text-white">Configurações</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Usuário (para recibos)
                </label>
                <input 
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Este nome aparecerá nos recibos como: "Eu, [Nome], declaro..."
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Chave PIX (para comprovantes)
                </label>
                <input 
                  type="text"
                  value={newPixKey}
                  onChange={(e) => setNewPixKey(e.target.value)}
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Esta chave aparecerá nos comprovantes de empréstimo para o cliente realizar o pagamento.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Titular da Conta
                </label>
                <input 
                  type="text"
                  value={newPixName}
                  onChange={(e) => setNewPixName(e.target.value)}
                  placeholder="Nome completo do titular"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Banco
                </label>
                <input 
                  type="text"
                  value={newPixBank}
                  onChange={(e) => setNewPixBank(e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Bradesco"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                />
                <p className="text-[10px] text-slate-500 italic">
                  O nome do banco aparecerá junto ao nome do titular nos comprovantes e contratos.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-6 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-4 bg-brand-primary text-black font-bold rounded-2xl hover:bg-brand-primary/90 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <div 
      onClick={onClick}
      className={cn(
        "glass-card p-7 space-y-5 group relative overflow-hidden",
        onClick && "cursor-pointer transition-all"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 -mr-16 -mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("p-3.5 rounded-[20px] transition-all duration-500", colors[color])}>
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
    </div>
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
        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border inline-block",
        styles[status]
      )}
    >
      {status}
    </div>
  );
}


