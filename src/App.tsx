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
  FileText,
  Share2,
  MessageCircle,
  Printer,
  Settings,
  X,
  QrCode,
  Copy,
  Check,
  BarChart3,
  MoreVertical,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Bell,
  User as UserIcon,
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
  deleteDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signOut,
  User,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { format, addMonths, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { db, auth } from './firebase';
import { cn } from './lib/utils';

// --- Constants ---
const CRC16_POLY = 0x1021;
const CRC16_INIT = 0xFFFF;

function calculateCRC16(data: string): string {
  let crc = CRC16_INIT;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ CRC16_POLY) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(key: string, name: string, city: string, amount: number = 0): string {
  const formatField = (id: string, value: string) => {
    return id + value.length.toString().padStart(2, '0') + value;
  };

  const merchantAccountInfo = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', key);
  
  let payload = '000201'; // Payload Format Indicator
  payload += formatField('26', merchantAccountInfo);
  payload += '52040000'; // Merchant Category Code
  payload += '5303986'; // Transaction Currency (Real)
  if (amount > 0) {
    payload += formatField('54', amount.toFixed(2)); // Amount
  }
  payload += '5802BR'; // Country Code
  payload += formatField('59', name.substring(0, 25)); // Merchant Name
  payload += formatField('60', city.substring(0, 15)); // Merchant City
  payload += formatField('62', formatField('05', '***')); // Additional Data
  payload += '6304'; // CRC16 Indicator
  
  payload += calculateCRC16(payload);
  return payload;
}

// --- Types ---
interface Loan {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  date: string;
  dueDate: string;
  capital: number;
  interestRate: number;
  totalBruto: number;
  capitalPago: number;
  jurosPagos: number;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Agendado';
  uid: string;
  createdAt: string;
}

interface SystemAction {
  id: string;
  type: 'loan_created' | 'payment_received' | 'loan_deleted' | 'loan_updated';
  description: string;
  amount?: number;
  capitalAmount?: number;
  interestAmount?: number;
  paymentMethod?: 'DINHEIRO' | 'PIX';
  clientName: string;
  loanId: string;
  date: string;
  uid: string;
  confirmed?: boolean;
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
  authInfo: {
    userId: string;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string | null; email: string | null; }[];
  };
}

// --- Constants ---
const ptBrMonths = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [viewingClientLoans, setViewingClientLoans] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [actions, setActions] = useState<SystemAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Empréstimos' | 'Clientes' | 'Agendados' | 'Transações' | 'Histórico' | 'Pagamento' | 'Relatórios'>('Empréstimos');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [viewingContract, setViewingContract] = useState<Loan[] | null>(null);
  const [selectedLoansForUnified, setSelectedLoansForUnified] = useState<string[]>([]);

  useEffect(() => {
    if (viewingClientLoans) {
      const activeLoans = loans
        .filter(l => l.clientName === viewingClientLoans && l.status !== 'Pago')
        .map(l => l.id);
      setSelectedLoansForUnified(activeLoans);
    } else {
      setSelectedLoansForUnified([]);
    }
  }, [viewingClientLoans, loans]);

  const [viewingReceipt, setViewingReceipt] = useState<SystemAction | null>(null);
  const [viewingScheduleReceipt, setViewingScheduleReceipt] = useState<Loan | null>(null);
  const [lastAction, setLastAction] = useState<SystemAction | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [showOnlyCapital, setShowOnlyCapital] = useState(false);
  const [showOnlyInterest, setShowOnlyInterest] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ 
    displayName?: string, 
    pixKey?: string, 
    pixName?: string, 
    pixBank?: string, 
    profilePicture?: string,
    lastClosureDate?: string | null 
  } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nexus_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    const saved = localStorage.getItem('nexus_privacy_mode');
    return saved === 'true';
  });
  const [newDisplayName, setNewDisplayName] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  const maskValue = (value: string | number) => {
    if (!isPrivacyMode) return value.toString();
    return '••••';
  };
  const [newPixKey, setNewPixKey] = useState('');
  const [newPixName, setNewPixName] = useState('');
  const [newPixBank, setNewPixBank] = useState('');
  const [newProfilePicture, setNewProfilePicture] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const markNotificationAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('nexus_read_notifications', JSON.stringify(next));
      return next;
    });
  };
  
  // PIX Payment Simulation
  const [pendingPayment, setPendingPayment] = useState<{ 
    amount: number; 
    type: 'interest' | 'renew' | 'payoff' | 'amortization'; 
    label: string;
    method?: 'DINHEIRO' | 'PIX';
  } | null>(null);
  const [isConfirmingPix, setIsConfirmingPix] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [isNativeNotificationsEnabled, setIsNativeNotificationsEnabled] = useState(() => {
    return localStorage.getItem('nexus_native_notifications') === 'true';
  });
  const [sentNativeNotificationIds, setSentNativeNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_sent_notifications_native');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Update time state to re-trigger calculations if tab stays open transitions to new day
  const [lastCheckDate, setLastCheckDate] = useState(new Date().toDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastCheckDate) {
        setLastCheckDate(today);
      }
    }, 60000 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [lastCheckDate]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setError("Este navegador não suporta notificações de sistema.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsNativeNotificationsEnabled(true);
        localStorage.setItem('nexus_native_notifications', 'true');
        new Notification("Nexus Private: Sistema de Alertas", {
          body: "As notificações de segurança e lembretes bancários foram ativadas com sucesso.",
          icon: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop'
        });
      } else {
        setIsNativeNotificationsEnabled(false);
        localStorage.setItem('nexus_native_notifications', 'false');
        if (permission === "denied") {
          setError("Permissão de notificação negada no navegador.");
        }
      }
    } catch (err) {
      console.error("Erro ao solicitar permissão:", err);
    }
  };

  const shareAsPDF = async (forceDownload = false, format: 'pdf' | 'image' = 'pdf', customElementId?: string, customShareText?: string, customShareUrl?: string) => {
    if (isGeneratingPDF) return;
    
    // Determine the element ID more robustly
    let elementId = customElementId;
    if (!elementId) {
      if (viewingContract) elementId = 'printable-contract';
      else if (viewingScheduleReceipt) elementId = 'printable-schedule-receipt';
      else if (viewingReceipt) elementId = 'printable-receipt';
      else if (activeTab === 'Relatórios') elementId = 'printable-report';
      else elementId = 'printable-receipt'; // Final fallback
    }

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
            clonedElement.style.padding = '80px'; 
            clonedElement.style.display = 'block';
            
            // Force bold weights for html2canvas to ensure they are captured
            const boldElements = clonedElement.querySelectorAll('.font-bold, .font-extrabold, .font-black, b, strong');
            boldElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.fontWeight = '700';
              }
            });

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
        let fileName = 'comprovante.png';
        let shareTitle = 'Comprovante Nexus Private';
        let shareText = customShareText !== undefined ? customShareText : 'Segue o comprovante de recebimento Nexus Private.';

        if (elementId === 'printable-contract') {
          fileName = 'contrato.png';
          shareTitle = 'Contrato Nexus Private';
          shareText = customShareText !== undefined ? customShareText : 'Segue o contrato da operação Nexus Private.';
        } else if (elementId === 'printable-schedule-receipt') {
          fileName = 'comprovante_agendamento.png';
          shareTitle = 'Comprovante de Agendamento';
          shareText = customShareText !== undefined ? customShareText : 'Segue o comprovante de agendamento Nexus Private.';
        }
        
        if (forceDownload) {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = imgData;
          link.click();
        } else if (navigator.share) {
          try {
            const blob = await (await fetch(imgData)).blob();
            const file = new File([blob], fileName, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText,
              url: customShareUrl
            });
          } catch (shareError: unknown) {
            const error = shareError as { name?: string; message?: string };
            const isCancellation = 
              error?.name === 'AbortError' || 
              error?.message?.includes('cancellation') ||
              error?.message?.includes('share was cancelled') ||
              error?.message?.includes('Abort due to cancellation');
            
            if (!isCancellation) {
              console.warn('Native share failed or blocked by host, falling back to download:', shareError);
              const link = document.createElement('a');
              link.download = fileName;
              link.href = imgData;
              link.click();
            }
          }
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
        
        let fileName = 'documento.pdf';
        let shareTitle = 'Documento Nexus Private';
        let shareText = 'Segue o documento Nexus Private.';

        if (elementId === 'printable-report') {
          fileName = `relatorio-${ptBrMonths[reportMonth].toLowerCase()}-${reportYear}.pdf`;
          shareTitle = 'Relatório Mensal Nexus Private';
          shareText = `Segue o relatório mensal de ${ptBrMonths[reportMonth]}/${reportYear}.`;
        } else if (elementId === 'printable-schedule-receipt') {
          fileName = 'comprovante_agendamento.pdf';
          shareTitle = 'Comprovante de Agendamento';
          shareText = 'Segue o comprovante de agendamento Nexus Private.';
        } else if (elementId === 'printable-contract') {
          fileName = 'contrato.pdf';
          shareTitle = 'Contrato Nexus Private';
          shareText = 'Segue o contrato da operação Nexus Private.';
        } else {
          fileName = 'comprovante.pdf';
          shareTitle = 'Comprovante Nexus Private';
          shareText = 'Segue o comprovante de recebimento Nexus Private.';
        }

        if (customShareText) shareText = customShareText;

        if (forceDownload) {
          pdf.save(fileName);
        } else if (navigator.share) {
          try {
            const pdfBlob = pdf.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            await navigator.share({
              files: [file],
              title: shareTitle,
              text: shareText,
              url: customShareUrl
            });
          } catch (shareError: unknown) {
            const error = shareError as { name?: string; message?: string };
            const isCancellation = 
              error?.name === 'AbortError' || 
              error?.message?.includes('cancellation') ||
              error?.message?.includes('share was cancelled') ||
              error?.message?.includes('Abort due to cancellation');
            
            if (!isCancellation) {
              console.warn('Native share failed or blocked by host, falling back to download:', shareError);
              pdf.save(fileName);
            }
          }
        } else {
          pdf.save(fileName);
        }
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      const isCancellation = 
        err?.name === 'AbortError' || 
        err?.message?.includes('cancellation') ||
        err?.message?.includes('share was cancelled') ||
        err?.message?.includes('Abort due to cancellation');
      
      if (!isCancellation) {
        console.error('Erro ao gerar PDF:', error);
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    requiresPassword?: boolean;
    onConfirm: (password?: string) => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [amortizationAmount, setAmortizationAmount] = useState('');
  const [newLoan, setNewLoan] = useState({
    clientName: '',
    clientPhone: '',
    clientAddress: '',
    capital: '',
    interestRate: '', // No default
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    status: 'Pendente' as 'Pendente' | 'Agendado'
  });

  // Search/Command State
  const [command, setCommand] = useState('');

  // --- Helpers ---
  const parseLocaleNumber = (str: string) => {
    if (!str) return 0;
    // Remove dots (thousands) and replace comma (decimal) with dot
    const clean = str.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const toDate = (val: unknown): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    // Firestore Timestamp check
    const v = val as { toDate?: () => Date };
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof val === 'string') {
      try {
        const d = parseISO(val);
        return isNaN(d.getTime()) ? new Date(val) : d;
      } catch {
        return new Date(val);
      }
    }
    return new Date(val as string | number);
  };

  const safeFormatDate = (dateVal: unknown, formatStr: string, fallback: string = '---') => {
    const date = toDate(dateVal);
    if (!date || isNaN(date.getTime())) return fallback;
    return format(date, formatStr, { locale: ptBR });
  };

  const isOverdue = (loan: Loan) => {
    if (!loan.dueDate || loan.status !== 'Pendente') return false;
    try {
      const dueDate = startOfDay(toDate(loan.dueDate) || new Date());
      const today = startOfDay(new Date());
      return dueDate < today;
    } catch {
      return false;
    }
  };

  const getDaysDiff = (dueDateStr: string) => {
    try {
      const dueDate = startOfDay(toDate(dueDateStr) || new Date());
      const today = startOfDay(new Date());
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 400;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality to save space
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  // --- Firebase Auth ---
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);

      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (u) {
        // Fetch user profile
        const userRef = doc(db, 'users', u.uid);
        unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as { 
              displayName?: string, 
              pixKey?: string, 
              pixName?: string, 
              pixBank?: string, 
              profilePicture?: string,
              lastClosureDate?: string | null 
            };
            setUserProfile(profile);
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
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData = {
        displayName: newDisplayName || '',
        pixKey: newPixKey || '',
        pixName: newPixName || '',
        pixBank: newPixBank || '',
        profilePicture: newProfilePicture || null,
        uid: user.uid,
        email: user.email,
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, updateData, { merge: true });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Erro ao salvar configurações. " + (err instanceof Error ? err.message : ""));
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
    } catch (err: unknown) {
      console.error("Email Login Error:", err);
      const error = err as { code?: string };
      switch (error.code) {
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

  const logAction = async (
    type: SystemAction['type'], 
    description: string, 
    clientName: string, 
    loanId: string, 
    amount?: number,
    capitalAmount?: number,
    interestAmount?: number,
    paymentMethod?: 'DINHEIRO' | 'PIX'
  ) => {
    if (!user) return null;
    try {
      const actionData: Partial<SystemAction> & Record<string, unknown> = {
        type,
        description,
        clientName,
        loanId,
        amount: amount || 0,
        capitalAmount: capitalAmount || 0,
        interestAmount: interestAmount || 0,
        date: new Date().toISOString(),
        uid: user.uid,
        confirmed: type === 'payment_received' ? false : true
      };
      if (paymentMethod) actionData.paymentMethod = paymentMethod;
      const docRef = await addDoc(collection(db, 'actions'), actionData);
      return { id: docRef.id, ...actionData } as SystemAction;
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, 'actions');
      return null;
    }
  };

  const handleFirestoreError = (err: unknown, type: OperationType, path: string) => {
    const errInfo: FirestoreErrorInfo = {
      error: err instanceof Error ? err.message : String(err),
      operationType: type,
      path,
      authInfo: {
        userId: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || null,
        emailVerified: auth.currentUser?.emailVerified || false,
        isAnonymous: auth.currentUser?.isAnonymous || false,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || null,
          email: p.email || null
        })) || []
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
    
    const loanData = {
      clientName: newLoan.clientName,
      clientPhone: newLoan.clientPhone,
      clientAddress: newLoan.clientAddress,
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
        
        // If name, phone or address changed, bulk update all other loans for this client
        if (oldLoan && (
          oldLoan.clientName !== newLoan.clientName || 
          oldLoan.clientPhone !== newLoan.clientPhone ||
          oldLoan.clientAddress !== newLoan.clientAddress
        )) {
          const otherLoans = loans.filter(l => l.clientName === oldLoan.clientName && l.id !== editingLoanId);
          const batch = otherLoans.map(l => 
            updateDoc(doc(db, 'loans', l.id), {
              clientName: newLoan.clientName,
              clientPhone: newLoan.clientPhone,
              clientAddress: newLoan.clientAddress,
            })
          );
          await Promise.all(batch);
        }
      } else {
        const newDocData = {
          ...loanData,
          status: newLoan.status || 'Pendente',
          createdAt: serverTimestamp(),
          capitalPago: 0,
          jurosPagos: 0
        };
        const docRef = await addDoc(collection(db, 'loans'), newDocData);
        await logAction('loan_created', `Novo empréstimo para ${loanData.clientName}`, loanData.clientName, docRef.id, loanData.capital);
        if (newDocData.status === 'Agendado') {
          setViewingScheduleReceipt({ id: docRef.id, ...newDocData, createdAt: new Date().toISOString() } as unknown as Loan);
        }
      }
      
      setIsAdding(false);
      setEditingLoanId(null);
      setNewLoan({
        clientName: '',
        clientPhone: '',
        clientAddress: '',
        capital: '',
        interestRate: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        status: 'Pendente'
      });
    } catch (err) {
      handleFirestoreError(err, editingLoanId ? OperationType.UPDATE : OperationType.CREATE, 'loans');
    }
  };

  const activateLoan = async (loan: Loan) => {
    try {
      await updateDoc(doc(db, 'loans', loan.id), {
        status: 'Pendente',
        date: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      });
      await logAction('loan_updated', `Empréstimo efetivado para ${loan.clientName}`, loan.clientName, loan.id, loan.capital);
      setActiveTab('Empréstimos');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${loan.id}`);
    }
  };

  const sendWhatsAppCollection = (loan: Loan) => {
    if (!loan.clientPhone) {
      alert('Cliente não possui telefone cadastrado.');
      return;
    }

    const cleanPhone = loan.clientPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // Use only first name
    const firstName = (loan.clientName || 'Cliente').trim().split(' ')[0];
    
    // Calculate interest for renewal option
    const interestAmount = loan.capital * loan.interestRate;
    
    const message = `Olá ${firstName}, passando para lembrar do vencimento do seu empréstimo no valor de R$ ${loan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\n` +
      `Caso prefira, você pode pagar apenas os juros de R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para renovar por mais 30 dias.\n\n` +
      (userProfile?.pixKey ? `Chave Pix para pagamento:\n${userProfile.pixKey}\n${userProfile.pixName || ''}` : '');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoanId(loan.id);
    setNewLoan({
      clientName: loan.clientName,
      clientPhone: loan.clientPhone || '',
      clientAddress: loan.clientAddress || '',
      capital: loan.capital.toString(),
      interestRate: (loan.interestRate * 100).toString(),
      date: loan.date,
      dueDate: loan.dueDate,
    });
    setIsAdding(true);
  };

  const handleAmortization = async (method?: 'DINHEIRO' | 'PIX') => {
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
      
      const methodText = method ? ` via ${method}` : '';
      const description = `Amortização de capital: R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${methodText}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + amount;
        const newCapitalAmount = (lastAction.capitalAmount || 0) + amount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          capitalAmount: newCapitalAmount,
          description: newDescription,
          date: new Date().toISOString(),
          paymentMethod: method || null
        });
        action = { ...lastAction, amount: newAmount, capitalAmount: newCapitalAmount, description: newDescription, paymentMethod: method };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, amount, amount, 0, method);
      }

      setAmortizationAmount('');
      if (action) setLastAction(action);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const handleInterestPayment = async (method?: 'DINHEIRO' | 'PIX') => {
    if (!payingLoan) return;
    const today = startOfDay(new Date());
    let currentDueDate: Date;
    try {
      currentDueDate = toDate(payingLoan.dueDate) || today;
    } catch {
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

      const methodText = method ? ` via ${method}` : '';
      const description = `Pagamento de juros: R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${methodText}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + interestAmount;
        const newInterestAmount = (lastAction.interestAmount || 0) + interestAmount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          interestAmount: newInterestAmount,
          description: newDescription,
          date: new Date().toISOString(),
          paymentMethod: method || null
        });
        action = { ...lastAction, amount: newAmount, interestAmount: newInterestAmount, description: newDescription, paymentMethod: method };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, interestAmount, 0, interestAmount, method);
      }

      if (action) setLastAction(action);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const handleRenewLoan = async (method?: 'DINHEIRO' | 'PIX') => {
    if (!payingLoan) return;
    const today = startOfDay(new Date());
    let currentDueDate: Date;
    try {
      currentDueDate = toDate(payingLoan.dueDate) || today;
    } catch {
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

      const methodText = method ? ` via ${method}` : '';
      const description = `Renovação com pagamento de juros: R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${methodText}`;
      let action: SystemAction | null = null;

      if (lastAction && lastAction.loanId === payingLoan.id) {
        const newAmount = (lastAction.amount || 0) + interestAmount;
        const newInterestAmount = (lastAction.interestAmount || 0) + interestAmount;
        const newDescription = `${lastAction.description} + ${description}`;
        await updateDoc(doc(db, 'actions', lastAction.id), {
          amount: newAmount,
          interestAmount: newInterestAmount,
          description: newDescription,
          date: new Date().toISOString(),
          paymentMethod: method || null
        });
        action = { ...lastAction, amount: newAmount, interestAmount: newInterestAmount, description: newDescription, paymentMethod: method };
      } else {
        action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, interestAmount, 0, interestAmount, method);
      }

      if (action) setLastAction(action);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const handlePayoffLoan = async (method?: 'DINHEIRO' | 'PIX') => {
    if (!payingLoan) return;
    
    const payoffAmount = payingLoan.totalBruto;
    const interestAmount = payingLoan.totalBruto - payingLoan.capital;
    const capitalAmount = payingLoan.capital;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        status: 'Pago',
        capital: 0,
        totalBruto: 0,
        capitalPago: (payingLoan.capitalPago || 0) + capitalAmount,
        jurosPagos: (payingLoan.jurosPagos || 0) + interestAmount
      });

      const methodText = method ? ` via ${method}` : '';
      const description = `Quitação Total: R$ ${payoffAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Capital: R$ ${capitalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} + Juros: R$ ${interestAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${methodText})`;
      
      const action = await logAction('payment_received', description, payingLoan.clientName, payingLoan.id, payoffAmount, capitalAmount, interestAmount, method);

      if (action) setLastAction(action);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${payingLoan.id}`);
    }
  };

  const deleteLoan = async (id: string) => {
    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: 'Excluir Empréstimo',
      message: 'Tem certeza que deseja excluir este empréstimo e todo o seu histórico? Você deve confirmar sua senha.',
      onConfirm: async (password?: string) => {
        if (!user || !user.email || !password) {
          setConfirmError("A senha é obrigatória.");
          return;
        }

        setIsVerifyingPassword(true);
        setConfirmError(null);

        try {
          // Verify password
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);

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
        } catch (err: unknown) {
          const error = err as { code?: string };
          console.error("Re-auth Error:", error);
          if (error.code === 'auth/wrong-password') {
            setConfirmError("Senha incorreta.");
          } else {
            setConfirmError("Erro ao verificar senha.");
          }
        } finally {
          setIsVerifyingPassword(false);
        }
      }
    });
  };

  const clearHistory = async () => {
    if (!user || actions.length === 0) return;
    
    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: 'Limpar Histórico',
      message: 'Deseja excluir permanentemente todo o histórico de transações? Você deve confirmar sua senha para prosseguir.',
      onConfirm: async (password?: string) => {
        if (!user || !user.email || !password) {
          setConfirmError("A senha é obrigatória.");
          return;
        }

        setIsVerifyingPassword(true);
        setConfirmError(null);

        try {
          // Verify password
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);

          const q = query(collection(db, 'actions'), where('uid', '==', user.uid));
          const snapshot = await getDocs(q);
          const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletions);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          console.error("Clear History Error:", err);
          const error = err as { code?: string };
          if (error.code === 'auth/wrong-password') {
            setConfirmError("Senha incorreta.");
          } else {
            setConfirmError("Erro ao processar solicitação.");
          }
        } finally {
          setIsVerifyingPassword(false);
        }
      }
    });
  };

  const deleteAction = async (id: string) => {
    const action = actions.find(a => a.id === id);
    if (!action) return;

    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: 'Excluir Registro',
      message: 'Para excluir este registro e estornar valores, você deve confirmar sua senha de acesso.',
      onConfirm: async (password?: string) => {
        if (!user || !user.email || !password) {
          setConfirmError("A senha é obrigatória.");
          return;
        }

        setIsVerifyingPassword(true);
        setConfirmError(null);

        try {
          // Verify password
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);
        } catch (authErr: unknown) {
          const error = authErr as { code?: string };
          console.error("Re-auth Error:", error);
          if (error.code === 'auth/wrong-password') {
            setConfirmError("Senha incorreta.");
          } else {
            setConfirmError("Erro ao verificar acesso.");
          }
          setIsVerifyingPassword(false);
          return;
        }

        try {
          if (action.type === 'payment_received' && action.loanId) {
            const loan = loans.find(l => l.id === action.loanId);
            if (loan) {
              const amount = action.amount || 0;
              const isCapital = action.description.toLowerCase().includes('amortização');
              const isInterest = action.description.toLowerCase().includes('juros');

              const updates: Partial<Loan> = {};
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
        } catch (err: unknown) {
          const error = err as { code?: string };
          console.error("Re-auth Error:", error);
          if (error.code === 'auth/wrong-password') {
            setConfirmError("Senha incorreta.");
          } else {
            setConfirmError("Erro ao verificar senha.");
          }
        } finally {
          setIsVerifyingPassword(false);
        }
      }
    });
  };

  // --- Financial Calculations ---
  const filteredLoans = useMemo(() => {
    let result = loans;

    if (filterDate) {
      result = result.filter(l => {
        const d = toDate(l.dueDate);
        const day = d ? d.getDate() : 0;
        return day === parseInt(filterDate);
      });
    }

    if (activeTab === 'Empréstimos') {
      result = result.filter(l => l.status !== 'Pago' && l.status !== 'Agendado');
      if (!command.trim() && !showOnlyOverdue && !filterDate) {
        result = [...result]
          .sort((a, b) => (toDate(a.dueDate)?.getTime() || 0) - (toDate(b.dueDate)?.getTime() || 0))
          .slice(0, 5);
      }
    } else if (activeTab === 'Agendados') {
      result = result.filter(l => l.status === 'Agendado');
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

  const fullClients = useMemo(() => {
    const clientMap = new Map<string, { name: string, phone: string, address: string, totalCapital: number, loanCount: number, activeDebt: number }>();
    
    const sortedLoans = [...loans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedLoans.forEach(loan => {
      const existing = clientMap.get(loan.clientName) || { 
        name: loan.clientName, 
        phone: loan.clientPhone || '', 
        address: loan.clientAddress || '',
        totalCapital: 0, 
        loanCount: 0, 
        activeDebt: 0 
      };

      if (loan.status !== 'Agendado') {
        existing.totalCapital += loan.capital + (loan.capitalPago || 0);
        existing.loanCount += 1;
        if (loan.status !== 'Pago') {
          existing.activeDebt += loan.totalBruto;
        }
      }
      
      if (loan.clientPhone) existing.phone = loan.clientPhone;
      if (loan.clientAddress) existing.address = loan.clientAddress;
      
      clientMap.set(loan.clientName, existing);
    });
    
    return Array.from(clientMap.values());
  }, [loans]);

  const clients = useMemo(() => {
    let result = [...fullClients];
    
    if (filterDate) {
      const dateInt = parseInt(filterDate);
      result = result.filter(c => 
        loans.some(l => l.clientName === c.name && (toDate(l.dueDate)?.getDate() || 0) === dateInt)
      );
    }
    
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
    
    return result.sort((a, b) => b.activeDebt - a.activeDebt);
  }, [fullClients, command, filterDate, loans]);

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
      result = result.filter(a => (a.capitalAmount !== undefined && a.capitalAmount > 0) || a.description.toLowerCase().includes('capital') || a.description.toLowerCase().includes('amortização') || a.description.toLowerCase().includes('quitação'));
    }
    if (showOnlyInterest) {
      result = result.filter(a => (a.interestAmount !== undefined && a.interestAmount > 0) || a.description.toLowerCase().includes('juros'));
    }
    return result;
  }, [filteredActions, showOnlyCapital, showOnlyInterest]);

  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => l.status !== 'Pago' && l.status !== 'Agendado');
    
    const capitalLiberado = activeLoans
      .reduce((acc, curr) => acc + curr.capital, 0);
    
    // Calculate received values based on actions since last closure
    const closureDate = userProfile?.lastClosureDate ? toDate(userProfile.lastClosureDate) : null;
    const periodActions = actions.filter(a => {
      if (a.type !== 'payment_received') return false;
      const d = toDate(a.date);
      if (!closureDate || !d) return true;
      return d > closureDate;
    });

    const capitalRecebido = periodActions
      .reduce((acc, curr) => acc + (curr.capitalAmount !== undefined && curr.capitalAmount > 0 ? (curr.capitalAmount || 0) : (curr.description.toLowerCase().includes('capital') || curr.description.toLowerCase().includes('amortização') || curr.description.toLowerCase().includes('quitação') ? (curr.amount || 0) : 0)), 0);
    
    const jurosRealizados = periodActions
      .reduce((acc, curr) => acc + (curr.interestAmount !== undefined && curr.interestAmount > 0 ? (curr.interestAmount || 0) : (curr.description.toLowerCase().includes('juros') ? (curr.amount || 0) : 0)), 0);
    
    const overdueLoans = activeLoans.filter(l => l.status === 'Atrasado' || isOverdue(l));
    const atrasado = overdueLoans.reduce((acc, curr) => acc + curr.totalBruto, 0);
    const atrasadosCount = overdueLoans.length;
    
    // Calculate total unique clients
    const totalClients = new Set(loans.map(l => l.clientName)).size;
    
    return {
      capitalLiberado,
      capitalRecebido,
      jurosRealizados,
      atrasado,
      atrasadosCount,
      totalClients
    };
  }, [loans, actions, userProfile]);

  const monthlyReportStats = useMemo(() => {
    const periodActions = actions.filter(a => {
      const d = toDate(a.date);
      return d && d.getMonth() === reportMonth && d.getFullYear() === reportYear;
    });

    const loansCreatedInPeriod = loans.filter(l => {
      const d = toDate(l.createdAt || l.date);
      return d && d.getMonth() === reportMonth && d.getFullYear() === reportYear && l.status !== 'Agendado';
    });

    const totalLent = loansCreatedInPeriod.reduce((acc, curr) => acc + curr.capital, 0);
    
    const totalPayments = periodActions
      .filter(a => a.type === 'payment_received')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const capitalPayments = periodActions
      .filter(a => a.type === 'payment_received')
      .reduce((acc, curr) => acc + (curr.capitalAmount !== undefined && curr.capitalAmount > 0 ? (curr.capitalAmount || 0) : (curr.description.toLowerCase().includes('capital') || curr.description.toLowerCase().includes('amortização') || curr.description.toLowerCase().includes('quitação') ? (curr.amount || 0) : 0)), 0);

    const interestPayments = periodActions
      .filter(a => a.type === 'payment_received')
      .reduce((acc, curr) => acc + (curr.interestAmount !== undefined && curr.interestAmount > 0 ? (curr.interestAmount || 0) : (curr.description.toLowerCase().includes('juros') ? (curr.amount || 0) : 0)), 0);

    // Outstanding balance is everything not paid yet as of now
    const currentOutstanding = loans
      .filter(l => l.status !== 'Pago')
      .reduce((acc, curr) => acc + (curr.totalBruto - (curr.capitalPago || 0)), 0);

    return {
      totalLent,
      totalPayments,
      capitalPayments,
      interestPayments,
      currentOutstanding,
      loanCount: loansCreatedInPeriod.length,
      paymentCount: periodActions.filter(a => a.type === 'payment_received').length
    };
  }, [actions, loans, reportMonth, reportYear]);

  const confirmAction = async (actionId: string) => {
    try {
      await updateDoc(doc(db, 'actions', actionId), {
        confirmed: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `actions/${actionId}`);
    }
  };

  const notifications = useMemo(() => {
    const list: {
      id: string;
      type: 'overdue' | 'upcoming' | 'pending_payment';
      title: string;
      message: string;
      date: string;
      item: Loan | SystemAction;
    }[] = [];
    
    // Dependencies on lastCheckDate ensures this is recalculated when day changes
    // Removed unused _dummy variable

    // Overdue Loans
    loans.forEach(l => {
      if (l.status === 'Atrasado' || isOverdue(l)) {
        list.push({
          id: `overdue-${l.id}`,
          type: 'overdue',
          title: 'Nexus: Pagamento em Atraso',
          message: `Identificamos inadimplência no contrato para ${l.clientName} (Vencido em ${safeFormatDate(l.dueDate, 'dd/MM/yyyy')}).`,
          date: l.dueDate,
          item: l
        });
      } else if (l.status === 'Pendente') {
        const days = getDaysDiff(l.dueDate);
        if (days >= 0 && days <= 3) {
          list.push({
            id: `upcoming-${l.id}`,
            type: 'upcoming',
          title: days === 0 ? 'Nexus: Vencimento Hoje' : 'Nexus: Vencimento Próximo',
          message: `O contrato para ${l.clientName} atinge o vencimento ${days === 0 ? 'hoje' : `em ${days} dias`}. Favor conferir recebimento.`,
            date: l.dueDate,
            item: l
          });
        }
      } else if (l.status === 'Agendado') {
        const days = getDaysDiff(l.date);
        if (days >= 0 && days <= 3) {
          list.push({
            id: `scheduled-${l.id}`,
            type: 'upcoming',
            title: days === 0 ? 'Nexus: Liberação de Crédito' : 'Nexus: Agendamento Próximo',
            message: `A liberação de crédito para ${l.clientName} deve ser efetivada ${days === 0 ? 'hoje' : `em ${days} dias`}.`,
            date: l.date,
            item: l
          });
        }
      }
    });

    // Pending Payments
    actions.forEach(a => {
      if (a.type === 'payment_received' && a.confirmed === false) {
        list.push({
          id: `payment-${a.id}`,
          type: 'pending_payment',
          title: 'Nexus: Conferência de Lançamento',
          message: `O recebimento de R$ ${a.amount?.toLocaleString('pt-BR')} para ${a.clientName} aguarda validação no sistema.`,
          date: a.date,
          item: a
        });
      }
    });

    // Sort by type priority then date
    const finalResult = list.filter(n => !readNotificationIds.includes(n.id));

    return finalResult.sort((a, b) => {
      const priority = { overdue: 0, pending_payment: 1, upcoming: 2 };
      if (priority[a.type] !== priority[b.type]) {
        return priority[a.type] - priority[b.type];
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [loans, actions, readNotificationIds]);

  useEffect(() => {
    if (isNativeNotificationsEnabled && notifications.length > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        const newlySent: string[] = [];
        
        notifications.forEach(n => {
          if (!sentNativeNotificationIds.includes(n.id)) {
            // Check if it's important enough for an OS push (e.g., vencimento ou atraso)
            const isImportant = n.type === 'overdue' || n.type === 'pending_payment' || 
                              n.title.includes('Hoje') || n.title.includes('Liberação');
            
            if (isImportant) {
              const notificationTitle = n.title;

              new Notification(notificationTitle, {
                body: n.message,
                icon: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop',
                badge: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop',
                silent: false,
                tag: n.id // Prevent multiple of the same
              });
              newlySent.push(n.id);
            }
          }
        });

        if (newlySent.length > 0) {
          setSentNativeNotificationIds(prev => {
            const next = [...prev, ...newlySent];
            localStorage.setItem('nexus_sent_notifications_native', JSON.stringify(next));
            return next;
          });
        }
      }
    }
  }, [notifications, isNativeNotificationsEnabled, sentNativeNotificationIds]);

  const handleCloseMonth = async () => {
    if (!user) return;
    
    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: 'Fechar Caixa Mensal',
      message: 'Ao fechar o caixa, os valores de "Capital Recebido" e "Juros Realizados" do dashboard serão zerados para o início de um novo ciclo. Esta ação não apaga o histórico de transações. Confirme sua senha para prosseguir.',
      onConfirm: async (password?: string) => {
        if (!user || !user.email || !password) {
          setConfirmError("A senha é obrigatória.");
          return;
        }

        setIsVerifyingPassword(true);
        setConfirmError(null);

        try {
          // Verify password
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(user, credential);

          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            lastClosureDate: new Date().toISOString()
          });

          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          const error = err as { code?: string };
          console.error("Close Month Error:", error);
          if (error.code === 'auth/wrong-password') {
            setConfirmError("Senha incorreta.");
          } else {
            setConfirmError("Erro ao processar fechamento.");
          }
        } finally {
          setIsVerifyingPassword(false);
        }
      }
    });
  };

  // --- Render Helpers ---
  if (!isAuthReady) return (
    <div className={cn(
      "flex flex-col items-center justify-center h-screen gap-6 transition-colors duration-500",
      theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-black text-white"
    )}>
      <div className="w-12 h-12 border-[1px] border-brand-primary/30 border-t-brand-primary rounded-full animate-spin shadow-[0_0_30px_rgba(212,175,55,0.2)]" />
      <span className="text-slate-500 font-black uppercase tracking-[0.4em] text-[9px]">Sincronizando Sistema</span>
    </div>
  );

  if (!user) {
    const splashIsDark = theme === 'dark';
    
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden transition-colors duration-700",
        splashIsDark ? "bg-black" : "bg-slate-50"
      )}>
        {/* Background Glows */}
        <div className={cn(
          "absolute top-[-15%] left-[-15%] w-[60%] h-[60%] blur-[180px] rounded-full",
          splashIsDark ? "bg-brand-primary/10" : "bg-brand-primary/20"
        )} />
        <div className={cn(
          "absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] blur-[180px] rounded-full",
          splashIsDark ? "bg-brand-accent/5" : "bg-brand-accent/15"
        )} />
        
        <div 
          className={cn(
            "max-w-md w-full glass-card p-8 md:p-14 text-center relative z-10",
            !splashIsDark && "bg-white/80 border-slate-200 shadow-xl"
          )}
        >
            <div className="flex justify-center mb-10">
            <div className="p-1 bg-gradient-to-tr from-brand-primary/40 to-transparent rounded-[28px] shadow-2xl relative group">
              <div className="absolute inset-0 bg-brand-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <img 
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop" 
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] object-cover transition-all",
                  splashIsDark ? "grayscale" : ""
                )} 
                alt="Nexus Logo"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <div className="space-y-3 mb-10">
            <h1 className={cn(
              "text-2xl font-bold tracking-[0.1em] uppercase",
              splashIsDark ? "text-white" : "text-slate-900"
            )}>Nexus Private</h1>
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
                      placeholder="Email"
                      value={email || ""}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(
                        "w-full rounded-xl py-4 pl-12 pr-4 text-base transition-colors border focus:outline-none",
                        splashIsDark 
                          ? "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600 focus:border-brand-primary/50" 
                          : "bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand-primary"
                      )}
                      required
                    />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={password || ""}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(
                        "w-full rounded-xl py-4 pl-12 pr-4 text-base transition-colors border focus:outline-none",
                        splashIsDark 
                          ? "bg-white/[0.03] border-white/10 text-white placeholder:text-slate-600 focus:border-brand-primary/50" 
                          : "bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-brand-primary"
                      )}
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

  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-brand-primary/20 overflow-x-hidden transition-colors duration-500",
      isDark ? "bg-black text-slate-300" : "bg-slate-50 text-slate-700"
    )}>
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={cn(
          "absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[180px] transition-all duration-1000",
          isDark ? "bg-brand-primary/10" : "bg-brand-primary/15"
        )} />
        <div className={cn(
          "absolute top-1/2 -right-32 w-[500px] h-[500px] rounded-full blur-[160px] transition-all duration-1000",
          isDark ? "bg-brand-accent/5" : "bg-brand-accent/10"
        )} />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 border-b transition-colors",
        isDark ? "bg-black border-white/[0.03]" : "bg-white border-slate-200"
      )}>
        <div className="w-full px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-0.5 bg-gradient-to-br from-brand-primary/30 to-transparent rounded-2xl">
              {userProfile?.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl object-cover transition-all" 
                  alt="Profile"
                />
              ) : (
                <img 
                  src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=64&h=64&fit=crop" 
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover transition-all",
                    isDark ? "grayscale" : ""
                  )} 
                  alt="Nexus Logo"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <div>
              <h1 className={cn(
                "text-sm sm:text-lg font-bold tracking-[0.05em] sm:tracking-[0.1em] leading-none transition-colors",
                isDark ? "text-white" : "text-slate-900"
              )}>Nexus Private</h1>
              <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-primary font-black">crédito e gestão</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden lg:flex flex-col items-end">
              <span className={cn(
                "text-sm font-bold transition-colors",
                isDark ? "text-white" : "text-slate-900"
              )}>{user.displayName}</span>
              <span className="text-xs text-slate-500 font-medium">{user.email}</span>
            </div>
            <div className={cn(
              "h-8 w-px hidden lg:block",
              isDark ? "bg-white/10" : "bg-slate-200"
            )} />
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => {
                  const newValue = !isPrivacyMode;
                  setIsPrivacyMode(newValue);
                  localStorage.setItem('nexus_privacy_mode', String(newValue));
                }}
                className="p-2 sm:p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl sm:rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-primary/20"
                title={isPrivacyMode ? "Mostrar Números" : "Ocultar Números"}
              >
                {isPrivacyMode ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={cn(
                    "p-2 sm:p-3 hover:bg-brand-primary/10 rounded-xl sm:rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-primary/20 relative group",
                    isNotificationsOpen ? "text-brand-primary bg-brand-primary/10 border-brand-primary/20" : "text-slate-400"
                  )}
                  title="Notificações"
                >
                  <Bell className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-transform", isNotificationsOpen && "rotate-12")} />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-brand-danger rounded-full border-2 border-white dark:border-black animate-pulse" />
                  )}
                </button>

                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-[45]" onClick={() => setIsNotificationsOpen(false)} />
                    <div className={cn(
                      "absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-[400px] overflow-y-auto rounded-3xl border shadow-2xl z-[50] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
                      isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                    )}>
                      <div className="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-inherit z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Notificações</span>
                        {notifications.length > 0 && (
                          <span className="bg-brand-danger text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg shadow-brand-danger/20">
                            {notifications.length} Alertas
                          </span>
                        )}
                      </div>
                      
                      <div className="divide-y divide-white/5 pb-2">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Check className="w-6 h-6" />
                            </div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tudo em dia!</p>
                            <p className="text-[10px] text-slate-500 mt-1">Nenhum alerta pendente no momento.</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="p-4 hover:bg-white/[0.02] transition-colors relative">
                              <div className="flex items-start gap-4">
                                <div className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                                  n.type === 'overdue' ? "bg-brand-danger/10 text-brand-danger" :
                                  n.type === 'upcoming' ? "bg-brand-primary/10 text-brand-primary" :
                                  "bg-brand-accent/10 text-brand-accent"
                                )}>
                                  {n.type === 'overdue' ? <AlertCircle className="w-5 h-5" /> :
                                   n.type === 'upcoming' ? <Clock className="w-4 h-4" /> :
                                   <History className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <h4 className={cn("text-[10px] font-black underline decoration-2 decoration-current/10 underline-offset-4 uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>{n.title}</h4>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">{safeFormatDate(n.date, 'dd/MM')}</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-slate-500 mt-1 mb-3">{n.message}</p>
                                  
                                  <div className="flex items-center gap-2">
                                    {n.type === 'pending_payment' ? (
                                      <button 
                                        onClick={() => {
                                          confirmAction(n.item.id);
                                          markNotificationAsRead(n.id);
                                          setIsNotificationsOpen(false);
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest bg-brand-accent text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                      >
                                        <Check className="w-3 h-3" /> Confirmar
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          if (n.item.status === 'Agendado') {
                                            setActiveTab('Agendados');
                                            setShowOnlyOverdue(false);
                                          } else {
                                            setActiveTab('Empréstimos');
                                            if (n.type === 'overdue') setShowOnlyOverdue(true);
                                          }
                                          setCommand(n.item.clientName);
                                          markNotificationAsRead(n.id);
                                          setIsNotificationsOpen(false);
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest bg-brand-primary text-black px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                      >
                                        Ver Detalhes <ChevronRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => {
                  setIsSettingsOpen(true);
                  setNewDisplayName(userProfile?.displayName || user?.displayName || '');
                  setNewPixKey(userProfile?.pixKey || '');
                  setNewPixName(userProfile?.pixName || '');
                  setNewPixBank(userProfile?.pixBank || '');
                  setNewProfilePicture(userProfile?.profilePicture || null);
                }}
                className="p-2 sm:p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl sm:rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-primary/20"
                title="Configurações"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            title="Capital Liberado" 
            value={isPrivacyMode ? 'R$ ••••' : `R$ ${stats.capitalLiberado.toLocaleString('pt-BR')}`} 
            icon={<DollarSign className="w-5 h-5" />}
            color="primary"
            trend="Ativo"
            isDark={isDark}
          />
          <StatCard 
            title="Capital Recebido" 
            value={isPrivacyMode ? 'R$ ••••' : `R$ ${stats.capitalRecebido.toLocaleString('pt-BR')}`} 
            icon={<Wallet className="w-5 h-5" />}
            color="success"
            trend="Liquidado"
            isDark={isDark}
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
            value={isPrivacyMode ? 'R$ ••••' : `R$ ${stats.jurosRealizados.toLocaleString('pt-BR')}`} 
            icon={<TrendingUp className="w-5 h-5" />}
            color="success"
            trend="Lucro"
            isDark={isDark}
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
            value={maskValue(stats.atrasadosCount)} 
            icon={<AlertCircle className="w-5 h-5" />}
            color="danger"
            trend="Risco"
            isDark={isDark}
            onClick={() => {
              setActiveTab('Empréstimos');
              setShowOnlyOverdue(true);
              setFilterDate('');
              setCommand('');
            }}
          />
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className={cn(
                "flex items-center p-1.5 rounded-2xl border w-full sm:w-fit relative flex-nowrap transition-colors",
                isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-slate-200/50 border-slate-300/50"
              )}>
                <nav className="flex-1 flex items-center overflow-x-auto no-scrollbar scroll-smooth">
                  <div className="flex items-center flex-nowrap min-w-max">
                    {(['Empréstimos', 'Agendados', 'Clientes'] as const).map((tab) => (
                      <button
                        key={tab}
                        id={`tab-btn-${tab}`}
                        onClick={() => {
                          setActiveTab(tab);
                          setShowOnlyOverdue(false);
                          setShowOnlyCapital(false);
                          setShowOnlyInterest(false);
                          setFilterDate('');
                          setCommand('');
                          setIsMoreMenuOpen(false);
                        }}
                        className={cn(
                          "px-4 sm:px-6 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] transition-all duration-300 whitespace-nowrap",
                          activeTab === tab 
                            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" 
                            : cn(isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-900")
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </nav>

                {/* More Options Menu - Outside scrolling area to prevent clipping */}
                <div className={cn("relative ml-1 shrink-0 border-l pl-1.5 flex items-center transition-colors", isDark ? "border-white/5" : "border-slate-300")}>
                  <button
                    id="more-options-btn"
                    onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                    className={cn(
                      "p-3 rounded-xl transition-all duration-300 flex items-center justify-center",
                      (['Transações', 'Histórico', 'Pagamento', 'Relatórios'] as string[]).includes(activeTab)
                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                        : cn(isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-300/50")
                    )}
                    aria-label="Mais Opções"
                  >
                    <MoreVertical className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>

                  {isMoreMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]" 
                        onClick={() => setIsMoreMenuOpen(false)} 
                      />
                      <div className={cn(
                        "absolute right-0 top-full mt-3 w-56 border rounded-2xl shadow-2xl overflow-hidden z-[70] animate-in fade-in slide-in-from-top-2 duration-200 transition-colors",
                        isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
                      )}>
                        <div className={cn("p-3 border-b transition-colors", isDark ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50")}>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-2">Menu Principal</span>
                        </div>
                        <div className="py-1">
                          {(['Transações', 'Histórico', 'Pagamento', 'Relatórios'] as const).map((tab) => (
                            <button
                              key={tab}
                              id={`more-tab-${tab}`}
                              onClick={() => {
                                setActiveTab(tab);
                                setShowOnlyOverdue(false);
                                setShowOnlyCapital(false);
                                setShowOnlyInterest(false);
                                setFilterDate('');
                                setCommand('');
                                setIsMoreMenuOpen(false);
                              }}
                              className={cn(
                                "w-full px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.15em] transition-all border-b last:border-0 flex items-center justify-between group transition-colors",
                                isDark ? "border-white/5" : "border-slate-100",
                                activeTab === tab 
                                  ? "bg-brand-primary/10 text-brand-primary" 
                                  : cn(isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50")
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {tab === 'Transações' && <Wallet className="w-4 h-4" />}
                                {tab === 'Histórico' && <History className="w-4 h-4" />}
                                {tab === 'Pagamento' && <QrCode className="w-4 h-4" />}
                                {tab === 'Relatórios' && <BarChart3 className="w-4 h-4" />}
                                <span>{tab}</span>
                              </div>
                              {activeTab === tab && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
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
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={() => {
                    setEditingLoanId(null);
                    setNewLoan({
                      clientName: '',
                      clientPhone: '',
                      clientAddress: '',
                      capital: '',
                      interestRate: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                      status: 'Agendado'
                    });
                    setIsAdding(true);
                  }}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] hover:-translate-y-0.5 active:translate-y-0",
                    isDark ? "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <Clock className="w-4 h-4 text-brand-primary" />
                  Agendar
                </button>
                <button 
                  onClick={() => {
                    setEditingLoanId(null);
                    setNewLoan({
                      clientName: '',
                      clientPhone: '',
                      clientAddress: '',
                      capital: '',
                      interestRate: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                      status: 'Pendente'
                    });
                    setIsAdding(true);
                  }}
                  className="bg-brand-primary text-slate-950 px-6 py-3 rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] hover:-translate-y-0.5 active:translate-y-1 hover:brightness-105 border border-brand-primary"
                >
                  <Plus className="w-5 h-5" />
                  Novo Empréstimo
                </button>
              </div>
            )}

            {activeTab === 'Histórico' && actions.length > 0 && (
              <button 
                onClick={clearHistory}
                className="bg-gradient-to-r from-brand-danger to-rose-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-brand-danger/25 hover:shadow-brand-danger/40 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Trash2 className="w-5 h-5" />
                <span>Limpar Histórico</span>
              </button>
            )}
          </div>

          <div className={cn("glass-card overflow-hidden transition-colors", !isDark && "bg-white border-slate-200 shadow-xl")}>
              {(activeTab === 'Clientes' || activeTab === 'Transações' || activeTab === 'Empréstimos' || activeTab === 'Histórico' || activeTab === 'Agendados') && (
              <div className={cn("p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors", isDark ? "border-white/[0.03]" : "border-slate-100")}>
                <div className="relative group flex-1">
                  <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-focus-within:text-brand-primary transition-colors" />
                    <div className={cn("h-4 w-px transition-colors", isDark ? "bg-white/10" : "bg-slate-200")} />
                  </div>
                  <input 
                    type="text"
                    placeholder={`Buscar em ${activeTab.toLowerCase()}...`}
                    className={cn(
                      "w-full rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-12 sm:pl-16 pr-10 sm:pr-12 transition-all text-base font-bold tracking-tight border focus:border-brand-primary/30 focus:outline-none",
                      isDark 
                        ? "bg-white/[0.02] text-white placeholder:text-slate-600 focus:bg-white/[0.04] border-white/[0.05]" 
                        : "bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white border-slate-200"
                    )}
                    value={command || ""}
                    onChange={(e) => {
                      setCommand(e.target.value);
                    }}
                  />
                  {command && (
                    <button 
                      onClick={() => setCommand('')}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-900 transition-colors"
                      title="Limpar pesquisa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 px-1">
                  {activeTab === 'Clientes' && (
                    <div className={cn("flex flex-col items-end px-4 border-r transition-colors", isDark ? "border-white/10" : "border-slate-200")}>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clientes</span>
                      <span className="text-lg font-bold text-brand-primary">{stats.totalClients}</span>
                    </div>
                  )}

                  <div className={cn("flex items-center gap-2 border rounded-xl px-3 py-1.5 focus-within:border-brand-primary/50 transition-colors", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <select 
                      className={cn(
                        "bg-transparent text-base font-bold uppercase tracking-widest focus:outline-none cursor-pointer",
                        isDark ? "text-white [color-scheme:dark]" : "text-slate-900 [color-scheme:light]"
                      )}
                      value={filterDate || ""}
                      onChange={(e) => {
                        setFilterDate(e.target.value);
                      }}
                    >
                      <option value="" className={isDark ? "bg-slate-900" : "bg-white"}>Dia</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day.toString()} className={isDark ? "bg-slate-900" : "bg-white"}>
                          Dia {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div className="">
              {activeTab === 'Clientes' ? (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={cn("border-b transition-colors", isDark ? "bg-white/[0.01] border-white/[0.03]" : "bg-slate-50 border-slate-100")}>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Telefone</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Contratos</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Capital Total</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Dívida Ativa</th>
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y transition-colors", isDark ? "divide-white/[0.05]" : "divide-slate-100")}>
                        {clients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-medium">
                              {command.trim() ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                            </td>
                          </tr>
                        ) : (
                          clients.map((client, index) => (
                            <tr key={`client-${client.name}-${index}`} className={cn("group transition-colors", isDark ? "hover:bg-white/[0.01]" : "hover:bg-slate-50")}>
                              <td className={cn("px-8 py-6 font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>{client.name}</td>
                              <td className="px-8 py-6 text-slate-400 text-sm">{client.phone || '-'}</td>
                              <td className="px-8 py-6">
                                <button 
                                  onClick={() => setViewingClientLoans(client.name)}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 border transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest",
                                    isDark 
                                      ? "bg-white/5 text-slate-300 border-white/10 hover:bg-brand-primary/20 hover:text-brand-primary hover:border-brand-primary/30" 
                                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/20"
                                  )}
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>{client.loanCount} {client.loanCount === 1 ? 'Contrato' : 'Contratos'}</span>
                                </button>
                              </td>
                              <td className={cn("px-8 py-6 text-sm transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {client.totalCapital.toLocaleString('pt-BR')}</td>
                              <td className="px-8 py-6 text-brand-primary font-bold">R$ {client.activeDebt.toLocaleString('pt-BR')}</td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingLoanId(null);
                                      setNewLoan({
                                        clientName: client.name,
                                        clientPhone: client.phone || '',
                                        clientAddress: client.address || '',
                                        capital: '',
                                        interestRate: '',
                                        date: format(new Date(), 'yyyy-MM-dd'),
                                        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                                        status: 'Pendente'
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
                                        .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0))[0];
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {clients.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                        {command.trim() ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                      </div>
                    ) : (
                      clients.map((client, index) => (
                        <div key={`client-mobile-${client.name}-${index}`} className={cn("glass-card p-5 space-y-4 border transition-colors", isDark ? "border-white/5" : "bg-white border-slate-200 shadow-lg")}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={cn("font-bold text-lg leading-tight uppercase tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{client.name}</h3>
                              <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-widest">{client.phone || 'Sem Telefone'}</p>
                            </div>
                            <button 
                              onClick={() => setViewingClientLoans(client.name)}
                              className={cn("p-3 transition-colors rounded-xl border", isDark ? "bg-white/5 text-brand-primary border-white/10" : "bg-brand-primary/10 text-brand-primary border-brand-primary/20")}
                            >
                              <History className="w-5 h-5" />
                            </button>
                          </div>

                          <div className={cn("grid grid-cols-2 gap-4 pt-2 border-t transition-colors", isDark ? "border-white/5" : "border-slate-100")}>
                            <div>
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Contratos</span>
                              <div className={cn("font-bold text-sm tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{client.loanCount} ativos</div>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Capital Inv.</span>
                              <div className={cn("font-bold text-sm tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {client.totalCapital.toLocaleString('pt-BR')}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Dívida Ativa</span>
                              <div className="text-brand-primary font-black text-lg tracking-tight">R$ {client.activeDebt.toLocaleString('pt-BR')}</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => {
                                  setEditingLoanId(null);
                                  setNewLoan({
                                    clientName: client.name,
                                    clientPhone: client.phone || '',
                                    clientAddress: client.address || '',
                                    capital: '',
                                    interestRate: '',
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                                    status: 'Pendente'
                                  });
                                  setIsAdding(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-brand-primary/10 text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-widest border border-brand-primary/20 active:scale-95 transition-all"
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
                                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-500/20 active:scale-95 transition-all"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Recibo</span>
                              </button>
                              <button 
                                onClick={() => {
                                  const oldestActive = loans
                                    .filter(l => l.clientName === client.name && l.status !== 'Pago')
                                    .sort((a, b) => (toDate(a.dueDate)?.getTime() || 0) - (toDate(b.dueDate)?.getTime() || 0))[0];
                                  if (oldestActive) sendWhatsAppCollection(oldestActive);
                                  else alert('Este cliente não possui contratos ativos para cobrança.');
                                }}
                                className="p-3.5 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 active:scale-95 transition-all"
                                title="Cobrança WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  const latestLoan = loans
                                    .filter(l => l.clientName === client.name)
                                    .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0))[0];
                                  if (latestLoan) openEditModal(latestLoan);
                                }}
                                className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 active:scale-95 transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
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
                                className="p-3.5 bg-brand-danger/10 text-brand-danger rounded-xl border border-brand-danger/20 active:scale-95 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === 'Transações' ? (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
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
                            <tr key={action.id} className={cn("group transition-colors", isDark ? "hover:bg-white/[0.01]" : "hover:bg-slate-50")}>
                              <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                                {safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}
                              </td>
                              <td className={cn("px-8 py-4 font-bold text-xs transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                {action.clientName}
                              </td>
                              <td className="px-8 py-4 text-slate-400 text-xs italic">
                                {action.description}
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-brand-accent font-black text-xs">
                                    R$ {action.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  {action.paymentMethod && (
                                    <span className={cn(
                                      "text-[8px] font-black px-1.5 py-0.5 rounded-md w-fit uppercase tracking-tighter",
                                      action.paymentMethod === 'PIX' ? "bg-brand-primary/10 text-brand-primary" : "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                      {action.paymentMethod}
                                    </span>
                                  )}
                                </div>
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                      <div className="py-20 text-center glass-card">
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando...</span>
                          </div>
                      </div>
                    ) : filteredTransactions.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                         {command.trim() ? 'Nenhuma transação encontrada.' : 'Nenhuma transação registrada.'}
                      </div>
                    ) : (
                      filteredTransactions.map((action) => (
                        <div key={`trans-mobile-${action.id}`} className={cn("glass-card p-5 space-y-4 border transition-colors", isDark ? "border-white/5" : "bg-white border-slate-200 shadow-lg")}>
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">{safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}</span>
                              <h3 className={cn("font-bold text-sm leading-tight uppercase tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{action.clientName}</h3>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Valor</span>
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-brand-accent font-black text-sm">
                                  R$ {action.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {action.paymentMethod && (
                                  <span className={cn(
                                    "text-[7px] font-black px-1.5 py-0.5 rounded-md w-fit uppercase tracking-tighter",
                                    action.paymentMethod === 'PIX' ? "bg-brand-primary/10 text-brand-primary" : "bg-emerald-500/10 text-emerald-500"
                                  )}>
                                    {action.paymentMethod}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                            <p className="text-slate-400 text-[10px] italic leading-relaxed">{action.description}</p>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => setViewingReceipt(action)}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                              <FileText className="w-4 h-4" />
                              <span>Ver Recibo</span>
                            </button>
                            <button 
                              onClick={() => deleteAction(action.id)}
                              className="p-3 bg-brand-danger/10 text-brand-danger rounded-xl border border-brand-danger/20 active:scale-95 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === 'Pagamento' ? (
                <div className="p-12 flex flex-col items-center text-center">
                  <div id="printable-pix" className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-slate-900 mb-8 printable-content relative overflow-hidden">
                    {/* Background Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none -rotate-12">
                      <span className="text-[80px] font-black tracking-tighter whitespace-nowrap text-brand-primary opacity-10">Nexus Private</span>
                    </div>

                    <div className="flex flex-col items-center mb-8 relative z-10">
                      <div className="p-4 bg-white rounded-[32px] flex items-center justify-center mb-4 shadow-xl border border-slate-100">
                        {userProfile?.pixKey ? (
                          <QRCodeSVG 
                            value={generatePixPayload(
                              userProfile.pixKey, 
                              userProfile.pixName || 'Nexus Client', 
                              'SAO PAULO', 
                              0 // No defined amount
                            )} 
                            size={160}
                            level="H"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-black rounded-[24px] flex items-center justify-center">
                            <QrCode className="w-10 h-10 text-brand-primary" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Dados de Pagamento</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Nexus Private</p>
                    </div>

                    <div className="space-y-6 text-center relative z-10">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Chave PIX Registrada</span>
                        <p className="text-sm font-black text-slate-900 break-all select-all">
                          {userProfile?.pixKey || "NÃO CONFIGURADA"}
                        </p>
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
                        onClick={() => {
                          if (userProfile?.pixKey) {
                            // Set a temporary amount for the sharing template if none is active
                            if (!pendingPayment) {
                              setPendingPayment({ amount: 0, type: 'interest', label: 'Dados de Pagamento' });
                              setTimeout(() => {
                                shareAsPDF(false, 'image', 'pix-payment-share-template', userProfile.pixKey);
                                setPendingPayment(null);
                              }, 100);
                            } else {
                              shareAsPDF(false, 'image', 'pix-payment-share-template', userProfile.pixKey);
                            }
                          }
                        }}
                        disabled={isGeneratingPDF || !userProfile?.pixKey}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                      >
                      {isGeneratingPDF ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      <span>Compartilhar QR + Código</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (userProfile?.pixKey) {
                          navigator.clipboard.writeText(userProfile.pixKey);
                          setPixCopied(true);
                          setTimeout(() => setPixCopied(false), 2000);
                        }
                      }}
                      className={`p-4 rounded-2xl border transition-all ${pixCopied ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
                      title={pixCopied ? "Copiado!" : "Copiar Chave"}
                    >
                      {pixCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ) : activeTab === 'Relatórios' ? (
                <div className="p-6 sm:p-10 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className={cn("text-xl font-bold tracking-tight uppercase transition-colors", isDark ? "text-white" : "text-slate-900")}>Relatório Mensal</h2>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Visão geral do desempenho financeiro</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleCloseMonth}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Fechar Caixa
                      </button>

                      <div className={cn("flex items-center gap-2 border rounded-xl px-4 py-2 transition-colors", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <select 
                          className={cn(
                            "bg-transparent text-xs font-bold uppercase tracking-widest focus:outline-none cursor-pointer transition-colors",
                            isDark ? "text-white [color-scheme:dark]" : "text-slate-900 [color-scheme:light]"
                          )}
                          value={reportMonth}
                          onChange={(e) => setReportMonth(parseInt(e.target.value))}
                        >
                          {ptBrMonths.map((month, index) => (
                            <option key={month} value={index} className={isDark ? "bg-slate-900" : "bg-white"}>{month}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className={cn("flex items-center gap-2 border rounded-xl px-4 py-2 transition-colors", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm")}>
                        <select 
                          className={cn(
                            "bg-transparent text-xs font-bold uppercase tracking-widest focus:outline-none cursor-pointer transition-colors",
                            isDark ? "text-white [color-scheme:dark]" : "text-slate-900 [color-scheme:light]"
                          )}
                          value={reportYear}
                          onChange={(e) => setReportYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year} className={isDark ? "bg-slate-900" : "bg-white"}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div id="printable-report" className="space-y-8 printable-content">
                    <div className="report-page bg-white text-black font-sans shadow-none border-none">
                      {/* Clean Professional Header */}
                      <div className="flex justify-between items-start border-b border-slate-200 pb-10 mb-12">
                        <div className="space-y-1">
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{userProfile?.displayName || 'Nexus Private'}</h1>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Relatório Mensal de Performance</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <div className="text-[10px] font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl mb-3 uppercase tracking-widest border border-slate-100">
                             Ref: {ptBrMonths[reportMonth]} / {reportYear}
                           </div>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Emissão: {safeFormatDate(new Date().toISOString(), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="mb-14">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 mb-6 flex items-center gap-3">
                          <span className="w-2 h-2 bg-brand-primary rounded-full" />
                          Sumário Executivo
                        </h3>
                        <div className="bg-slate-50 border-l-4 border-brand-primary p-8 rounded-tr-3xl rounded-br-3xl">
                          <p className="text-sm leading-relaxed text-slate-700 font-medium">
                            Este documento oficial apresenta a consolidação das operações financeiras de <b>{userProfile?.displayName || 'Nexus Private'}</b> referente ao ciclo de <b>{ptBrMonths[reportMonth]} de {reportYear}</b>. 
                            Os dados aqui contidos refletem o movimento de capital liberado, as amortizações processadas e a colheita de rendimentos ativos sob gestão institucional. Esta análise visa fornecer transparência total sobre a liquidez e rentabilidade do portfólio no período.
                          </p>
                        </div>
                      </div>

                      {/* Clean Stats Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
                        {[
                          { label: 'Capital Liberado', value: monthlyReportStats.totalLent, sub: `${monthlyReportStats.loanCount} Contratos`, color: 'slate-900' },
                          { label: 'Total Recebido', value: monthlyReportStats.totalPayments, sub: `${monthlyReportStats.paymentCount} Transações`, color: 'emerald-600' },
                          { label: 'Lucro (Juros)', value: monthlyReportStats.interestPayments, sub: 'Rendimentos Reais', color: 'emerald-600' },
                          { label: 'Saldo Ativo', value: monthlyReportStats.currentOutstanding, sub: 'Em Aberto', color: 'slate-900' }
                        ].map((stat, i) => (
                          <div key={i} className="bg-white border border-slate-100 p-6 rounded-xl flex flex-col justify-between items-center text-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{stat.label}</span>
                            <div>
                              <div className={cn(
                                "text-xl font-black tracking-tight", 
                                stat.color === 'emerald-600' ? "text-emerald-600" : "text-slate-900"
                              )}>
                                R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider mt-1">{stat.sub}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Simplified Progress Section */}
                      <div className="mb-14 flex-grow">
                        <div className="max-w-xl mx-auto lg:mx-0">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 pb-4 border-b border-slate-100">Distribuição de Receita</h3>
                           <div className="space-y-10">
                             <div className="space-y-4">
                               <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em]">Amortização de Capital</span>
                                 <span className="text-xs font-black text-slate-900">{(monthlyReportStats.capitalPayments / (monthlyReportStats.totalPayments || 1) * 100).toFixed(1)}%</span>
                               </div>
                               <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-slate-900 rounded-full" style={{ width: `${(monthlyReportStats.capitalPayments / (monthlyReportStats.totalPayments || 1)) * 100}%` }} />
                               </div>
                             </div>
                             <div className="space-y-4">
                               <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em]">Rendimento de Juros</span>
                                 <span className="text-xs font-black text-brand-primary">{(monthlyReportStats.interestPayments / (monthlyReportStats.totalPayments || 1) * 100).toFixed(1)}%</span>
                               </div>
                               <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-brand-primary rounded-full" style={{ width: `${(monthlyReportStats.interestPayments / (monthlyReportStats.totalPayments || 1)) * 100}%` }} />
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>

                      {/* Professional Sign-off & Footer */}
                      <div className="mt-auto grid grid-cols-2 lg:grid-cols-3 gap-12 pt-12 border-t border-slate-200">
                        <div className="col-span-1 lg:col-span-2">
                           <div className="flex items-center gap-10">
                             <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-3">
                               <QrCode className="w-full h-full text-slate-200" />
                             </div>
                             <div className="space-y-2">
                               <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Controle de Autenticidade</p>
                               <p className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter max-w-[200px]">REF-{reportYear}{String(reportMonth + 1).padStart(2, '0')}-0229384-NXB-SECURE</p>
                               <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-2">Nexus Private Asset Management <br/> Divisão de Controle Interno</p>
                             </div>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end justify-end space-y-4">
                           <div className="text-right">
                             <p className="text-[10px] font-black text-slate-900 tracking-[0.2em] uppercase">Documento Confidencial</p>
                             <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Página 01 / 01</p>
                           </div>
                           <div className="h-1 w-20 bg-brand-primary" />
                        </div>
                      </div>

                      {/* Action Buttons (Hidden in PDF) - MIRRORING CONTRACT PATTERN */}
                      <div className="mt-16 pt-12 border-t border-slate-100 flex flex-col gap-4 no-print-section no-print relative z-20">
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => shareAsPDF(false, 'pdf')}
                            disabled={isGeneratingPDF}
                            className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                          >
                            {isGeneratingPDF ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                            {isGeneratingPDF ? 'Gerando...' : 'Compartilhar'}
                          </button>
                          <button
                            onClick={() => shareAsPDF(true, 'pdf')}
                            disabled={isGeneratingPDF}
                            className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 border border-slate-200"
                          >
                            <Printer className="w-4 h-4" />
                            Imprimir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            ) : activeTab === 'Histórico' ? (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
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
                            <tr key={action.id} className={cn("group transition-colors", isDark ? "hover:bg-white/[0.01]" : "hover:bg-slate-50")}>
                              <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                                {safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}
                              </td>
                              <td className="px-8 py-4">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-colors",
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
                              <td className={cn("px-8 py-4 font-bold text-xs transition-colors", isDark ? "text-white" : "text-slate-900")}>
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                      <div className="py-20 text-center glass-card">
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando...</span>
                          </div>
                      </div>
                    ) : filteredActions.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                         {command.trim() ? 'Nenhum registro encontrado.' : 'Nenhuma ação registrada.'}
                      </div>
                    ) : (
                      filteredActions.map((action) => (
                        <div key={`history-mobile-${action.id}`} className={cn("glass-card p-5 space-y-4 border transition-colors", isDark ? "border-white/5" : "bg-white border-slate-200 shadow-lg")}>
                           <div className="flex justify-between items-start">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">{safeFormatDate(action.date, 'dd/MM/yyyy HH:mm')}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                              action.type === 'loan_created' && "bg-brand-accent/10 text-brand-accent border-brand-accent/20",
                              action.type === 'payment_received' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                              action.type === 'loan_deleted' && "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
                              action.type === 'loan_updated' && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )}>
                               {action.type === 'loan_created' ? 'Novo Empréstimo' :
                                action.type === 'payment_received' ? 'Pagamento' :
                                action.type === 'loan_deleted' ? 'Exclusão' : 'Atualização'}
                            </span>
                          </div>

                           <div className="flex justify-between items-end">
                            <div>
                               <h3 className={cn("font-bold text-sm leading-tight uppercase tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{action.clientName}</h3>
                               <p className="text-slate-400 text-[10px] italic mt-1">{action.description}</p>
                            </div>
                            {action.amount && action.amount > 0 && (
                              <div className="text-right">
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Valor</span>
                                <div className={cn("font-black text-sm transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                  R$ {action.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                             {action.type === 'payment_received' && (
                                <button 
                                  onClick={() => setViewingReceipt(action)}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Recibo</span>
                                </button>
                              )}
                            <button 
                              onClick={() => deleteAction(action.id)}
                              className={cn(
                                "p-3 bg-white/5 text-slate-500 rounded-xl border border-white/10 active:scale-95 transition-all",
                                action.type !== 'payment_received' && "flex-1"
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
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
                                  {filterDate ? 'Nenhum Empréstimo Encontrado' : 
                                   command.trim() ? 'Nenhum empréstimo encontrado para esta busca.' : 
                                   activeTab === 'Agendados' ? 'Nenhum empréstimo agendado.' :
                                   'Nenhum empréstimo pendente.'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredLoans.map((loan) => (
                            <tr key={loan.id} className={cn(
                              "group transition-colors relative", 
                              isDark ? "hover:bg-white/[0.01]" : "hover:bg-slate-50",
                              isOverdue(loan) && (isDark ? "bg-brand-danger/[0.03]" : "bg-brand-danger/[0.01]")
                            )}>
                              <td className="px-8 py-4">
                                <button 
                                  onClick={() => setViewingClientLoans(loan.clientName)}
                                  className={cn("font-bold hover:text-brand-primary transition-colors text-left", isDark ? "text-white" : "text-slate-900")}
                                  title="Ver todos os contratos deste cliente"
                                >
                                  {loan.clientName}
                                </button>
                                {loan.clientPhone && <div className="text-[10px] text-slate-500 font-medium">{loan.clientPhone}</div>}
                              </td>
                              <td className={cn("px-8 py-4 text-xs transition-colors", isDark ? "text-white" : "text-slate-900")}>
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
                              <td className={cn("px-8 py-4 font-bold text-sm transition-colors", isDark ? "text-white" : "text-slate-900")}>
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
                                  {loan.status === 'Agendado' && (
                                    <button 
                                      onClick={() => setViewingScheduleReceipt(loan)}
                                      className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl border border-amber-500/20"
                                      title="Gerar Comprovante de Agendamento"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                  )}
                                  {loan.status !== 'Agendado' && (
                                    <>
                                      <button 
                                        onClick={() => setViewingContract([loan])}
                                        className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20"
                                        title="Emitir Comprovante"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => sendWhatsAppCollection(loan)}
                                        className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-500/20"
                                        title="Cobrança WhatsApp"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  {loan.status !== 'Pago' && (
                                    <button 
                                      onClick={() => {
                                        if (loan.status === 'Agendado') {
                                          activateLoan(loan);
                                        } else {
                                          setPayingLoan(loan); 
                                          setLastAction(null);
                                        }
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20 transition-all active:scale-95"
                                    >
                                      {loan.status === 'Agendado' ? (
                                        <>
                                          <Check className="w-4 h-4" />
                                          <span>Efetuar</span>
                                        </>
                                      ) : (
                                        <>
                                          <DollarSign className="w-4 h-4" />
                                          <span>Pagamento</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                      <div className="py-20 text-center glass-card">
                         <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-500 font-medium">Sincronizando...</span>
                          </div>
                      </div>
                    ) : filteredLoans.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                         {filterDate ? 'Nenhum Empréstimo Encontrado' : 
                          activeTab === 'Agendados' ? 'Nenhum agendamento encontrado.' :
                          'Nenhum empréstimo registrado.'}
                      </div>
                    ) : (
                      filteredLoans.map((loan) => (
                        <div key={`loan-mobile-${loan.id}`} className={cn(
                          "glass-card p-5 space-y-4 border transition-all duration-300", 
                          isDark ? "border-white/5" : "bg-white border-slate-200 shadow-lg",
                          isOverdue(loan) && (isDark ? "border-brand-danger/30 bg-brand-danger/[0.03] shadow-lg shadow-brand-danger/5" : "border-brand-danger/20 bg-brand-danger/[0.01] shadow-lg shadow-brand-danger/5")
                        )}>
                          <div className="flex justify-between items-start">
                             <div>
                              <button 
                                onClick={() => setViewingClientLoans(loan.clientName)}
                                className={cn("font-bold text-sm leading-tight uppercase tracking-tight text-left transition-colors", isDark ? "text-white" : "text-slate-900")}
                              >
                                {loan.clientName}
                              </button>
                              <p className="text-slate-500 text-[10px] font-medium mt-1 uppercase tracking-widest">{loan.clientPhone || 'Sem Telefone'}</p>
                            </div>
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} />
                          </div>

                          <div className={cn("grid grid-cols-2 gap-4 pt-2 border-t transition-colors", isDark ? "border-white/5" : "border-slate-100")}>
                            <div>
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Vencimento</span>
                              <div className="flex flex-col">
                                <span className={cn("font-bold text-sm tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}</span>
                                {loan.status === 'Pendente' && (
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase mt-0.5",
                                    isOverdue(loan) ? "text-neon-red" : "text-brand-accent"
                                  )}>
                                    {getDaysDiff(loan.dueDate) === 0 ? 'Vence hoje' :
                                     getDaysDiff(loan.dueDate) > 0 ? `Faltam ${getDaysDiff(loan.dueDate)} dias` :
                                     `Atrasado ${Math.abs(getDaysDiff(loan.dueDate))} dias`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Taxa Juros</span>
                              <div className="text-brand-accent font-bold text-sm tracking-tight">{((loan.interestRate || 0) * 100).toLocaleString('pt-BR')}%</div>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Capital Inv.</span>
                              <div className={cn("font-medium text-xs tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {loan.capital.toLocaleString('pt-BR')}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-1">Total à Receber</span>
                              <div className={cn("font-black text-lg tracking-tighter transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {loan.totalBruto.toLocaleString('pt-BR')}</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                             <button 
                                onClick={() => setViewingClientLoans(loan.clientName)}
                                className="p-3.5 bg-white/5 text-slate-400 rounded-xl border border-white/10 active:scale-95 transition-all"
                              >
                                <History className="w-5 h-5" />
                              </button>
                              {loan.status === 'Agendado' && (
                                <button 
                                  onClick={() => setViewingScheduleReceipt(loan)}
                                  className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 active:scale-95 transition-all"
                                  title="Comprovante de Agendamento"
                                >
                                  <Printer className="w-5 h-5" />
                                </button>
                              )}
                              {loan.status !== 'Agendado' && (
                                <>
                                  <button 
                                    onClick={() => setViewingContract([loan])}
                                    className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 active:scale-95 transition-all"
                                  >
                                    <FileText className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => sendWhatsAppCollection(loan)}
                                    className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 active:scale-95 transition-all"
                                    title="Cobrança WhatsApp"
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => {
                                    if (loan.status === 'Agendado') {
                                      activateLoan(loan);
                                    } else {
                                      setPayingLoan(loan); 
                                      setLastAction(null);
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-brand-accent to-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                                >
                                  {loan.status === 'Agendado' ? (
                                    <>
                                      <Check className="w-5 h-5" />
                                      <span>Efetuar</span>
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="w-5 h-5" />
                                      <span>Receber</span>
                                    </>
                                  )}
                                </button>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Loan Modal */}
      {isAdding && (
        <div key="modal-add-loan" className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4">
          <div 
            onClick={() => setIsAdding(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div 
            className="relative w-full h-full sm:h-auto sm:max-w-xl glass-card p-6 sm:p-8 overflow-y-auto sm:overflow-visible rounded-none sm:rounded-[32px]"
          >
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {editingLoanId ? 'Editar Empréstimo' : 
                     newLoan.status === 'Agendado' ? 'Agendar Empréstimo' : 'Novo Empréstimo'}
                  </h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-medium mt-1 sm:mt-2 uppercase tracking-widest sm:normal-case sm:tracking-normal">Preencha os dados da operação.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingLoanId(null);
                    setNewLoan({
                      clientName: '',
                      clientPhone: '',
                      clientAddress: '',
                      capital: '',
                      interestRate: '',
                      date: format(new Date(), 'yyyy-MM-dd'),
                      dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                      status: 'Pendente'
                    });
                  }}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors shrink-0"
                >
                  <X className="w-6 h-6 text-slate-500 sm:hidden" />
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-500 hidden sm:block" />
                </button>
              </div>

              <form onSubmit={addLoan} className="space-y-6 sm:space-y-8 pb-10 sm:pb-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome do Cliente</label>
                    </div>
                    <input 
                      required
                      type="text"
                      list="clients-list"
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.clientName || ""}
                      onChange={(e) => {
                        const name = e.target.value;
                        const existingClient = fullClients.find(c => c.name === name);
                        if (existingClient) {
                          setNewLoan({
                            ...newLoan, 
                            clientName: name,
                            clientPhone: existingClient.phone || newLoan.clientPhone,
                            clientAddress: existingClient.address || newLoan.clientAddress
                          });
                        } else {
                          setNewLoan({...newLoan, clientName: name});
                        }
                      }}
                    />
                    <datalist id="clients-list">
                      {fullClients.map(c => (
                        <option key={c.name} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número de Telefone</label>
                    <input 
                      type="text"
                      placeholder="(00) 00000-0000"
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.clientPhone || ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 11) val = val.substring(0, 11);
                        if (val.length > 10) {
                          val = `(${val.substring(0, 2)}) ${val.substring(2, 7)}-${val.substring(7)}`;
                        } else if (val.length > 6) {
                          val = `(${val.substring(0, 2)}) ${val.substring(2, 6)}-${val.substring(6)}`;
                        } else if (val.length > 2) {
                          val = `(${val.substring(0, 2)}) ${val.substring(2)}`;
                        } else if (val.length > 0) {
                          val = `(${val}`;
                        }
                        setNewLoan({...newLoan, clientPhone: val});
                      }}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                    <input 
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade..."
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.clientAddress || ""}
                      onChange={(e) => setNewLoan({...newLoan, clientAddress: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Capital (R$)</label>
                    <input 
                      required
                      type="text"
                      inputMode="numeric"
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.capital || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val) {
                          const num = (parseInt(val) / 100).toFixed(2);
                          const formatted = parseFloat(num).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                          setNewLoan({...newLoan, capital: formatted});
                        } else {
                          setNewLoan({...newLoan, capital: ''});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Juros (%)</label>
                    <input 
                      required
                      type="text"
                      inputMode="decimal"
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.interestRate || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                        setNewLoan({...newLoan, interestRate: val});
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                    <input 
                      required
                      type="date"
                      className="w-full glass-input py-3 sm:py-4"
                      value={newLoan.dueDate || ""}
                      onChange={(e) => setNewLoan({...newLoan, dueDate: e.target.value})}
                    />
                  </div>

                  {newLoan.status === 'Agendado' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data Programada para Efetuar</label>
                      <input 
                        required
                        type="date"
                        className="w-full glass-input py-3 sm:py-4 border-brand-primary/30"
                        value={newLoan.date || ""}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setNewLoan({
                            ...newLoan, 
                            date: newDate,
                            dueDate: format(addMonths(toDate(newDate) || new Date(), 1), 'yyyy-MM-dd')
                          });
                        }}
                      />
                      <p className="text-[9px] text-brand-primary font-bold uppercase tracking-wider ml-1 mt-1">
                        O sistema notificará você 3 dias antes desta data.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-brand-primary/5 border border-brand-primary/10 p-5 sm:p-6 rounded-2xl sm:rounded-[28px] space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Juros Calculados</span>
                    <span className="text-brand-primary">R$ {(parseLocaleNumber(newLoan.capital || '0') * (parseLocaleNumber(newLoan.interestRate || '0') / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base sm:text-lg font-bold text-white tracking-tight">
                    <span>Total Bruto</span>
                    <span className="">R$ {(parseLocaleNumber(newLoan.capital || '0') * (1 + parseLocaleNumber(newLoan.interestRate || '0') / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-brand-primary to-indigo-600 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-black shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 transition-all text-base sm:text-lg uppercase tracking-widest active:scale-95"
                >
                  {editingLoanId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {payingLoan && (
          <div key="modal-payment" className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4">
            <div 
              onClick={() => { setPayingLoan(null); setLastAction(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <div 
              className="relative w-full h-full sm:h-auto sm:max-w-md glass-card p-6 sm:p-8 overflow-y-auto sm:rounded-[32px] rounded-none shadow-2xl space-y-6 sm:space-y-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Pagamento</h2>
                  <p className="text-slate-600 text-sm font-medium mt-1">{payingLoan.clientName}</p>
                </div>
                <button 
                  onClick={() => { 
                    setPayingLoan(null); 
                    setLastAction(null); 
                    setPendingPayment(null);
                    setPixConfirmed(false);
                    setIsConfirmingPix(false);
                  }}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rotate-90 text-slate-600" />
                </button>
              </div>

              <div>
                {pendingPayment ? (() => {
                  const pixPayload = userProfile?.pixKey ? generatePixPayload(
                    userProfile.pixKey, 
                    userProfile.pixName || 'Nexus Client', 
                    'SAO PAULO', 
                    pendingPayment.amount
                  ) : '';

                  return (
                    <div className="space-y-6">
                      <div className="text-center space-y-4">
                        {isConfirmingPix ? (
                        <div className="py-12 space-y-6 flex flex-col items-center">
                          {pixConfirmed ? (
                            <>
                              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                                <Plus className="w-10 h-10 text-emerald-500" />
                              </div>
                              <h3 className="text-xl font-bold text-white tracking-tight">Pagamento Confirmado!</h3>
                              <p className="text-slate-400 text-sm">Aguarde, estamos processando a baixa...</p>
                            </>
                          ) : (
                            <>
                              <div className="w-20 h-20 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                              <h3 className="text-xl font-bold text-white tracking-tight">Monitorando PIX...</h3>
                              <p className="text-slate-400 text-sm">Verificando recebimento de R$ {pendingPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="glass-card bg-brand-primary/5 border-brand-primary/20 p-4">
                              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">Total a Receber</span>
                              <div className="text-2xl font-black text-white">R$ {pendingPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase mt-1">Ref: {pendingPayment.label}</div>
                           </div>

                           <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl border border-white/10">
                            <button 
                              onClick={() => setPendingPayment({ ...pendingPayment, method: 'PIX' })}
                              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                pendingPayment.method === 'PIX' 
                                  ? 'bg-brand-primary text-black shadow-lg shadow-brand-primary/20' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <QrCode className="w-4 h-4" />
                              PIX
                            </button>
                            <button 
                              onClick={() => setPendingPayment({ ...pendingPayment, method: 'DINHEIRO' })}
                              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                pendingPayment.method === 'DINHEIRO' 
                                  ? 'bg-brand-primary text-black shadow-lg shadow-brand-primary/20' 
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <DollarSign className="w-4 h-4" />
                              Dinheiro
                            </button>
                          </div>

                          {pendingPayment.method === 'PIX' ? (
                            <>
                              <div className="bg-white p-4 rounded-3xl mx-auto inline-block border-8 border-white/5 relative group cursor-pointer"
                                onClick={() => {
                                  if (pixPayload) {
                                    navigator.clipboard.writeText(pixPayload);
                                    setPixCopied(true);
                                    setTimeout(() => setPixCopied(false), 2000);
                                  }
                                }}
                              >
                                {userProfile?.pixKey ? (
                                  <QRCodeSVG 
                                    value={pixPayload} 
                                    size={220}
                                    level="H"
                                    includeMargin={true}
                                  />
                                ) : (
                                  <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400 bg-slate-100 rounded-2xl italic text-xs text-center p-4">
                                    PIX não configurado nas configurações do sistema.
                                  </div>
                                )}
                                {pixPayload && (
                                  <div className="absolute inset-0 bg-brand-primary/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px]">
                                    <Copy className="w-8 h-8 text-black mb-2" />
                                    <span className="text-black font-black uppercase text-[10px] tracking-widest">Clique para Copiar</span>
                                  </div>
                                )}
                              </div>

                              {pixPayload && (
                                <div className="px-2">
                                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3 text-left">
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Código Copia e Cola</span>
                                      <p className="text-[10px] font-mono text-slate-300 break-all line-clamp-2 leading-relaxed opacity-60">
                                        {pixPayload}
                                      </p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(pixPayload);
                                        setPixCopied(true);
                                        setTimeout(() => setPixCopied(false), 2000);
                                      }}
                                      className={`p-2 rounded-lg transition-all ${pixCopied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
                                    >
                                      {pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3">
                                <button 
                                  disabled={!userProfile?.pixKey}
                                  onClick={() => {
                                    if (pixPayload) {
                                      shareAsPDF(false, 'image', 'pix-payment-share-template', pixPayload);
                                    }
                                  }}
                                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-brand-accent/20 to-emerald-600/20 hover:from-brand-accent/30 hover:to-emerald-600/30 text-emerald-400 rounded-2xl font-bold transition-all border border-emerald-500/30 active:scale-95 text-sm"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Compartilhar QR + Código
                                </button>
                                
                                <button 
                                  onClick={() => {
                                    setIsConfirmingPix(true);
                                    setTimeout(() => {
                                      setPixConfirmed(true);
                                      setTimeout(() => {
                                        if (pendingPayment.type === 'interest') handleInterestPayment(pendingPayment.method);
                                        else if (pendingPayment.type === 'renew') handleRenewLoan(pendingPayment.method);
                                        else if (pendingPayment.type === 'payoff') handlePayoffLoan(pendingPayment.method);
                                        else if (pendingPayment.type === 'amortization') handleAmortization(pendingPayment.method);
                                        
                                        setPendingPayment(null);
                                        setIsConfirmingPix(false);
                                        setPixConfirmed(false);
                                      }, 1500);
                                    }, 2500);
                                  }}
                                  className="w-full py-4 bg-brand-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 active:scale-95"
                                >
                                  Confirmar Recebimento
                                </button>
                                
                                <button 
                                  onClick={() => setPendingPayment(null)}
                                  className="w-full py-4 text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
                                >
                                  Voltar / Alterar Valor
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-6 pt-4">
                              <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <DollarSign className="w-10 h-10 text-brand-primary" />
                              </div>
                              
                              <p className="text-slate-400 text-center text-sm px-4 leading-relaxed">
                                Você está registrando um recebimento em <span className="text-white font-bold">DINHEIRO</span>. 
                                Certifique-se de que o valor já está em mãos antes de confirmar.
                              </p>

                              <div className="space-y-4">
                                <button 
                                  onClick={() => {
                                    setIsConfirmingPix(true);
                                    setTimeout(() => {
                                      setPixConfirmed(true);
                                      setTimeout(() => {
                                        if (pendingPayment.type === 'interest') handleInterestPayment(pendingPayment.method);
                                        else if (pendingPayment.type === 'renew') handleRenewLoan(pendingPayment.method);
                                        else if (pendingPayment.type === 'payoff') handlePayoffLoan(pendingPayment.method);
                                        else if (pendingPayment.type === 'amortization') handleAmortization(pendingPayment.method);
                                        
                                        setPendingPayment(null);
                                        setIsConfirmingPix(false);
                                        setPixConfirmed(false);
                                      }, 1000);
                                    }, 1500);
                                  }}
                                  className="w-full py-5 bg-brand-primary text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 active:scale-95"
                                >
                                  Confirmar Recebimento em Dinheiro
                                </button>
                                
                                <button 
                                  onClick={() => setPendingPayment(null)}
                                  className="w-full py-4 text-slate-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest font-black"
                                >
                                  Voltar / Alterar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : lastAction ? (
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
                          value={amortizationAmount || ""}
                          onChange={(e) => setAmortizationAmount(e.target.value)}
                        />
                        <button 
                          onClick={() => {
                            const amount = parseFloat(amortizationAmount);
                            if (amount > 0 && amount <= payingLoan.capital) {
                              setPendingPayment({ amount, type: 'amortization', label: 'Amortização', method: 'PIX' });
                            }
                          }}
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
                          onClick={() => setPendingPayment({ 
                            amount: payingLoan.totalBruto - payingLoan.capital, 
                            type: 'renew', 
                            label: 'Pagar Juros e Renovar +30 dias',
                            method: 'PIX'
                          })}
                          className="w-full py-5 bg-gradient-to-r from-brand-primary to-indigo-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 flex items-center justify-between px-6 active:scale-[0.98]"
                        >
                          <span className="text-sm">Pagar Juros e Renovar</span>
                          <span className="text-black font-black text-[10px] bg-white/90 px-2.5 py-1 rounded-lg uppercase tracking-tighter">
                            +30 dias
                          </span>
                        </button>
                        <button 
                          onClick={() => setPendingPayment({ 
                            amount: payingLoan.totalBruto, 
                            type: 'payoff', 
                            label: 'Quitação Total',
                            method: 'PIX'
                          })}
                          className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-between px-6 active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm">Quitar Empréstimo</span>
                          </div>
                          <span className="text-white font-black text-sm">
                            R$ {payingLoan.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
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
              className={cn(
                "relative w-full max-w-sm glass-card p-8 text-center",
                !isDark && "bg-white border-slate-200 shadow-xl"
              )}
            >
                <div className="w-16 h-16 bg-brand-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-brand-danger" />
                </div>
                <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-black")}>{confirmModal.title}</h2>
                <p className="text-slate-500 text-sm mb-8">{confirmModal.message}</p>
                
                {confirmModal.requiresPassword && (
                  <div className="mb-6 text-left">
                    <label className={cn("block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1", isDark ? "text-slate-500" : "text-slate-400")}>Confirme sua senha</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-brand-primary transition-colors" />
                      <input 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                           setConfirmPassword(e.target.value);
                           setConfirmError(null);
                        }}
                        placeholder="••••••••"
                        className={cn(
                          "w-full border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none transition-all",
                          isDark 
                            ? "bg-white/5 text-white placeholder:text-slate-600 border-white/10 focus:border-brand-primary/50 focus:bg-white/[0.08]" 
                            : "bg-slate-50 text-slate-900 placeholder:text-slate-300 border-slate-200 focus:border-brand-primary focus:bg-white",
                          confirmError && "border-brand-danger shadow-lg shadow-brand-danger/10"
                        )}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isVerifyingPassword) confirmModal.onConfirm(confirmPassword);
                        }}
                      />
                    </div>
                    {confirmError && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="w-3 h-3 text-brand-danger" />
                        <span className="text-[10px] font-bold text-brand-danger uppercase tracking-tight">{confirmError}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    disabled={isVerifyingPassword}
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border disabled:opacity-50",
                      isDark 
                        ? "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border-white/10"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200"
                    )}
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={isVerifyingPassword}
                    onClick={() => confirmModal.onConfirm(confirmPassword)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-danger to-red-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-danger/25 hover:shadow-brand-danger/40 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isVerifyingPassword ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Confirmar Exclusão'
                    )}
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
                      const selected = loans.filter(l => selectedLoansForUnified.includes(l.id));
                      if (selected.length > 0) {
                        setViewingClientLoans(null);
                        setViewingContract(selected);
                        setSelectedLoansForUnified([]);
                      }
                    }}
                    disabled={selectedLoansForUnified.length === 0}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold border transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest",
                      selectedLoansForUnified.length > 0 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" 
                        : "bg-slate-500/5 text-slate-500 border-white/5 cursor-not-allowed opacity-50"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    Contrato Unificado ({selectedLoansForUnified.length})
                  </button>
                  <button 
                    onClick={() => {
                      const clientName = viewingClientLoans;
                      const clientMatch = fullClients.find(c => c.name === clientName);
                      setViewingClientLoans(null);
                      setEditingLoanId(null);
                      setNewLoan({
                        clientName: clientName || '',
                        clientPhone: clientMatch?.phone || '',
                        clientAddress: clientMatch?.address || '',
                        capital: '',
                        interestRate: '',
                        date: format(new Date(), 'yyyy-MM-dd'),
                        dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                        status: 'Pendente'
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
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox"
                          checked={
                            loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Pago').length > 0 &&
                            loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Pago').every(l => selectedLoansForUnified.includes(l.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const active = loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Pago').map(l => l.id);
                              setSelectedLoansForUnified(active);
                            } else {
                              setSelectedLoansForUnified([]);
                            }
                          }}
                          className="w-4 h-4 bg-white/5 border-white/10 rounded focus:ring-brand-primary text-brand-primary cursor-pointer"
                        />
                      </th>
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
                      .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0))
                      .map((loan) => (
                        <tr key={loan.id} className={cn(
                          "group hover:bg-white/[0.01] transition-colors",
                          selectedLoansForUnified.includes(loan.id) && "bg-brand-primary/5"
                        )}>
                          <td className="px-6 py-4">
                            {loan.status !== 'Pago' ? (
                              <input 
                                type="checkbox"
                                checked={selectedLoansForUnified.includes(loan.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLoansForUnified(prev => [...prev, loan.id]);
                                  } else {
                                    setSelectedLoansForUnified(prev => prev.filter(id => id !== loan.id));
                                  }
                                }}
                                className="w-4 h-4 bg-white/5 border-white/10 rounded focus:ring-brand-primary text-brand-primary cursor-pointer"
                              />
                            ) : (
                              <div className="w-4 h-4 bg-white/5 border-white/10 rounded opacity-20" />
                            )}
                          </td>
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
                              {loan.status !== 'Pago' && (
                                <button 
                                  onClick={() => sendWhatsAppCollection(loan)}
                                  className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all active:scale-95 border border-emerald-500/20"
                                  title="Cobrança WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
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
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">Nexus Private</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Comprovante de Operação</p>
              </div>

              {/* Main Amount - Elegant Focus */}
              <div className="text-center mb-16 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Valor Total da Operação</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {viewingContract.reduce((acc, l) => acc + l.totalBruto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-12 mb-16 relative z-10 border-t border-slate-100 pt-10">
                <div className="col-span-2 pb-6 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cliente Beneficiário</span>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {viewingContract[0].clientName}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Capital Emprestado</span>
                  <p className="font-black text-slate-900 uppercase text-sm leading-tight">
                    R$ {viewingContract.reduce((acc, l) => acc + l.capital, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Valor dos Juros</span>
                  <p className="font-black text-brand-primary uppercase text-sm leading-tight">
                    R$ {viewingContract.reduce((acc, l) => acc + (l.totalBruto - l.capital), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Data e Hora</span>
                  <p className="font-black text-slate-900 uppercase text-sm leading-tight">{safeFormatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Vencimento Principal</span>
                  <p className="font-black text-neon-red uppercase text-sm leading-tight">{safeFormatDate(viewingContract[0].dueDate, 'dd/MM/yyyy')}</p>
                </div>
              </div>

              {/* Individual Contracts Breakdown */}
              {viewingContract.length > 1 && (
                <div className="mb-16 relative z-10">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-50">Detalhamento Individual</p>
                  <div className="space-y-6">
                    {viewingContract.map((loan, index) => (
                      <div key={loan.id} className="flex justify-between items-start py-2 group">
                        <div className="flex gap-4">
                          <span className="text-[9px] font-black text-slate-300 mt-1">0{index + 1}</span>
                          <div>
                            <p className="text-[9px] font-black text-slate-900 uppercase tracking-wider">Contrato {loan.id.slice(0, 8)}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Venc. {safeFormatDate(loan.dueDate, 'dd/MM/y')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-bold text-slate-900">
                              <span className="text-slate-300 mr-2">CAPITAL</span>
                              R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[9px] font-bold text-brand-primary">
                              <span className="text-slate-300 mr-2">JUROS</span>
                              R$ {(loan.totalBruto - loan.capital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Minimalist Authentication */}
              <div className="pt-10 border-t border-slate-100 relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 p-2">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-900 mb-1">Autenticação Digital</p>
                    <p className="text-[7px] font-mono text-slate-400 uppercase tracking-tighter">{viewingContract[0].id.toUpperCase()}-{new Date().getTime()}</p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Asset Management</p>
                </div>
              </div>

              {/* Action Buttons (Hidden in PDF) */}
              <div className="flex flex-col gap-4 no-print-section no-print relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => shareAsPDF(false, 'pdf')}
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
                    onClick={() => shareAsPDF(true, 'pdf')}
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
          <div className="bg-white w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl my-0 sm:my-8 relative flex flex-col">
            <div id="printable-receipt" className="p-10 sm:p-20 bg-white text-slate-900 printable-content relative flex-1">
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
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{userProfile?.displayName || 'Nexus Private'}</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Comprovante de Recebimento</p>
              </div>

              {/* Amount Centerpiece */}
              <div className="text-center mb-16 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Valor Total Recebido</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {viewingReceipt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Efetivado com Sucesso</span>
                </div>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-12 mb-16 relative z-10 border-t border-slate-100 pt-10">
                <div className="col-span-2 pb-6 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Pagador</span>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {viewingReceipt.clientName}
                  </p>
                </div>
                
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Data e Hora</span>
                  <p className="font-black text-slate-900 uppercase text-sm leading-tight">{safeFormatDate(viewingReceipt.date, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Operação</span>
                  <p className="font-black text-brand-primary uppercase text-sm leading-tight">
                    {viewingReceipt.description.toLowerCase().includes('juros') ? 'Rendimentos' : 
                     viewingReceipt.description.toLowerCase().includes('capital') ? 'Amortização' : 
                     'Recebimento'}
                  </p>
                </div>

                <div className="col-span-2 pt-6 border-t border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Descrição Detalhada</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium uppercase tracking-tight">
                    {viewingReceipt.description}
                  </p>
                </div>
              </div>

              {/* Footer Authentication */}
              <div className="pt-10 border-t border-slate-100 relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 p-2">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-900 mb-1">Autenticação Digital</p>
                    <p className="text-[7px] font-mono text-slate-400 uppercase tracking-tighter">
                      {viewingReceipt.id.toUpperCase()}-{new Date(viewingReceipt.date).getTime()}
                    </p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Digital Auth</p>
                </div>
              </div>

              {/* Action Buttons (Hidden in PDF) - MIRRORING CONTRACT PATTERN */}
              <div className="mt-12 flex flex-col gap-4 no-print-section no-print relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => shareAsPDF(false, 'pdf')}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isGeneratingPDF ? 'Gerando...' : 'Compartilhar'}
                  </button>
                  <button
                    onClick={() => shareAsPDF(true, 'pdf')}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 border border-slate-200"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
                <button 
                  onClick={() => setViewingReceipt(null)}
                  className="py-4 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors pt-6 text-center"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingScheduleReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/95 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl my-0 sm:my-8 relative">
            <div id="printable-schedule-receipt" className="p-10 sm:p-20 bg-white text-slate-900 printable-content relative">
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
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{userProfile?.displayName || 'Nexus Private'}</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em]">Comprovante de Agendamento</p>
              </div>

              {/* Amount Centerpiece */}
              <div className="text-center mb-16 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Valor Total Agendado</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {viewingScheduleReceipt.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-12 mb-16 relative z-10 border-t border-slate-100 pt-10">
                <div className="col-span-2 pb-6 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Cliente Beneficiário</span>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {viewingScheduleReceipt.clientName}
                  </p>
                </div>
                
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Data para Liberação</span>
                  <p className="font-black text-slate-900 uppercase text-sm leading-tight">{safeFormatDate(viewingScheduleReceipt.date, 'dd/MM/yyyy')}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Previsão de Vencimento</span>
                  <p className="font-black text-neon-red uppercase text-sm leading-tight">{safeFormatDate(viewingScheduleReceipt.dueDate, 'dd/MM/yyyy')}</p>
                </div>

                <div className="col-span-2 pt-6 border-t border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-2">Observações do Agendamento</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium uppercase tracking-tight">
                    O crédito de R$ {viewingScheduleReceipt.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está programado no sistema para processamento na data indicada. A ativação ocorrerá automaticamente após a validação do lastro financeiro.
                  </p>
                </div>
              </div>

              {/* Footer Authentication */}
              <div className="pt-10 border-t border-slate-100 relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 p-2">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-900 mb-1">Controle de Agendamento</p>
                    <p className="text-[7px] font-mono text-slate-400 uppercase tracking-tighter">
                      SCH-{viewingScheduleReceipt.id.toUpperCase()}-{new Date(viewingScheduleReceipt.createdAt || new Date()).getTime()}
                    </p>
                  </div>
                </div>
                <div className="text-right opacity-40">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Reserve System</p>
                </div>
              </div>

              {/* Action Buttons (Hidden in PDF) */}
              <div className="mt-12 flex flex-col gap-4 no-print-section no-print relative z-20">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => shareAsPDF(false, 'pdf')}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-3xl shadow-2xl shadow-black/20 hover:shadow-black/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {isGeneratingPDF ? 'Gerando...' : 'Compartilhar'}
                  </button>
                  <button
                    onClick={() => shareAsPDF(true, 'pdf')}
                    disabled={isGeneratingPDF}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 border border-slate-200"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
                <button 
                  onClick={() => setViewingScheduleReceipt(null)}
                  className="py-4 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors pt-6 text-center"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-sm overflow-hidden">
          <div className={cn(
            "w-full max-w-md sm:rounded-[32px] rounded-t-[32px] border overflow-hidden shadow-2xl transition-colors duration-500 flex flex-col max-h-[92vh] sm:max-h-[90vh]",
            isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
          )}>
            <div className={cn("p-6 sm:p-8 border-b flex justify-between items-center transition-colors shrink-0", isDark ? "border-white/5" : "border-slate-100")}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl">
                  <Settings className="w-5 h-5 text-brand-primary" />
                </div>
                <h2 className={cn("text-xl font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>Configurações</h2>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 pb-32">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Foto de Perfil
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:border-brand-primary/50">
                      {newProfilePicture ? (
                        <img src={newProfilePicture} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[32px]">
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Mudar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await processImage(file);
                              setNewProfilePicture(compressed);
                            } catch (err) {
                              console.error("Erro ao processar imagem:", err);
                              setError("Erro ao processar a imagem. Tente outra foto.");
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-xs font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>Seu Logotipo</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-menu max-w-[150px] sm:max-w-[180px]">Personalize sua interface institucional.</p>
                    {newProfilePicture && (
                      <button 
                        onClick={() => setNewProfilePicture(null)}
                        className="text-[9px] font-black uppercase tracking-widest text-brand-danger flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" /> Remover Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Notificações do Dispositivo
                </label>
                <div className={cn(
                  "p-5 rounded-2xl border transition-all flex items-center justify-between",
                  isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      isNativeNotificationsEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                    )}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={cn("text-xs font-bold transition-colors uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                        Alertas no Sistema
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed max-w-[150px]">
                        Receba notificações direto no seu Android, iPhone ou Desktop.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isNativeNotificationsEnabled) {
                        setIsNativeNotificationsEnabled(false);
                        localStorage.setItem('nexus_native_notifications', 'false');
                      } else {
                        requestNotificationPermission();
                      }
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
                      isNativeNotificationsEnabled ? "bg-brand-primary" : "bg-slate-700"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isNativeNotificationsEnabled ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
                {!isNativeNotificationsEnabled && (
                  <p className="text-[9px] text-brand-primary font-bold uppercase tracking-widest italic flex items-center gap-2 px-1">
                    <AlertCircle className="w-3 h-3" /> Recomenda-se abrir em nova aba para suporte completo.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tema da Interface
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'light', icon: Sun, label: 'Claro' },
                    { id: 'dark', icon: Moon, label: 'Escuro' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id as 'light' | 'dark');
                        localStorage.setItem('nexus_theme', t.id);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                        theme === t.id 
                          ? "bg-brand-primary/10 border-brand-primary text-brand-primary" 
                          : cn(isDark ? "bg-white/5 border-white/10 text-slate-400 hover:border-white/20" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300")
                      )}
                    >
                      <t.icon className="w-5 h-5" />
                      <span className="text-[9px] font-bold uppercase">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Usuário (para recibos)
                </label>
                <input 
                  type="text"
                  value={newDisplayName || ""}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className={cn(
                    "w-full border rounded-2xl px-5 py-4 transition-all focus:outline-none",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white focus:border-brand-primary/50" 
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-primary/50"
                  )}
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
                  value={newPixKey || ""}
                  onChange={(e) => setNewPixKey(e.target.value)}
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  className={cn(
                    "w-full border rounded-2xl px-5 py-4 transition-all focus:outline-none",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white focus:border-brand-primary/50" 
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-primary/50"
                  )}
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
                  value={newPixName || ""}
                  onChange={(e) => setNewPixName(e.target.value)}
                  placeholder="Nome completo do titular"
                  className={cn(
                    "w-full border rounded-2xl px-5 py-4 transition-all focus:outline-none",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white focus:border-brand-primary/50" 
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-primary/50"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do Banco
                </label>
                <input 
                  type="text"
                  value={newPixBank || ""}
                  onChange={(e) => setNewPixBank(e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Bradesco"
                  className={cn(
                    "w-full border rounded-2xl px-5 py-4 transition-all focus:outline-none",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white focus:border-brand-primary/50" 
                      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-brand-primary/50"
                  )}
                />
                <p className="text-[10px] text-slate-500 italic">
                  O nome do banco aparecerá junto ao nome do titular nos comprovantes e contratos.
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 mt-8">
                <button 
                  onClick={handleLogout}
                  className={cn(
                    "w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                    isDark 
                      ? "bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20 border border-brand-danger/20" 
                      : "bg-rose-50 text-brand-danger hover:bg-rose-100 border border-rose-100"
                  )}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-widest">Sair da Conta</span>
                </button>
              </div>
            </div>

            <div className={cn("p-6 sm:p-8 border-t flex gap-3 shrink-0", isDark ? "border-white/5 bg-white/[0.02]" : "border-slate-100 bg-slate-50/50")}>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className={cn(
                    "flex-1 px-6 py-4 font-bold rounded-2xl transition-all text-xs sm:text-sm active:scale-95",
                    isDark ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white" : "bg-slate-200/50 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  )}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-4 bg-brand-primary text-black font-bold rounded-2xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 text-xs sm:text-sm active:scale-95 shadow-lg shadow-brand-primary/20"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Hidden Shareable PIX Template */}
      {pendingPayment && (
        <div 
          id="pix-payment-share-template" 
          className="fixed -left-[2000px] top-0 bg-white p-20 w-[800px] flex flex-col items-center text-center printable-content"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-black rounded-[32px] flex items-center justify-center mb-6 shadow-2xl">
              <QrCode className="w-12 h-12 text-[#6366f1]" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Pagamento PIX</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs mt-2">Nexus Private</p>
          </div>

          {/* Amount Box */}
          <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-[40px] p-10 mb-12">
            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] block mb-2">Valor Total a Pagar</span>
            <div className="text-6xl font-black text-black">
              R$ {pendingPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4">
              Ref: {pendingPayment.label}
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-8 rounded-[48px] shadow-xl border border-slate-100 mb-12">
            {userProfile?.pixKey && (
              <QRCodeSVG 
                value={generatePixPayload(
                  userProfile.pixKey, 
                  userProfile.pixName || 'Nexus Client', 
                  'SAO PAULO', 
                  pendingPayment.amount
                )} 
                size={350}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {/* Details Section */}
          <div className="w-full space-y-6 mb-12 text-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Titular da Conta</span>
                <p className="font-bold text-black text-xs uppercase">{userProfile?.pixName || "-"}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Instituição</span>
                <p className="font-bold text-black text-xs uppercase">{userProfile?.pixBank || "-"}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-10 border-t border-slate-100 w-full opacity-40">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-black">Nexus Private - Gestão de Ativos Financeiros</p>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de PIX */}
    </div>
  );
}

// --- Sub-components ---

function StatCard({ title, value, icon, color, trend, onClick, isDark }: { title: string, value: string, icon: React.ReactNode, color: 'primary' | 'secondary' | 'accent' | 'danger' | 'success', trend?: string, onClick?: () => void, isDark: boolean }) {
  const colors = {
    primary: 'text-brand-primary bg-brand-primary/5 border-brand-primary/10',
    secondary: cn(isDark ? 'text-white bg-white/5 border-white/10' : 'text-black bg-slate-100 border-slate-200'),
    accent: 'text-brand-accent bg-brand-accent/5 border-brand-accent/10',
    danger: 'text-brand-danger bg-brand-danger/5 border-brand-danger/10',
    success: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card p-5 sm:p-7 space-y-4 sm:space-y-5 group relative overflow-hidden transition-all duration-500",
        isDark ? "bg-white/[0.01] border-white/[0.03] shadow-2xl" : "bg-white border-slate-200 shadow-xl",
        onClick && "cursor-pointer active:scale-[0.98] lg:hover:scale-[1.02]"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-brand-primary/5 -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        !isDark && "bg-brand-primary/10"
      )} />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("p-2.5 sm:p-3.5 rounded-[16px] sm:rounded-[20px] transition-all duration-500", colors[color])}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 sm:w-6 sm:h-6" })}
        </div>
        {trend && (
          <span className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border", colors[color])}>
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10">
        <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] block mb-1 sm:mb-1.5 transition-colors">{title}</span>
        <div className={cn("text-xl sm:text-2xl font-black tracking-tight group-hover:text-brand-primary transition-colors duration-500", isDark ? "text-white" : "text-black")}>{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Loan['status'] }) {
  const config = {
    'Pendente': {
      classes: 'bg-slate-500/10 text-slate-500 border-slate-500/20 shadow-slate-500/5',
      icon: Clock
    },
    'Pago': {
      classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5',
      icon: Check
    },
    'Atrasado': {
      classes: 'bg-brand-danger/10 text-brand-danger border-brand-danger/20 shadow-brand-danger/5 animate-pulse',
      icon: AlertCircle
    },
    'Agendado': {
      classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5',
      icon: Calendar
    },
  };

  const { classes, icon: Icon } = config[status];

  return (
    <div 
      className={cn(
        "px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border inline-flex items-center gap-2 shadow-sm backdrop-blur-[2px]",
        classes
      )}
    >
      <Icon className="w-3 h-3" />
      {status}
    </div>
  );
}


