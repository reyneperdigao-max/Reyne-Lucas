/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronLeft,
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
  Settings2,
  X,
  QrCode,
  Copy,
  Check,
  BarChart3,
  Bell,
  User as UserIcon,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  LayoutGrid,
  ShieldCheck,
  Target,
  Headphones,
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
  serverTimestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { format, addMonths, addDays, parseISO, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { db, auth } from './firebase';
import { cn } from './lib/utils';
// @ts-expect-error - image import from assets without type declaration file
import luxuryBg from './assets/images/luxury_login_background_1782841009798.jpg';

// --- Highly Realistic 3D Money SVGs for Luxury active tabs ---
const CurvedDarkLuxuryBanknote = () => (
  <div 
    className="absolute right-0 top-0 bottom-0 w-[55%] pointer-events-none select-none z-0 overflow-hidden opacity-45 dark:opacity-60 transition-opacity duration-300"
    style={{ animation: 'luxuryWaveFlow 6s ease-in-out infinite' }}
  >
    <svg className="w-full h-full" viewBox="0 0 160 56" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Deep, rich dark-gold and ultra-dark charcoal background gradient for the banknote body */}
        <linearGradient id="darkLuxuryBillBg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#07080a" stopOpacity="0.98" />
          <stop offset="35%" stopColor="#0d0f14" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#1e180b" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#0c0d12" stopOpacity="0.95" />
        </linearGradient>

        {/* Shimmering, high-contrast gold gradient for borders and lines */}
        <linearGradient id="luxuryGoldStroke" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8c7023" />
          <stop offset="50%" stopColor="#F5D061" />
          <stop offset="100%" stopColor="#D4AF37" />
        </linearGradient>

        {/* Guilloche pattern representing financial security waves */}
        <linearGradient id="guillocheGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.02" />
          <stop offset="30%" stopColor="#F5D061" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8c7023" stopOpacity="0.1" />
        </linearGradient>

        {/* Fine background grid */}
        <pattern id="securityGrid" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#D4AF37" strokeWidth="0.15" strokeOpacity="0.08" />
        </pattern>
      </defs>

      {/* Background Security Grid (only inside the bill shape) */}
      <path 
        d="M 0 56 Q 35 56 70 38 T 120 18 T 160 6 L 160 56 Z" 
        fill="url(#securityGrid)" 
      />

      {/* The main curved banknote body representing a growing financial chart */}
      <path 
        d="M 0 56 Q 35 56 70 38 T 120 18 T 160 6 L 160 56 Z" 
        fill="url(#darkLuxuryBillBg)"
        stroke="url(#luxuryGoldStroke)"
        strokeWidth="1.2"
      />

      {/* Dashed security border just inside the curved edge */}
      <path 
        d="M 2 54 Q 35 54 69 36 T 119 16 T 158 5" 
        fill="none"
        stroke="#D4AF37"
        strokeWidth="0.4"
        strokeDasharray="2.5 1.5"
        strokeOpacity="0.5"
      />

      {/* Wave Guilloche 1 - Engraved wave line */}
      <path 
        d="M 0 46 Q 35 46 70 30 T 120 12 T 160 2" 
        fill="none"
        stroke="url(#guillocheGold)"
        strokeWidth="0.45"
        strokeOpacity="0.6"
      />

      {/* Wave Guilloche 2 - Lower intersecting wave line */}
      <path 
        d="M 0 51 Q 35 48 70 34 T 120 15 T 160 5" 
        fill="none"
        stroke="url(#guillocheGold)"
        strokeWidth="0.3"
        strokeOpacity="0.4"
      />

      {/* Wave Guilloche 3 - Very fine background vibration line */}
      <path 
        d="M 0 38 Q 35 34 70 24 T 120 8 T 160 1" 
        fill="none"
        stroke="url(#guillocheGold)"
        strokeWidth="0.2"
        strokeOpacity="0.25"
      />

      {/* Banknote Watermark Stamp (Luxury Royal Emblem / Central Seal) */}
      <g transform="translate(122, 28) scale(0.6)">
        {/* Outer security circle */}
        <circle cx="12" cy="12" r="11" fill="#0d0f14" stroke="#D4AF37" strokeWidth="0.8" strokeOpacity="0.8" />
        <circle cx="12" cy="12" r="9" fill="none" stroke="#D4AF37" strokeWidth="0.3" strokeDasharray="1.5 0.8" strokeOpacity="0.6" />
        {/* Central Currency Emblem */}
        <path d="M12 5.5 L13.5 8.5 L17 9 L14.5 11.5 L15 15 L12 13.5 L9 15 L9.5 11.5 L7 9 L10.5 8.5 Z" fill="#D4AF37" fillOpacity="0.85" />
      </g>

      {/* Security Thread - Vertical metal strip cutting through the bill */}
      <line x1="88" y1="28" x2="88" y2="56" stroke="url(#luxuryGoldStroke)" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 1.5" />

      {/* Engraved vertical bar codes & borders at the right end */}
      <line x1="152" y1="8" x2="152" y2="52" stroke="#D4AF37" strokeWidth="0.3" strokeOpacity="0.4" strokeDasharray="1 1" />
      <line x1="155" y1="6" x2="155" y2="52" stroke="#D4AF37" strokeWidth="0.5" strokeOpacity="0.3" />

      {/* Banknote text, numbers, and currency indicators following the design */}
      <text x="12" y="52" fill="#D4AF37" fillOpacity="0.8" fontSize="6.5" fontWeight="900" fontFamily="monospace" letterSpacing="0.8">100</text>
      <text x="142" y="15" fill="#D4AF37" fillOpacity="0.75" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.5">USD</text>
      <text x="52" y="51" fill="#D4AF37" fillOpacity="0.35" fontSize="3.2" fontWeight="bold" fontFamily="serif" letterSpacing="1.2">SECURE CAPITAL</text>
      <text x="118" y="51" fill="#D4AF37" fillOpacity="0.3" fontSize="2.8" fontWeight="bold" fontFamily="monospace">N° 888-2026</text>

      {/* Financial Growth Chart Markers (Vertices on the curve) */}
      <circle cx="70" cy="38" r="2.2" fill="#FFD700" stroke="#07080a" strokeWidth="0.5" />
      <circle cx="120" cy="18" r="2.2" fill="#FFD700" stroke="#07080a" strokeWidth="0.5" />
      {/* High-growth endpoint indicator */}
      <circle cx="160" cy="6" r="3.2" fill="#FFFFFF" stroke="#D4AF37" strokeWidth="0.8" className="animate-pulse" />
    </svg>
  </div>
);



const RealisticCoin = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="30%" stopColor="#FFB300" />
        <stop offset="70%" stopColor="#FFA000" />
        <stop offset="100%" stopColor="#B78103" />
      </linearGradient>
      <linearGradient id="goldRim" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#FFD54F" />
        <stop offset="100%" stopColor="#6D4C41" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="url(#goldGrad)" stroke="url(#goldRim)" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="8" fill="none" stroke="#FF8F00" strokeWidth="0.5" strokeDasharray="1.5 1" />
    <circle cx="12" cy="12" r="7.5" fill="none" stroke="#FFE082" strokeWidth="0.5" />
    <path d="M12.5 6C12.5 6 10.5 7 10.5 9C10.5 11 13.5 11.5 13.5 13C13.5 14.5 11.5 15.5 11.5 15.5M12 5V18" stroke="#795548" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12.5 6.5C12.5 6.5 10.5 7.5 10.5 9.5C10.5 11.5 13.5 12 13.5 13.5C13.5 15 11.5 16 11.5 16M12 5.5V18.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.9" />
    <path d="M12.5 6C12.5 6 10.5 7 10.5 9C10.5 11 13.5 11.5 13.5 13C13.5 14.5 11.5 15.5 11.5 15.5M12 5V18" stroke="#E65100" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// --- Highly Professional, Conservative SVG Charts/Sparklines for Pro Dashboard ---
const AssetSparkline = () => (
  <div className="w-full h-14 mt-6 opacity-70 dark:opacity-80">
    <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
      <defs>
        <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 50 Q 25 45 50 48 T 100 28 T 150 20 T 200 10 L 200 60 L 0 60 Z"
        fill="url(#assetGrad)"
      />
      <path
        d="M 0 50 Q 25 45 50 48 T 100 28 T 150 20 T 200 10"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="200" cy="10" r="3" fill="#D4AF37" />
    </svg>
  </div>
);

const OverdueSparkline = () => (
  <div className="w-full h-14 mt-4 opacity-70 dark:opacity-80">
    <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
      <defs>
        <linearGradient id="overdueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EF4444" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M 0 15 Q 40 40 80 20 T 140 42 T 200 25 L 200 60 L 0 60 Z"
        fill="url(#overdueGrad)"
      />
      <path
        d="M 0 15 Q 40 40 80 20 T 140 42 T 200 25"
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="200" cy="25" r="3" fill="#EF4444" />
    </svg>
  </div>
);

const LiquidationBars = () => (
  <div className="w-full h-14 mt-4 opacity-70 dark:opacity-80 flex items-end justify-between px-2 gap-[3px]">
    <div className="w-full bg-emerald-500/20 dark:bg-emerald-500/10 hover:bg-emerald-500/40 rounded-t-[2px] transition-all duration-300" style={{ height: '35%' }}></div>
    <div className="w-full bg-emerald-500/25 dark:bg-emerald-500/15 hover:bg-emerald-500/40 rounded-t-[2px] transition-all duration-300" style={{ height: '55%' }}></div>
    <div className="w-full bg-emerald-500/20 dark:bg-emerald-500/10 hover:bg-emerald-500/40 rounded-t-[2px] transition-all duration-300" style={{ height: '40%' }}></div>
    <div className="w-full bg-emerald-500/30 dark:bg-emerald-500/20 hover:bg-emerald-500/50 rounded-t-[2px] transition-all duration-300" style={{ height: '70%' }}></div>
    <div className="w-full bg-emerald-500/40 dark:bg-emerald-500/25 hover:bg-emerald-500/60 rounded-t-[2px] transition-all duration-300" style={{ height: '60%' }}></div>
    <div className="w-full bg-emerald-500/60 dark:bg-emerald-500/40 hover:bg-emerald-500/80 rounded-t-[2px] transition-all duration-300" style={{ height: '85%' }}></div>
    <div className="w-full bg-emerald-500 dark:bg-emerald-500/80 hover:bg-emerald-500 rounded-t-[2px] transition-all duration-300" style={{ height: '95%' }}></div>
  </div>
);

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
interface MonthlyClosure {
  id: string;
  userId: string;
  month: number;
  year: number;
  closedAt: string;
  closurePeriodEnd: string;
  stats: {
    totalLent: number;
    totalPayments: number;
    capitalPayments: number;
    interestPayments: number;
    paymentCount: number;
    loanCount: number;
    currentOutstanding: number;
    estimatedInterest: number;
  };
}

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
  type: 'loan_created' | 'payment_received' | 'loan_deleted' | 'loan_updated' | 'loan_activated' | 'loan_scheduled' | 'loan_renewed';
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

interface SystemSettings {
  whatsappTemplate: string;
  whatsappOverdueTemplate: string;
  defaultInterestRate: number;
  accentColor: 'yellow' | 'green' | 'blue' | 'violet' | 'red';
}

const DEFAULT_SETTINGS: SystemSettings = {
  whatsappTemplate: 'Olá {nome}, passando para lembrar do vencimento do seu empréstimo no valor de R$ {capital}.\n\nCaso prefira, você pode pagar apenas os juros de R$ {juros} para renovar por mais 30 dias.',
  whatsappOverdueTemplate: 'Olá {nome}, passando para lembrar que constam {meses_atraso} {termo_meses} em atraso do seu empréstimo de {capital}, e estamos próximos de mais um vencimento.\n\nCaso prefira, você pode pagar os juros acumulados de {juros} para regularizar e renovar por mais 30 dias.',
  defaultInterestRate: 0,
  accentColor: 'yellow'
};

export const BRAZILIAN_BANKS = [
  { id: 'nubank', name: 'Nubank', color: '#8A05BE', short: 'Nu' },
  { id: 'itau', name: 'Itaú', color: '#FF7800', short: 'It' },
  { id: 'bradesco', name: 'Bradesco', color: '#ED1C24', short: 'Br' },
  { id: 'bb', name: 'Banco do Brasil', color: '#FFF000', short: 'BB', textColor: '#0038A8' },
  { id: 'caixa', name: 'Caixa', color: '#005CA9', short: 'Cx' },
  { id: 'santander', name: 'Santander', color: '#EC0000', short: 'St' },
  { id: 'inter', name: 'Inter', color: '#FF7A00', short: 'In' },
  { id: 'c6', name: 'C6 Bank', color: '#212121', short: 'C6' },
  { id: 'picpay', name: 'PicPay', color: '#21C25E', short: 'Pp' },
  { id: 'mercadopago', name: 'Mercado Pago', color: '#009EE3', short: 'MP' },
  { id: 'pagbank', name: 'PagBank', color: '#00A650', short: 'Pb' },
  { id: 'btg', name: 'BTG Pactual', color: '#00315C', short: 'BTG' },
  { id: 'safra', name: 'Safra', color: '#B08D57', short: 'Sf' },
];

// Helper to fallback gracefully if canvas or browser doesn't resolve modern color function
const getFallbackColor = (colorStr: string): string => {
  const matchParts = colorStr.match(/[\d.]+/g);
  if (matchParts && matchParts.length > 0) {
    const l = parseFloat(matchParts[0]);
    // lightness can be 0..1 or 0..100%
    const normalizedL = l > 1 ? l / 100 : l;
    const gray = Math.round(Math.min(1, Math.max(0, normalizedL)) * 255);
    const hexValue = gray.toString(16).padStart(2, '0');
    return `#${hexValue}${hexValue}${hexValue}`;
  }
  return '#000000';
};

// Helper to resolve modern oklch/oklab colors using HTML5 Canvas context
const resolveModernColor = (() => {
  const cache: Record<string, string> = {
    'oklch(0.129 0.042 264.695)': '#0f172a',
    'oklch(0.208 0.042 265.755)': '#1e293b',
    'oklch(0.279 0.041 260.031)': '#334155',
    'oklch(0.371 0.027 261.221)': '#475569',
    'oklch(0.446 0.03 256.802)': '#64748b',
    'oklch(0.615 0.165 159.252)': '#059669',
    'oklch(0.61 0.25 24.3)': '#ff3131',
    'oklch(0.627 0.265 14.5)': '#ff4d4d',
    'oklch(0.704 0.191 22.216)': '#fca5a5',
    'oklch(1 0 0)': '#ffffff',
    'oklch(0 0 0)': '#000000',
  };
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  return (colorStr: string): string => {
    const trimmed = colorStr.trim();
    if (cache[trimmed]) return cache[trimmed];

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
    }
    if (!ctx) {
      try {
        ctx = canvas.getContext('2d');
      } catch (e) {
        console.warn('Canvas 2D context not available', e);
      }
    }

    if (!ctx) return getFallbackColor(trimmed);

    try {
      ctx.fillStyle = 'rgba(0,0,0,0)'; 
      ctx.fillStyle = trimmed;
      const resolved = ctx.fillStyle;
      if (resolved === 'rgba(0,0,0,0)' || (resolved === '#000000' && !trimmed.includes('0 0 0') && !trimmed.includes(' 0 0')) ) {
        return getFallbackColor(trimmed);
      }
      cache[trimmed] = resolved;
      return resolved;
    } catch {
      return getFallbackColor(trimmed);
    }
  };
})();

const sanitizeCSSColorFunctions = (value: string): string => {
  if (typeof value !== 'string') return value;
  if (!value.toLowerCase().includes('oklch') && !value.toLowerCase().includes('oklab')) {
    return value;
  }

  return value.replace(/(oklch|oklab)\s*\([^)]+\)/gi, (match) => {
    return resolveModernColor(match);
  });
};

const pureToDate = (val: unknown): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
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

const getOverdueMonths = (dueDateVal: unknown): number => {
  const dueDate = pureToDate(dueDateVal);
  if (!dueDate) return 0;
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  
  if (today <= due) return 0;

  let monthsDiff = (today.getFullYear() - due.getFullYear()) * 12 + (today.getMonth() - due.getMonth());
  
  if (today.getDate() < due.getDate()) {
    monthsDiff -= 1;
  }
  
  return Math.max(0, monthsDiff);
};

const enrichLoanWithAccruedInterest = (loan: Loan): Loan => {
  if (!loan.dueDate) return loan;
  if (loan.status === 'Agendado') return loan;
  if (loan.status === 'Pago' && loan.capital <= 0) return loan;
  
  // If status is 'Pago' but capital > 0, it means interest was paid for the current cycle
  // and they are waiting for next month's Pendente. No overdue interest applies because they already paid it.
  if (loan.status === 'Pago') return loan;

  const overdueMonths = getOverdueMonths(loan.dueDate);
  if (overdueMonths <= 0) return loan;

  const standardInterest = Math.round(loan.capital * loan.interestRate * 100) / 100;
  const totalInterest = standardInterest * (1 + overdueMonths);
  const dynamicTotalBruto = Math.round((loan.capital + totalInterest) * 100) / 100;

  return {
    ...loan,
    totalBruto: dynamicTotalBruto
  };
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [viewingClientLoans, setViewingClientLoans] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<'menu' | 'regras' | 'mensagem' | 'aparencia' | 'dados'>('menu');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [actions, setActions] = useState<SystemAction[]>([]);
  const [monthlyClosures, setMonthlyClosures] = useState<MonthlyClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [privacyMode, setPrivacyMode] = useState(() => {
    const saved = localStorage.getItem('nexus_privacy_mode');
    return saved === 'true';
  });
  const [activeTab, setActiveTab] = useState<'Principal' | 'Empréstimos' | 'Quitados' | 'Clientes' | 'Agendados' | 'Transações' | 'Pagamento' | 'Relatórios' | 'Configurações' | 'Notificações' | 'Suporte'>('Principal');
  const [activeReportTab, setActiveReportTab] = useState<'mensal' | 'fechamentos'>('mensal');
  const [previousTab, setPreviousTab] = useState<typeof activeTab>('Principal');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [visibleTransactionsCount, setVisibleTransactionsCount] = useState(50);
  const currentDateText = useMemo(() => format(new Date(), "dd 'de' MMMM", { locale: ptBR }), []);

  const changeTab = (newTab: typeof activeTab) => {
    if (newTab !== activeTab) {
      setPreviousTab(activeTab);
      setActiveTab(newTab);
      setCommand('');
      setFilterDate('');
      setShowOnlyOverdue(false);
      setShowOnlyCapital(false);
      setShowOnlyInterest(false);
      setShowOnlyPayoff(false);
      setViewingClientLoans(null);
      setPayingLoan(null);
      setEditingLoanId(null);
      setIsAdding(false);
      setVisibleTransactionsCount(50);
      setViewingReport(false);
    }
  };
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [viewingReport, setViewingReport] = useState(false);
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);
  const [viewingContract, setViewingContract] = useState<Loan[] | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editClientData, setEditClientData] = useState({ phone: '', address: '' });
  const [selectedLoansForUnified, setSelectedLoansForUnified] = useState<string[]>([]);
  const [viewingClientDetail, setViewingClientDetail] = useState<{ 
    name: string, 
    phone: string, 
    address: string, 
    activeCapital: number, 
    activeDebt: number, 
    loanCount: number,
    totalLoans: number 
  } | null>(null);

  useEffect(() => {
    if (viewingClientLoans) {
      const activeLoans = loans
        .filter(l => l.clientName === viewingClientLoans && l.status !== 'Agendado')
        .map(l => l.id);
      setSelectedLoansForUnified(activeLoans);
    } else {
      setSelectedLoansForUnified([]);
    }
  }, [viewingClientLoans, loans]);

  const [viewingReceipt, setViewingReceipt] = useState<SystemAction | null>(null);
  const [viewingScheduleReceipt, setViewingScheduleReceipt] = useState<Loan | null>(null);
  const [shareModalData, setShareModalData] = useState<{
    isOpen: boolean;
    title: string;
    text: string;
    fileName: string;
    imgDataUrl?: string;
    pdfBlob?: Blob;
    whatsappText: string;
    detailsText: string;
  } | null>(null);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [lastAction, setLastAction] = useState<SystemAction | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false);
  const [showOnlyCapital, setShowOnlyCapital] = useState(false);
  const [showOnlyInterest, setShowOnlyInterest] = useState(false);
  const [showOnlyPayoff, setShowOnlyPayoff] = useState(false);

  const handleToggleCapital = () => {
    setShowOnlyCapital(!showOnlyCapital);
    setShowOnlyInterest(false);
    setShowOnlyPayoff(false);
  };
  const handleToggleInterest = () => {
    setShowOnlyInterest(!showOnlyInterest);
    setShowOnlyCapital(false);
    setShowOnlyPayoff(false);
  };
  const handleTogglePayoff = () => {
    setShowOnlyPayoff(!showOnlyPayoff);
    setShowOnlyCapital(false);
    setShowOnlyInterest(false);
  };

  const [filterDate, setFilterDate] = useState('');
  const [userProfile, setUserProfile] = useState<{ 
    displayName?: string, 
    pixKey?: string, 
    pixName?: string, 
    pixBank?: string, 
    profilePicture?: string,
    lastClosureDate?: string | null 
  } | null>(null);
  const [theme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nexus_theme');
    return (saved as 'light' | 'dark') || 'dark';
  });
  const isDark = theme === 'dark';
  const [newDisplayName, setNewDisplayName] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  const [newPixKey, setNewPixKey] = useState('');
  const [newPixName, setNewPixName] = useState('');
  const [newPixBank, setNewPixBank] = useState('');
  const [newProfilePicture, setNewProfilePicture] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('nexus_sidebar_collapsed');
    return saved === 'true';
  });
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexus_read_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (activeTab === 'Configurações' && userProfile) {
      setNewDisplayName(userProfile.displayName || '');
      setNewPixKey(userProfile.pixKey || '');
      setNewPixName(userProfile.pixName || '');
      setNewPixBank(userProfile.pixBank || '');
      setNewProfilePicture(userProfile.profilePicture || null);
    }
  }, [activeTab, userProfile]);

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

  // --- Auto Reset Status ---
  useEffect(() => {
    if (!user || loans.length === 0) return;
    
    // Reset status from 'Pago' to 'Pendente' when the next month starts
    const today = startOfDay(new Date());
    const loansToReset = loans.filter(l => {
      if (l.status !== 'Pago' || l.capital <= 0) return false;
      const dueDate = toDate(l.dueDate);
      if (!dueDate) return false;
      
      // If we've reached the month of the due date (or beyond), it should be pending payment for THIS month
      const monthStart = startOfDay(new Date(dueDate.getFullYear(), dueDate.getMonth(), 1));
      return today >= monthStart;
    });

    if (loansToReset.length > 0) {
      const resetLoans = async () => {
        try {
          const batch = writeBatch(db);
          loansToReset.forEach(l => {
            batch.update(doc(db, 'loans', l.id), { status: 'Pendente' });
          });
          await batch.commit();
        } catch (err) {
          console.error("Error auto-resetting loans status:", err);
        }
      };
      resetLoans();
    }
  }, [loans, user, lastCheckDate]);

  const getAccentColorHex = () => {
    switch (systemSettings.accentColor) {
      case 'yellow': return '#FFD700';
      case 'green': return '#39FF14';
      case 'blue': return '#00F0FF';
      case 'violet': return '#8B5CF6';
      case 'red': return '#EF4444';
      default: return '#FFD700';
    }
  };

  // Sync brand color with document root for full application coverage
  useEffect(() => {
    const hex = getAccentColorHex();
    document.documentElement.style.setProperty('--color-brand-primary', hex);
    // Also inject a style tag for deeper overrides if needed (e.g. for print or legacy components)
    let styleTag = document.getElementById('dynamic-brand-color');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-brand-color';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        --color-brand-primary: ${hex} !important;
      }
      .bg-brand-primary { background-color: ${hex} !important; }
      .text-brand-primary { color: ${hex} !important; }
      .border-brand-primary { border-color: ${hex} !important; }
      .selection\\:bg-brand-primary\\/20::selection { background-color: ${hex}33 !important; }
    `;
  }, [systemSettings.accentColor]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isIframe = (window as any) !== (window as any).parent;
      setError(
        isIframe 
          ? "O preview bloqueia notificações. Clique no botão de 'Abrir em nova aba' no topo para ativar." 
          : "Este navegador ou ambiente não suporta notificações de sistema."
      );
      return;
    }

    if (Notification.permission === "denied") {
      setError("Notificações bloqueadas pelo navegador. Por favor, ative-as no ícone de cadeado na barra de endereços (ao lado do link).");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setIsNativeNotificationsEnabled(true);
        localStorage.setItem('nexus_native_notifications', 'true');
        setAddSuccess("Notificações ativadas com sucesso!");
        
        new Notification("Nexus Private: Sistema de Alertas", {
          body: "As notificações de segurança e lembretes bancários foram ativadas com sucesso.",
          icon: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=128&h=128&fit=crop'
        });

        // Auto hide success message
        setTimeout(() => setAddSuccess(null), 5000);
      } else {
        setIsNativeNotificationsEnabled(false);
        localStorage.setItem('nexus_native_notifications', 'false');
        if (permission === "denied") {
          setError("Você negou a permissão. Para ativar, clique no cadeado da barra de endereços e altere para 'Permitir'.");
        }
      }
    } catch (err) {
      console.error("Erro ao solicitar permissão:", err);
      setError("O navegador impediu a solicitação. Tente abrir o sistema em uma aba fora do preview ou limpe os cookies.");
    }
  };

  // Sincronizar permissão nativa com estado real do navegador
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        if (localStorage.getItem('nexus_native_notifications') === 'true') {
          setIsNativeNotificationsEnabled(true);
        }
      } else {
        setIsNativeNotificationsEnabled(false);
      }
    }
  }, []);

  const shareAsPDF = async (forceDownload = false, format: 'pdf' | 'image' = 'pdf', customElementId?: string, customShareText?: string, customShareUrl?: string) => {
    if (isGeneratingPDF) return;
    
    // Determine the element ID more robustly
    let elementId = customElementId;
    if (!elementId) {
      if (viewingContract) elementId = 'printable-contract';
      else if (viewingScheduleReceipt) elementId = 'printable-schedule-receipt';
      else if (viewingReceipt) elementId = 'printable-receipt';
      else if (activeTab === 'Relatórios') elementId = 'printable-report';
      else if (activeTab === 'Pagamento') elementId = 'printable-pix';
      else elementId = 'printable-receipt'; // Final fallback
    }

    const element = document.getElementById(elementId);
    if (!element) return;

    setIsGeneratingPDF(true);
    let noPrintElements: NodeListOf<Element> | null = null;
    const originalDisplays: string[] = [];

    const parentLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const parentStyleTags = Array.from(document.querySelectorAll('style'));
    const originalParentStyleContents = parentStyleTags.map(tag => tag.innerHTML);
    const tempStylesToDestroy: HTMLStyleElement[] = [];
    const disabledLinks: { link: HTMLLinkElement; originalRel: string }[] = [];

    // Save original states to safely restore in finally block
    const originalGetComputedStyle = window.getComputedStyle;
    const originalContentWindowDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    const originalContentDocumentDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
    const originalAppendChild = Element.prototype.appendChild;
    const originalInsertBefore = Element.prototype.insertBefore;

    // Helper to sanitize all CSS content of oklch/oklab to prevent html2canvas crashes
    const sanitizeCSSString = (css: string) => {
      let result = css;
      const colorMap: Record<string, string> = {
        'oklch(0.129 0.042 264.695)': '#0f172a',
        'oklch(0.208 0.042 265.755)': '#1e293b',
        'oklch(0.279 0.041 260.031)': '#334155',
        'oklch(0.371 0.027 261.221)': '#475569',
        'oklch(0.446 0.03 256.802)': '#64748b',
        'oklch(0.614 0.225 25.74)': getAccentColorHex(),
        'oklch(0.615 0.165 159.252)': '#059669',
        'oklch(0.61 0.25 24.3)': '#ff3131',
        'oklch(0.627 0.265 14.5)': '#ff4d4d',
        'oklch(0.704 0.191 22.216)': '#fca5a5',
        'oklch(1 0 0)': '#ffffff',
        'oklch(0 0 0)': '#000000',
      };

      Object.entries(colorMap).forEach(([oklch, hex]) => {
        result = result.replace(new RegExp(oklch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), hex);
      });

      // Fallback for any remaining oklch/oklab - very thorough regex
      result = result.replace(/(oklch|oklab)\s*\([^)]+\)/gi, (match) => {
        const matchParts = match.match(/[\d.]+/g);
        if (matchParts && matchParts.length > 0) {
          const l = parseFloat(matchParts[0]);
          const gray = Math.round(Math.min(1, Math.max(0, l)) * 255);
          const hexValue = gray.toString(16).padStart(2, '0');
          return `#${hexValue}${hexValue}${hexValue}`;
        }
        return '#000000';
      });

      return result;
    };

    type PatchedWindow = Window & {
      __getComputedStyleMocked?: boolean;
      __cssStylePrototypesPatched?: boolean;
      CSSStyleDeclaration?: { prototype: { getPropertyValue: (prop: string) => string } };
      CSSRule?: { prototype: unknown };
    };

    const restoreList: { proto: unknown; prop: string; desc: PropertyDescriptor }[] = [];
    const originalGetPropertyValueMap = new Map<unknown, (prop: string) => string>();

    const patchCSSStylePrototypes = (win: PatchedWindow) => {
      if (!win || win.__cssStylePrototypesPatched) return;
      try {
        win.__cssStylePrototypesPatched = true;
        
        // 1. Patch win.CSSStyleDeclaration.prototype gets
        const proto = (win as unknown as { CSSStyleDeclaration?: { prototype: { getPropertyValue: (prop: string) => string } } }).CSSStyleDeclaration?.prototype;
        if (proto) {
          const originalGetPropertyValue = proto.getPropertyValue;
          if (originalGetPropertyValue) {
            originalGetPropertyValueMap.set(proto, originalGetPropertyValue);
            proto.getPropertyValue = function (prop: string) {
              const val = originalGetPropertyValue.call(this, prop);
              if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                return sanitizeCSSColorFunctions(val);
              }
              return val;
            };
          }

          Object.getOwnPropertyNames(proto).forEach((prop: string) => {
            try {
              const desc = Object.getOwnPropertyDescriptor(proto, prop);
              if (desc && desc.get && typeof desc.get === 'function' && desc.configurable) {
                const originalGet = desc.get;
                restoreList.push({ proto, prop, desc });
                Object.defineProperty(proto, prop, {
                  ...desc,
                  get() {
                    const val = originalGet.call(this);
                    if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                      return sanitizeCSSColorFunctions(val);
                    }
                    return val;
                  }
                });
              }
            } catch {}
          });
        }

        // 2. Patch win.CSSRule.prototype cssText
        const ruleProto = (win as unknown as { CSSRule?: { prototype: unknown } }).CSSRule?.prototype;
        if (ruleProto) {
          const desc = Object.getOwnPropertyDescriptor(ruleProto, 'cssText');
          if (desc && desc.get && typeof desc.get === 'function' && desc.configurable) {
            const originalGet = desc.get;
            restoreList.push({ proto: ruleProto, prop: 'cssText', desc });
            Object.defineProperty(ruleProto, 'cssText', {
              ...desc,
              get() {
                const val = originalGet.call(this);
                if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                  return sanitizeCSSString(val);
                }
                return val;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to patch CSSStyle prototypes for window', err);
      }
    };

    // Robust helper to setup proxy on getComputedStyle of any window (main or iframe contentWindow)
    const setupIntercept = (win: PatchedWindow) => {
      if (!win) return;

      if (!win.__getComputedStyleMocked) {
        try {
          win.__getComputedStyleMocked = true;
          const originalGetCS = win.getComputedStyle;
          win.getComputedStyle = function (el: Element, pseudoEl?: string | null): CSSStyleDeclaration {
            const style = originalGetCS(el, pseudoEl);
            return new Proxy(style, {
              get(target, property) {
                if (property === 'getPropertyValue') {
                  return function (propName: string) {
                    const val = target.getPropertyValue(propName);
                    if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                      return sanitizeCSSColorFunctions(val);
                    }
                    return val;
                  };
                }
                const val = Reflect.get(target, property);
                if (typeof val === 'string' && (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab'))) {
                  return sanitizeCSSColorFunctions(val);
                }
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              }
            }) as unknown as CSSStyleDeclaration;
          };
        } catch (err) {
          console.warn('Failed to setup getComputedStyle mock', err);
        }
      }

      patchCSSStylePrototypes(win);
    };

    try {
      // 1. Mock window.getComputedStyle with a Proxy for the main window
      setupIntercept(window as unknown as PatchedWindow);

      // 2. Overwrite prototype descriptors for iframe properties so that dynamically created iframes are intercepted
      if (originalContentWindowDescriptor && originalContentWindowDescriptor.get) {
        const originalGetter = originalContentWindowDescriptor.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get() {
            const win = originalGetter.call(this);
            if (win) setupIntercept(win as unknown as PatchedWindow);
            return win;
          },
          configurable: true
        });
      }

      if (originalContentDocumentDescriptor && originalContentDocumentDescriptor.get) {
        const originalGetter = originalContentDocumentDescriptor.get;
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
          get() {
            const doc = originalGetter.call(this);
            if (doc && doc.defaultView) setupIntercept(doc.defaultView as unknown as PatchedWindow);
            return doc;
          },
          configurable: true
        });
      }

      // 3. Overwrite DOM insertion methods to immediately patch any appended iframes
      Element.prototype.appendChild = function<T extends Node>(newChild: T): T {
        const res = originalAppendChild.call(this, newChild);
        if (newChild instanceof HTMLIFrameElement) {
          try {
            if (newChild.contentWindow) setupIntercept(newChild.contentWindow as unknown as PatchedWindow);
          } catch {}
        }
        return res;
      };

      Element.prototype.insertBefore = function<T extends Node>(newChild: T, refChild: Node | null): T {
        const res = originalInsertBefore.call(this, newChild, refChild);
        if (newChild instanceof HTMLIFrameElement) {
          try {
            if (newChild.contentWindow) setupIntercept(newChild.contentWindow as unknown as PatchedWindow);
          } catch {}
        }
        return res;
      };

      // Pre-fetch stylesheets to sanitize oklch/oklab before html2canvas processes link elements
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const linkStyleSheetsContent = await Promise.all(
        links.map(async (link) => {
          try {
            const h = (link as HTMLLinkElement).href;
            if (h.startsWith(window.location.origin) || h.startsWith('/') || !h.includes('://')) {
              const response = await fetch(h);
              if (response.ok) {
                const text = await response.text();
                return sanitizeCSSString(text);
              }
            }
          } catch (err) {
            console.warn('Failed to pre-fetch stylesheet', err);
          }
          return '';
        })
      );

      // Disable live link stylesheets so html2canvas doesn't try to load their un-sanitized versions
      parentLinks.forEach(link => {
        const h = (link as HTMLLinkElement).href;
        if (h.startsWith(window.location.origin) || h.startsWith('/') || !h.includes('://')) {
          disabledLinks.push({ link: link as HTMLLinkElement, originalRel: link.getAttribute('rel') || 'stylesheet' });
          link.setAttribute('rel', 'alternate'); // Disables the stylesheet temporarily for the browser
        }
      });

      // Insert sanitized style blocks for those disabled links into the parent document
      linkStyleSheetsContent.forEach(content => {
        if (content) {
          const s = document.createElement('style');
          s.innerHTML = content;
          document.head.appendChild(s);
          tempStylesToDestroy.push(s);
        }
      });

      // Sanitize all style tags in the parent document in-place
      parentStyleTags.forEach(tag => {
        try {
          const css = tag.innerHTML;
          if (css.toLowerCase().includes('oklch') || css.toLowerCase().includes('oklab')) {
            tag.innerHTML = sanitizeCSSString(css);
          }
        } catch (err) {
          console.warn('Failed to sanitize live style tag', err);
        }
      });

      // Wait for fonts to be fully loaded to ensure consistent typography
      await document.fonts.ready;
      
      // Small delay to ensure all layout and styles are stabilized before capture
      await new Promise(resolve => setTimeout(resolve, 300));

      // Hide elements before capture
      noPrintElements = element.querySelectorAll('.no-print, .no-print-section');
      noPrintElements.forEach(el => {
        originalDisplays.push((el as HTMLElement).style.display);
        (el as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000, // Increase timeout for images
        onclone: (clonedDoc) => {
          // Mock clonedDoc.defaultView style objects to dynamically intercept color requests from html2canvas within the iframe
          if (clonedDoc.defaultView) {
            setupIntercept(clonedDoc.defaultView as unknown as PatchedWindow);
          }

          // Remove link tags in the clone to bypass html2canvas trying to parse their un-sanitized content which crashes it
          const clonedLinks = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
          clonedLinks.forEach(link => link.remove());

          // Inject the pre-fetched and thoroughly sanitized sheets as style blocks
          linkStyleSheetsContent.forEach(content => {
            if (content) {
              const s = clonedDoc.createElement('style');
              s.innerHTML = content;
              clonedDoc.head.appendChild(s);
            }
          });

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
            clonedElement.style.width = '1000px';
            clonedElement.style.padding = '80px'; 
            clonedElement.style.display = 'block';
            clonedElement.style.backgroundColor = '#ffffff';
            clonedElement.style.color = '#0f172a';
            clonedElement.style.borderRadius = '0'; // Flat for capture
            
            // Force bold weights for html2canvas to ensure they are captured
            const boldElements = clonedElement.querySelectorAll('.font-bold, .font-extrabold, .font-black, b, strong');
            boldElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.fontWeight = '800';
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
              const css = tag.innerHTML;
              // Remove ALL oklch and oklab occurrences, mapping known ones first
              if (css.toLowerCase().includes('oklch') || css.toLowerCase().includes('oklab')) {
                tag.innerHTML = sanitizeCSSString(css);
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
              --color-brand-primary: ${getAccentColorHex()} !important;
              --color-brand-danger: #ff4d4d !important;
              --color-neon-red: #ff3131 !important;
            }
            * {
              transition: none !important;
              animation: none !important;
              border-color: inherit;
              -webkit-font-smoothing: antialiased !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            body, .printable-content, .printable-content * {
              font-family: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif !important;
              color-scheme: light !important;
              color: #0f172a !important;
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
            }
            
            .bg-white { background-color: #ffffff !important; }
            .bg-slate-900 { background-color: #0f172a !important; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-black { background-color: #000000 !important; }
            .bg-\\[\\#0a0a0a\\] { background-color: #0a0a0a !important; }
            
            .text-slate-900 { color: #0f172a !important; }
            .text-slate-600 { color: #475569 !important; }
            .text-slate-500 { color: #64748b !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .text-white { color: #ffffff !important; }
            .text-slate-100 { color: #f1f5f9 !important; }
            .text-brand-primary { color: ${getAccentColorHex()} !important; }
            .text-neon-red { color: #ff3131 !important; }
            .text-emerald-600 { color: #059669 !important; }
            .bg-emerald-600 { background-color: #059669 !important; }
            .bg-brand-primary { background-color: ${getAccentColorHex()} !important; }
            .bg-neon-red { background-color: #ff3131 !important; }

            /* Increase base font sizes for better legibility in high-res exports */
            .text-\\[6px\\] { font-size: 11px !important; }
            .text-\\[7px\\] { font-size: 12px !important; }
            .text-\\[8px\\] { font-size: 16px !important; }
            .text-\\[9px\\] { font-size: 17px !important; }
            .text-\\[10px\\] { font-size: 19px !important; }
            .text-xs { font-size: 20px !important; }
            .text-sm { font-size: 26px !important; }
            .text-xl { font-size: 38px !important; }
            .text-2xl { font-size: 46px !important; }
            .text-5xl { font-size: 76px !important; }
            
            /* Enhanced font weighting and spacing */
            .font-bold { font-weight: 700 !important; }
            .font-black { font-weight: 900 !important; }
            .tracking-widest { letter-spacing: 0.18em !important; }
            .tracking-\\[0\\.4em\\] { letter-spacing: 0.45em !important; }
            .tracking-\\[0\\.3em\\] { letter-spacing: 0.35em !important; }
            .tracking-\\[0\\.2em\\] { letter-spacing: 0.25em !important; }
            
            /* Ensure values have enough vertical space */
            .mb-16 { margin-bottom: 96px !important; }
            .mb-2 { margin-bottom: 14px !important; }
            .gap-y-10 { row-gap: 64px !important; }
            .pt-10 { padding-top: 60px !important; }
            
            /* Ensure images/logos are fully opaque and clear */
            img { opacity: 1 !important; filter: contrast(1.1) !important; }
          `;
          clonedDoc.head.appendChild(style);

          const styledElements = clonedDoc.querySelectorAll('[style], [class*="bg-"], [class*="text-"]');
          styledElements.forEach(el => {
            const htmlEl = el as HTMLElement;
            const styleAttr = htmlEl.getAttribute('style');
            
            if (styleAttr && (styleAttr.toLowerCase().includes('oklch') || styleAttr.toLowerCase().includes('oklab'))) {
                let newStyle = styleAttr;
                newStyle = newStyle.replace(/(oklch|oklab)\s*\([^)]+\)/gi, (match) => {
                  const matchParts = match.match(/[\d.]+/g);
                  if (matchParts && matchParts.length > 0) {
                    const l = parseFloat(matchParts[0]);
                    const gray = Math.round(Math.min(1, Math.max(0, l)) * 255);
                    const hexValue = gray.toString(16).padStart(2, '0');
                    return `#${hexValue}${hexValue}${hexValue}`;
                  }
                  return isDark ? '#ffffff' : '#000000';
                });
                htmlEl.setAttribute('style', newStyle);
            }

            if (htmlEl.style) {
              htmlEl.style.filter = 'none';
              htmlEl.style.transition = 'none';
              htmlEl.style.animation = 'none';
              
              if (htmlEl.style.backgroundImage && (htmlEl.style.backgroundImage.includes('oklch') || htmlEl.style.backgroundImage.includes('oklab'))) {
                htmlEl.style.backgroundImage = 'none';
                htmlEl.style.backgroundColor = isDark ? '#000000' : '#ffffff';
              }

              if (htmlEl.classList.contains('bg-gradient-to-r') || htmlEl.classList.contains('bg-gradient-to-br')) {
                htmlEl.style.backgroundImage = 'none';
                htmlEl.style.backgroundColor = isDark ? '#111111' : '#f8fafc';
              }
            }
          });
        }
      });

      if (!forceDownload) {
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
        } else if (elementId === 'printable-report') {
          fileName = `relatorio-${ptBrMonths[reportMonth].toLowerCase()}-${reportYear}.png`;
          shareTitle = 'Relatório Mensal Nexus Private';
          shareText = `Segue o relatório mensal de ${ptBrMonths[reportMonth]}/${reportYear}.`;
        }

        // Construct structured WhatsApp and copy text
        let whatsappText = '';
        let detailsText = '';

        if (elementId === 'printable-receipt' && viewingReceipt) {
          const amountStr = (viewingReceipt.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const dateStr = viewingReceipt.date ? safeFormatDate(viewingReceipt.date, 'dd/MM/yyyy HH:mm') : '';
          const nameStr = viewingReceipt.clientName || 'Cliente';
          const opType = viewingReceipt.description?.toLowerCase()?.includes('juros') ? 'Rendimentos' : 
                         viewingReceipt.description?.toLowerCase()?.includes('capital') ? 'Amortização' : 
                         'Recebimento';
          const authId = (viewingReceipt.id ? viewingReceipt.id.toUpperCase() : 'NEXUS') + '-' + (viewingReceipt.date ? toDate(viewingReceipt.date).getTime() : new Date().getTime());

          whatsappText = `*COMPROVANTE DE RECEBIMENTO*%0A*NEXUS PRIVATE*%0A%0A*Pagador:* ${encodeURIComponent(nameStr)}%0A*Valor:* R$ ${encodeURIComponent(amountStr)}%0A*Data:* ${encodeURIComponent(dateStr)}%0A*Operação:* ${encodeURIComponent(opType)}%0A*Descrição:* ${encodeURIComponent(viewingReceipt.description || '')}%0A*Autenticação:* ${encodeURIComponent(authId)}%0A%0A_Enviado via Nexus Private_`;
          
          detailsText = `COMPROVANTE DE RECEBIMENTO\nNEXUS PRIVATE\n\nPagador: ${nameStr}\nValor: R$ ${amountStr}\nData: ${dateStr}\nOperação: ${opType}\nDescrição: ${viewingReceipt.description || ''}\nAutenticação: ${authId}`;
        } else if (elementId === 'printable-schedule-receipt' && viewingScheduleReceipt) {
          const clientStr = viewingScheduleReceipt.clientName || 'Cliente';
          const capStr = (viewingScheduleReceipt.capital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const rateStr = viewingScheduleReceipt.interestRate || '---';
          const dueStr = viewingScheduleReceipt.dueDate ? safeFormatDate(viewingScheduleReceipt.dueDate, 'dd/MM/yyyy') : '---';
          const authId = `SCH-${viewingScheduleReceipt.id ? viewingScheduleReceipt.id.toUpperCase() : 'SCH'}-${viewingScheduleReceipt.createdAt ? toDate(viewingScheduleReceipt.createdAt).getTime() : new Date().getTime()}`;

          whatsappText = `*COMPROVANTE DE AGENDAMENTO*%0A*NEXUS PRIVATE*%0A%0A*Cliente:* ${encodeURIComponent(clientStr)}%0A*Capital:* R$ ${encodeURIComponent(capStr)}%0A*Taxa:* ${encodeURIComponent(rateStr)}%25 a.m.%0A*Vencimento:* ${encodeURIComponent(dueStr)}%0A*Identificador:* ${encodeURIComponent(authId)}%0A%0A_Enviado via Nexus Private_`;

          detailsText = `COMPROVANTE DE AGENDAMENTO\nNEXUS PRIVATE\n\nCliente: ${clientStr}\nCapital: R$ ${capStr}\nTaxa: ${rateStr}% a.m.\nVencimento: ${dueStr}\nIdentificador: ${authId}`;
        } else if (elementId === 'printable-contract' && viewingContract && viewingContract.length > 0) {
          const clientStr = viewingContract[0].clientName || 'Cliente';
          const countStr = viewingContract.length;
          const totalCapital = viewingContract.reduce((sum, l) => sum + (Number(l.capital) || 0), 0);
          const capStr = totalCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const authId = `${viewingContract[0].id ? viewingContract[0].id.toUpperCase() : 'NEXUS'}-${viewingContract[0].date ? toDate(viewingContract[0].date).getTime() : new Date().getTime()}`;

          whatsappText = `*CONTRATO DE OPERAÇÃO*%0A*NEXUS PRIVATE*%0A%0A*Contratante:* ${encodeURIComponent(clientStr)}%0A*Contratos Ativos:* ${encodeURIComponent(countStr)}%0A*Valor Total:* R$ ${encodeURIComponent(capStr)}%0A*Autenticação:* ${encodeURIComponent(authId)}%0A%0A_Enviado via Nexus Private_`;

          detailsText = `CONTRATO DE OPERAÇÃO\nNEXUS PRIVATE\n\nContratante: ${clientStr}\nContratos Ativos: ${countStr}\nValor Total: R$ ${capStr}\nAutenticação: ${authId}`;
        } else if (elementId === 'printable-report') {
          const monthYearStr = `${ptBrMonths[reportMonth]} de ${reportYear}`;
          whatsappText = `*RELATÓRIO MENSAL*%0A*NEXUS PRIVATE*%0A%0A*Competência:* ${encodeURIComponent(monthYearStr)}%0A*Status:* Consolidado%0A%0A_Enviado via Nexus Private_`;
          detailsText = `RELATÓRIO MENSAL\nNEXUS PRIVATE\n\nCompetência: ${monthYearStr}\nStatus: Consolidado`;
        } else {
          whatsappText = `*DOCUMENTO NEXUS PRIVATE*%0A%0A_Enviado via Nexus Private_`;
          detailsText = `DOCUMENTO NEXUS PRIVATE`;
        }

        setShareModalData({
          isOpen: true,
          title: shareTitle,
          text: shareText,
          fileName: fileName,
          imgDataUrl: imgData,
          whatsappText: whatsappText,
          detailsText: detailsText
        });
        setIsGeneratingPDF(false);
        return;
      }

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
            // Helper to convert dataURL to Blob
            const dataURLtoBlob = (dataurl: string) => {
              const arr = dataurl.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1];
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while(n--){
                u8arr[n] = bstr.charCodeAt(n);
              }
              return new Blob([u8arr], {type:mime});
            };

            const blob = dataURLtoBlob(imgData);
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
      if (noPrintElements) {
        noPrintElements.forEach((el, i) => {
          if (el && originalDisplays[i] !== undefined) {
            (el as HTMLElement).style.display = originalDisplays[i];
          }
        });
      }

      // Destroy temporary sanitize style tags in the parent document
      tempStylesToDestroy.forEach(s => s.remove());

      // Restore parent style tags to their original oklch/oklab styles
      parentStyleTags.forEach((tag, idx) => {
        try {
          tag.innerHTML = originalParentStyleContents[idx];
        } catch (err) {
          console.warn('Failed to restore parent style tag', err);
        }
      });

      // Re-enable original parent link stylesheets
      disabledLinks.forEach(({ link, originalRel }) => {
        link.setAttribute('rel', originalRel);
      });

      // Restore iframe properties
      if (originalContentWindowDescriptor) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', originalContentWindowDescriptor);
      }
      if (originalContentDocumentDescriptor) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', originalContentDocumentDescriptor);
      }

      // Restore insertion methods
      Element.prototype.appendChild = originalAppendChild;
      Element.prototype.insertBefore = originalInsertBefore;

      // Restore all patched prototype getters
      restoreList.forEach(({ proto, prop, desc }) => {
        try {
          Object.defineProperty(proto as object, prop, desc);
        } catch {}
      });
      originalGetPropertyValueMap.forEach((originalFn, proto) => {
        try {
          (proto as { getPropertyValue: (prop: string) => string }).getPropertyValue = originalFn;
        } catch {}
      });

      // Restore standard getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

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
  const formatCurrency = (amount: number) => {
    return (amount || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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
            }, { merge: true }).catch(err => {
              handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
            });
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
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


  // Keep payingLoan in sync with loans array
  useEffect(() => {
    if (payingLoan) {
      const updatedLoan = loans.find(l => l.id === payingLoan.id);
      if (updatedLoan && (
        updatedLoan.capital !== payingLoan.capital || 
        updatedLoan.dueDate !== payingLoan.dueDate ||
        updatedLoan.status !== payingLoan.status ||
        updatedLoan.totalBruto !== payingLoan.totalBruto
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
      snapshot.forEach((docSnap) => {
        const rawLoan = { id: docSnap.id, ...docSnap.data() } as Loan;
        loanData.push(enrichLoanWithAccruedInterest(rawLoan));
      });
      setLoans(loanData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'loans');
    });

    const qActions = query(
      collection(db, 'actions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(1000)
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

    const qClosures = query(collection(db, 'monthly_closures'), where('userId', '==', user.uid), orderBy('year', 'desc'), orderBy('month', 'desc'));
    const unsubscribeClosures = onSnapshot(qClosures, (snapshot) => {
      const closuresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyClosure));
      setMonthlyClosures(closuresData);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'monthly_closures');
    });

    const settingsRef = doc(db, 'users', user.uid, 'settings', 'system');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let loadedOverdueTemplate = data.whatsappOverdueTemplate || DEFAULT_SETTINGS.whatsappOverdueTemplate;
        
        const oldDefault1 = 'Olá {nome}, passando para lembrar que constam {meses_atraso} {termo_meses} em atraso do seu empréstimo de R$ {capital}, e estamos próximos de mais um vencimento.\n\nCaso prefira, você pode pagar os juros acumulados de R$ {juros} para regularizar e renovar por mais 30 dias.';
        const oldDefault2 = 'Olá {nome}, tudo bem?\n\nIdentificamos que você possui {meses_atraso} {termo_meses} em atraso referente ao seu empréstimo de capital R$ {capital}. Além disso, está prestes a vencer mais uma parcela.\n\nAté o momento, o valor total em aberto é de R$ {total_bruto}.\n\nPara regularizar ou refinanciar, por favor, entre em contato.';
        
        if (loadedOverdueTemplate === oldDefault1 || loadedOverdueTemplate === oldDefault2) {
          loadedOverdueTemplate = DEFAULT_SETTINGS.whatsappOverdueTemplate;
        }

        setSystemSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          whatsappOverdueTemplate: loadedOverdueTemplate
        } as SystemSettings);
      }
      setIsSettingsLoaded(true);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/settings/system`);
      setIsSettingsLoaded(true); // Allow continuing with defaults if fetch fails
    });

    return () => {
      unsubscribeLoans();
      unsubscribeActions();
      unsubscribeClosures();
      unsubscribeSettings();
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

  const handleUpdateClient = async () => {
    if (!user || !viewingClientDetail) return;
    try {
      const clientLoans = loans.filter(l => l.clientName === viewingClientDetail.name);
      if (clientLoans.length === 0) return;

      const batch = clientLoans.map(l => 
        updateDoc(doc(db, 'loans', l.id), {
          clientPhone: editClientData.phone,
          clientAddress: editClientData.address
        })
      );

      await Promise.all(batch);
      setViewingClientDetail(prev => prev ? { 
        ...prev, 
        phone: editClientData.phone, 
        address: editClientData.address 
      } : null);
      setIsEditingDetail(false);
      setAddSuccess("Dados do cliente atualizados com sucesso!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'loans/bulk-client-update');
    }
  };

  const handleFirestoreError = (err: unknown, type: OperationType, path: string | null) => {
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
    throw new Error(JSON.stringify(errInfo));
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
      capital: Math.round(capitalNum * 100) / 100,
      interestRate: interestRateNum,
      totalBruto: Math.round(capitalNum * (1 + interestRateNum) * 100) / 100,
      uid: user.uid,
    };

    try {
      if (editingLoanId) {
        const oldLoan = loans.find(l => l.id === editingLoanId);
        const updateData: Record<string, unknown> = { ...loanData };
        if (newLoan.status) {
          updateData.status = newLoan.status;
        }
        await updateDoc(doc(db, 'loans', editingLoanId), updateData);
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
        const isScheduled = (newLoan.status as string) === 'Agendado';
    await logAction(
      isScheduled ? 'loan_scheduled' : 'loan_created', 
      `${isScheduled ? 'Agendamento' : 'Novo empréstimo'} para ${loanData.clientName}`, 
      loanData.clientName, 
      docRef.id, 
      loanData.capital
    );
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
      // Calculate original duration in days to preserve the exact period
      const oldStartDate = parseISO(loan.date);
      const oldEndDate = parseISO(loan.dueDate);
      const daysDiff = Math.max(1, differenceInDays(oldEndDate, oldStartDate) || 30);
      
      const newStartDate = new Date();
      const newEndDate = addDays(newStartDate, daysDiff);

      await updateDoc(doc(db, 'loans', loan.id), {
        status: 'Pendente',
        date: format(newStartDate, 'yyyy-MM-dd'),
        dueDate: format(newEndDate, 'yyyy-MM-dd'),
      });
      await logAction('loan_activated', `Empréstimo efetivado para ${loan.clientName}`, loan.clientName, loan.id, loan.capital);
      changeTab('Empréstimos');
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
    const interestAmount = Math.round((loan.totalBruto - loan.capital) * 100) / 100;
    const capitalFormatted = formatCurrency(loan.capital);
    const jurosFormatted = formatCurrency(interestAmount);
    const vencimentoFormatted = format(parseISO(loan.dueDate), 'dd/MM/yyyy');
    
    const isLoanOverdue = isOverdue(loan) || loan.status === 'Atrasado';
    const overdueCount = getOverdueMonths(loan.dueDate) + 1;
    const termoMeses = overdueCount === 1 ? 'mês' : 'meses';
    const totalBrutoFormatted = formatCurrency(loan.totalBruto);

    const baseTemplate = isLoanOverdue 
      ? (systemSettings.whatsappOverdueTemplate || DEFAULT_SETTINGS.whatsappOverdueTemplate)
      : (systemSettings.whatsappTemplate || DEFAULT_SETTINGS.whatsappTemplate);

    let message = baseTemplate
      .replace(/{nome}/gi, firstName)
      .replace(/{valor}/gi, capitalFormatted)
      .replace(/{capital}/gi, capitalFormatted)
      .replace(/{valor do capital}/gi, capitalFormatted)
      .replace(/{valor do captal}/gi, capitalFormatted)
      .replace(/{juros}/gi, jurosFormatted)
      .replace(/{valor do juros}/gi, jurosFormatted)
      .replace(/{vencimento}/gi, vencimentoFormatted)
      .replace(/{meses_atraso}/gi, String(overdueCount))
      .replace(/{termo_meses}/gi, termoMeses)
      .replace(/{total_bruto}/gi, totalBrutoFormatted);

    if (userProfile?.pixKey) {
      const pixInfo = `\n\nChave Pix para pagamento:\n${userProfile.pixKey}\n${userProfile.pixName || ''}`;
      if (message.toLowerCase().includes('{pix}')) {
        message = message.replace(/{pix}/gi, pixInfo);
      } else if (message.toLowerCase().includes('{dados de pagamento}')) {
        message = message.replace(/{dados de pagamento}/gi, pixInfo);
      } else if (!message.includes(userProfile.pixKey)) {
        message += pixInfo;
      }
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openEditModal = (loan: Loan) => {
    setEditingLoanId(loan.id);
    setNewLoan({
      clientName: loan.clientName,
      clientPhone: loan.clientPhone || '',
      clientAddress: loan.clientAddress || '',
      capital: loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      interestRate: (loan.interestRate * 100).toString(),
      date: loan.date,
      dueDate: loan.dueDate,
      status: loan.status,
    });
    setIsAdding(true);
  };

  const handleAmortization = async (method?: 'DINHEIRO' | 'PIX') => {
    if (!payingLoan || !amortizationAmount) return;
    const amount = parseFloat(amortizationAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCapital = Math.round(Math.max(0, payingLoan.capital - amount) * 100) / 100;
    const newTotalBruto = Math.round(newCapital * (1 + payingLoan.interestRate) * 100) / 100;
    const newCapitalPago = Math.round(((payingLoan.capitalPago || 0) + amount) * 100) / 100;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        capital: newCapital,
        totalBruto: newTotalBruto,
        capitalPago: newCapitalPago,
        status: newCapital === 0 ? 'Pago' : payingLoan.status
      });
      
      const methodText = method ? ` via ${method}` : '';
      const description = `Amortização de capital: ${formatCurrency(amount)}${methodText}`;
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

    const interestAmount = Math.round((payingLoan.totalBruto - payingLoan.capital) * 100) / 100;
    const newJurosPagos = Math.round(((payingLoan.jurosPagos || 0) + interestAmount) * 100) / 100;
    
    // Reset the issue date to today and move due date forward
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        date: format(today, 'yyyy-MM-dd'),
        dueDate: format(newDueDate, 'yyyy-MM-dd'),
        jurosPagos: newJurosPagos,
        status: 'Pago'
      });

      const methodText = method ? ` via ${method}` : '';
      const description = `Pagamento de juros: ${formatCurrency(interestAmount)}${methodText}`;
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
    
    const interestAmount = Math.round((payingLoan.totalBruto - payingLoan.capital) * 100) / 100;
    const newJurosPagos = Math.round(((payingLoan.jurosPagos || 0) + interestAmount) * 100) / 100;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        date: format(today, 'yyyy-MM-dd'),
        dueDate: format(newDueDate, 'yyyy-MM-dd'),
        status: 'Pago',
        jurosPagos: newJurosPagos
      });

      const methodText = method ? ` via ${method}` : '';
      const description = `Renovação com pagamento de juros: ${formatCurrency(interestAmount)}${methodText}`;
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
    
    const payoffAmount = Math.round(payingLoan.totalBruto * 100) / 100;
    const interestAmount = Math.round((payingLoan.totalBruto - payingLoan.capital) * 100) / 100;
    const capitalAmount = Math.round(payingLoan.capital * 100) / 100;
    
    try {
      await updateDoc(doc(db, 'loans', payingLoan.id), {
        status: 'Pago',
        capital: 0,
        totalBruto: 0,
        capitalPago: Math.round(((payingLoan.capitalPago || 0) + capitalAmount) * 100) / 100,
        jurosPagos: Math.round(((payingLoan.jurosPagos || 0) + interestAmount) * 100) / 100
      });

      const methodText = method ? ` via ${method}` : '';
      const description = `Quitação Total: ${formatCurrency(payoffAmount)} (Capital: ${formatCurrency(capitalAmount)} + Juros: ${formatCurrency(interestAmount)}${methodText})`;
      
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

  const cancelScheduledLoan = async (id: string) => {
    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: false,
      title: 'Cancelar Agendamento',
      message: 'Tem certeza que deseja cancelar e excluir este agendamento?',
      onConfirm: async () => {
        if (!user) return;
        setIsVerifyingPassword(true);
        setConfirmError(null);

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
            await logAction('loan_deleted', `Agendamento cancelado - ${loanToDelete.clientName}`, loanToDelete.clientName, id, loanToDelete.capital);
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: unknown) {
          console.error("Cancel Schedule Error:", err);
          setConfirmError("Erro ao cancelar o agendamento.");
        } finally {
          setIsVerifyingPassword(false);
        }
      }
    });
  };

  const deletePaidLoans = async () => {
    const paidLoans = loans.filter(l => l.status === 'Pago' && l.capital <= 0);
    if (paidLoans.length === 0) return;

    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: 'Excluir Todos os Empréstimos Quitados',
      message: `Tem certeza que deseja excluir todos os ${paidLoans.length} empréstimos quitados e todo o histórico associado? Você deve confirmar sua senha de acesso.`,
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

          // We delete each paid loan and its associated actions in parallel
          await Promise.all(paidLoans.map(async (loan) => {
            await deleteDoc(doc(db, 'loans', loan.id));
            
            // Delete associated actions for this loan
            const q = query(
              collection(db, 'actions'), 
              where('loanId', '==', loan.id),
              where('uid', '==', user.uid)
            );
            const snapshot = await getDocs(q);
            const actionDeletions = snapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(actionDeletions);

            await logAction('loan_deleted', `Empréstimo quitado excluído - ${loan.clientName}`, loan.clientName, loan.id, loan.capital);
          }));

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

    if (filterDate === 'TODAY') {
      const today = new Date();
      result = result.filter(l => {
        const d = toDate(l.dueDate);
        return d && d.getDate() === today.getDate() && 
               d.getMonth() === today.getMonth() && 
               d.getFullYear() === today.getFullYear();
      });
    } else if (filterDate) {
      const dateInt = parseInt(filterDate);
      result = result.filter(l => {
        const d = toDate(l.dueDate);
        // Filtra todos os empréstimos (Pendentes/Atrasados) que vencem no dia X de qualquer mês
        return d && d.getDate() === dateInt;
      });
    }

    if (activeTab === 'Empréstimos') {
      result = result.filter(l => l.status !== 'Agendado' && (l.status !== 'Pago' || l.capital > 0));
      // Always sort by due date in loans tab, and remove the slice to show all loans
      result = [...result].sort((a, b) => (toDate(a.dueDate)?.getTime() || 0) - (toDate(b.dueDate)?.getTime() || 0));
    } else if (activeTab === 'Quitados') {
      result = result.filter(l => l.status === 'Pago' && l.capital <= 0);
      result = [...result].sort((a, b) => (toDate(b.dueDate)?.getTime() || 0) - (toDate(a.dueDate)?.getTime() || 0));
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
    const clientMap = new Map<string, { 
      name: string, 
      phone: string, 
      address: string, 
      activeCapital: number, 
      activeDebt: number, 
      loanCount: number,
      totalLoans: number 
    }>();
    
    const sortedLoans = [...loans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedLoans.forEach(loan => {
      const existing = clientMap.get(loan.clientName) || { 
        name: loan.clientName, 
        phone: loan.clientPhone || '', 
        address: loan.clientAddress || '',
        activeCapital: 0, 
        activeDebt: 0, 
        loanCount: 0,
        totalLoans: 0
      };

      if (loan.status !== 'Agendado') {
        existing.totalLoans += 1;
        if (loan.status !== 'Pago' || loan.capital > 0) {
          existing.activeCapital += (loan.capital || 0);
          existing.activeDebt += (loan.totalBruto || 0);
          existing.loanCount += 1;
        }
      }
      
      // Keep most recent contact info
      if (!existing.phone && loan.clientPhone) existing.phone = loan.clientPhone;
      if (!existing.address && loan.clientAddress) existing.address = loan.clientAddress;
      
      clientMap.set(loan.clientName, existing);
    });
    
    return Array.from(clientMap.values());
  }, [loans]);

  const clients = useMemo(() => {
    let result = [...fullClients];
    
    if (filterDate === 'TODAY') {
      const today = new Date();
      result = result.filter(c => 
        loans.some(l => {
          const d = toDate(l.dueDate);
          return l.clientName === c.name && 
                 d && d.getDate() === today.getDate() && 
                 d.getMonth() === today.getMonth() && 
                 d.getFullYear() === today.getFullYear() &&
                 l.status !== 'Pago' && l.status !== 'Agendado';
        })
      );
    } else if (filterDate) {
      const dateInt = parseInt(filterDate);
      result = result.filter(c => 
        loans.some(l => {
          const d = toDate(l.dueDate);
          return l.clientName === c.name && 
                 d && d.getDate() === dateInt && 
                 l.status !== 'Pago' && l.status !== 'Agendado';
        })
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
      result = result.filter(a => {
        const desc = a.description.toLowerCase();
        const isPayoff = desc.includes('quitação') || desc.includes('quitado');
        if (isPayoff) return false;
        return (a.capitalAmount !== undefined && a.capitalAmount > 0) || desc.includes('capital') || desc.includes('amortização');
      });
    }
    if (showOnlyInterest) {
      result = result.filter(a => {
        const desc = a.description.toLowerCase();
        const isPayoff = desc.includes('quitação') || desc.includes('quitado');
        if (isPayoff) return false;
        return (a.interestAmount !== undefined && a.interestAmount > 0) || desc.includes('juros');
      });
    }
    if (showOnlyPayoff) {
      result = result.filter(a => {
        const desc = a.description.toLowerCase();
        return desc.includes('quitação') || desc.includes('quitado');
      });
    }
    return result;
  }, [filteredActions, showOnlyCapital, showOnlyInterest, showOnlyPayoff]);

  const stats = useMemo(() => {
    const activeLoans = loans.filter(l => (l.status !== 'Pago' || l.capital > 0) && l.status !== 'Agendado');
    
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

    const capitalRecebido = Math.round(periodActions
      .reduce((acc, curr) => acc + (curr.capitalAmount !== undefined && curr.capitalAmount > 0 ? (curr.capitalAmount || 0) : (curr.description.toLowerCase().includes('capital') || curr.description.toLowerCase().includes('amortização') || curr.description.toLowerCase().includes('quitação') ? (curr.amount || 0) : 0)), 0) * 100) / 100;
    
    const jurosRealizados = Math.round(periodActions
      .reduce((acc, curr) => acc + (curr.interestAmount !== undefined && curr.interestAmount > 0 ? (curr.interestAmount || 0) : (curr.description.toLowerCase().includes('juros') ? (curr.amount || 0) : 0)), 0) * 100) / 100;
    
    const overdueLoans = activeLoans.filter(l => l.status === 'Atrasado' || isOverdue(l));
    const atrasado = Math.round(overdueLoans.reduce((acc, curr) => acc + curr.totalBruto, 0) * 100) / 100;
    const atrasadosCount = overdueLoans.length;

    // Calculate due today
    const today = startOfDay(new Date());
    const dueTodayCount = activeLoans.filter(l => {
      const d = toDate(l.dueDate);
      return d && startOfDay(d).getTime() === today.getTime();
    }).length;
    
    // Calculate total unique clients
    const totalClients = new Set(loans.map(l => l.clientName)).size;
    
    return {
      capitalLiberado,
      capitalRecebido,
      jurosRealizados,
      atrasado,
      atrasadosCount,
      dueTodayCount,
      totalClients
    };
  }, [loans, actions, userProfile]);

  const monthlyReportStats = useMemo(() => {
    // If there is an archived closure for this specific month & year, use its saved stats
    const archivedClosure = [...monthlyClosures].find(c => c.month === reportMonth && c.year === reportYear);
    if (archivedClosure && archivedClosure.stats) {
      return {
        totalLent: archivedClosure.stats.totalLent || 0,
        totalPayments: archivedClosure.stats.totalPayments || 0,
        capitalPayments: archivedClosure.stats.capitalPayments || 0,
        interestPayments: archivedClosure.stats.interestPayments || 0,
        currentOutstanding: archivedClosure.stats.currentOutstanding || 0,
        estimatedInterest: archivedClosure.stats.estimatedInterest || 0,
        loanCount: archivedClosure.stats.loanCount || 0,
        paymentCount: archivedClosure.stats.paymentCount || 0
      };
    }

    const periodActions = actions.filter(a => {
      const d = toDate(a.date);
      return d && d.getMonth() === reportMonth && d.getFullYear() === reportYear;
    });

    const releasedActions = periodActions.filter(a => 
      (a.type === 'loan_created' && !a.description.includes('Agendamento')) || 
      a.type === 'loan_activated'
    );
    const paymentActions = periodActions.filter(a => a.type === 'payment_received' || a.type === 'loan_renewed');

    const totalLent = Math.round(releasedActions.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 100) / 100;
    
    const totalPayments = Math.round(paymentActions
      .reduce((acc, curr) => acc + (curr.amount || 0), 0) * 100) / 100;

    const capitalPayments = Math.round(paymentActions
      .reduce((acc, curr) => acc + (curr.capitalAmount !== undefined && curr.capitalAmount > 0 ? (curr.capitalAmount || 0) : (curr.description.toLowerCase().includes('capital') || curr.description.toLowerCase().includes('amortização') || curr.description.toLowerCase().includes('quitação') ? (curr.amount || 0) : 0)), 0) * 100) / 100;

    const interestPayments = Math.round(paymentActions
      .reduce((acc, curr) => acc + (curr.interestAmount !== undefined && curr.interestAmount > 0 ? (curr.interestAmount || 0) : (curr.description.toLowerCase().includes('juros') ? (curr.amount || 0) : 0)), 0) * 100) / 100;

    // Outstanding balance is everything not paid yet as of now
    const currentOutstanding = Math.round(loans
      .filter(l => (l.status !== 'Pago' || l.capital > 0) && l.status !== 'Agendado')
      .reduce((acc, curr) => acc + (curr.totalBruto - (curr.capitalPago || 0)), 0) * 100) / 100;

    const estimatedInterest = Math.round(loans
      .filter(l => l.status !== 'Agendado')
      .reduce((acc, curr) => acc + (curr.capital * (curr.interestRate || 0)), 0) * 100) / 100;

    return {
      totalLent,
      totalPayments,
      capitalPayments,
      interestPayments,
      currentOutstanding,
      estimatedInterest,
      loanCount: releasedActions.length,
      paymentCount: paymentActions.length
    };
  }, [actions, loans, reportMonth, reportYear, monthlyClosures]);

  const monthlyPerformanceHistory = useMemo(() => {
    const data = [];
    const monthsNameShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Generate last 6 months ending at selected reportMonth/reportYear
    for (let i = 5; i >= 0; i--) {
      let m = reportMonth - i;
      let y = reportYear;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      
      const archived = [...monthlyClosures].find(c => c.month === m && c.year === y);
      if (archived && archived.stats) {
        data.push({
          monthName: monthsNameShort[m],
          m,
          y,
          interestPayments: archived.stats.interestPayments || 0,
          capitalPayments: archived.stats.capitalPayments || 0,
          totalLent: archived.stats.totalLent || 0,
          totalReceived: (archived.stats.interestPayments || 0) + (archived.stats.capitalPayments || 0)
        });
        continue;
      }

      const monthActions = actions.filter(a => {
        const d = toDate(a.date);
        return d && d.getMonth() === m && d.getFullYear() === y;
      });
      
      const released = monthActions.filter(a => 
        (a.type === 'loan_created' && !a.description.includes('Agendamento')) || 
        a.type === 'loan_activated'
      );
      const payments = monthActions.filter(a => a.type === 'payment_received' || a.type === 'loan_renewed');
      
      const totalLent = Math.round(released.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 100) / 100;
      
      const interestPayments = Math.round(payments
        .reduce((acc, curr) => acc + (curr.interestAmount !== undefined && curr.interestAmount > 0 ? (curr.interestAmount || 0) : (curr.description.toLowerCase().includes('juros') ? (curr.amount || 0) : 0)), 0) * 100) / 100;
        
      const capitalPayments = Math.round(payments
        .reduce((acc, curr) => acc + (curr.capitalAmount !== undefined && curr.capitalAmount > 0 ? (curr.capitalAmount || 0) : (curr.description.toLowerCase().includes('capital') || curr.description.toLowerCase().includes('amortização') || curr.description.toLowerCase().includes('quitação') ? (curr.amount || 0) : 0)), 0) * 100) / 100;

      data.push({
        monthName: monthsNameShort[m],
        m,
        y,
        interestPayments,
        capitalPayments,
        totalLent,
        totalReceived: interestPayments + capitalPayments
      });
    }
    return data;
  }, [actions, reportMonth, reportYear, monthlyClosures]);


  const notifications = useMemo(() => {
    const list: {
      id: string;
      type: 'overdue' | 'upcoming';
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

    // Sort by type priority then date
    const finalResult = list.filter(n => !readNotificationIds.includes(n.id));

    return finalResult.sort((a, b) => {
      const priority = { overdue: 0, upcoming: 1 };
      if (priority[a.type as keyof typeof priority] !== priority[b.type as keyof typeof priority]) {
        return priority[a.type as keyof typeof priority] - priority[b.type as keyof typeof priority];
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [loans, readNotificationIds]);

  useEffect(() => {
    if (isNativeNotificationsEnabled && notifications.length > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        const newlySent: string[] = [];
        
        notifications.forEach(n => {
          if (!sentNativeNotificationIds.includes(n.id)) {
            // Check if it's important enough for an OS push (e.g., vencimento ou atraso)
            const isImportant = n.type === 'overdue' || 
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
    
    // Check if current month is already closed
    const isAlreadyClosed = monthlyClosures.some(c => c.month === reportMonth && c.year === reportYear);
    
    // Calculate end of selected month
    const endOfMonth = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999);
    const monthName = ptBrMonths[reportMonth];

    setConfirmPassword('');
    setConfirmError(null);
    setConfirmModal({
      isOpen: true,
      requiresPassword: true,
      title: isAlreadyClosed ? `Atualizar Fechamento: ${monthName} / ${reportYear}` : `Fechar Caixa: ${monthName} / ${reportYear}`,
      message: isAlreadyClosed 
        ? `Este mês já possui um fechamento registrado. Deseja atualizar os dados salvos? Isso definirá a nova data de encerramento para o dashboard como ${safeFormatDate(endOfMonth.toISOString(), 'dd/MM/yyyy')}.`
        : `Ao fechar este período, o sistema considerará ${safeFormatDate(endOfMonth.toISOString(), 'dd/MM/yyyy')} como o marco de encerramento. O dashboard principal continuará mostrando os dados posteriores a esta data. Esta ação salva um snapshot permanente deste mês.`,
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
            lastClosureDate: endOfMonth.toISOString()
          });

          // Save or Update closure record
          const closureRef = collection(db, 'monthly_closures');
          const existingClosure = monthlyClosures.find(c => c.month === reportMonth && c.year === reportYear);

          if (existingClosure) {
            await updateDoc(doc(db, 'monthly_closures', existingClosure.id), {
              updatedAt: new Date().toISOString(),
              stats: monthlyReportStats
            });
          } else {
            await addDoc(closureRef, {
              userId: user.uid,
              month: reportMonth,
              year: reportYear,
              closedAt: new Date().toISOString(),
              closurePeriodEnd: endOfMonth.toISOString(),
              stats: monthlyReportStats
            });
          }

          // Delete history for the selected month/year
          const monthActions = actions.filter(action => {
            const actionDate = new Date(action.date);
            return actionDate.getMonth() === reportMonth && actionDate.getFullYear() === reportYear;
          });

          if (monthActions.length > 0) {
            const batch = writeBatch(db);
            monthActions.forEach(action => {
              batch.delete(doc(db, 'actions', action.id));
            });
            await batch.commit();
          }

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

  // --- Persistence ---
  useEffect(() => {
    if (!user || !isAuthReady || !isSettingsLoaded) return;
    
    const timeoutId = setTimeout(() => {
      const saveSettings = async () => {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'system');
        try {
          await setDoc(settingsRef, systemSettings);
        } catch (err) {
          console.error("Auto-save settings error:", err);
        }
      };
      
      saveSettings();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [systemSettings, user, isAuthReady]);

  useEffect(() => {
    if (addSuccess) {
      const timer = setTimeout(() => setAddSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [addSuccess]);

  useEffect(() => {
    localStorage.setItem('nexus_privacy_mode', String(privacyMode));
  }, [privacyMode]);

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
    return (
      <div 
        className="relative flex min-h-screen overflow-hidden transition-all duration-700 bg-[#04040a]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(2, 2, 8, 0.45) 0%, rgba(2, 2, 8, 0.85) 100%), url(${luxuryBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Subtle Star Sparkles overlay */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none mix-blend-overlay" />

        {/* Left Side: Branding & Visuals (Desktop Only) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 overflow-hidden">
          {/* Subtle gold-tinted glow behind the text */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(212,175,55,0.08)_0%,_transparent_60%)]" />
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-700 flex items-center justify-center shadow-2xl shadow-[#D4AF37]/20 p-2.5">
                <div className="w-full h-full border-2 border-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xl italic tracking-tighter">NP</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-white">Nexus Private</h1>
                <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mt-1">Crédito e Gestão</p>
              </div>
            </motion.div>
          </div>

          <div className="relative z-10 max-w-md">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl font-black tracking-tighter leading-[1.05] mb-6 text-white"
            >
              A Nova Era do <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#f3e5ab] to-[#AA7C11] filter drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]">Capital Privado</span>
            </motion.h2>

            {/* Custom Slogan Phrase: "Sem dinheiro, sem graça" */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="mb-8 border-l-4 border-[#D4AF37] pl-5 py-2.5 bg-black/30 backdrop-blur-sm rounded-r-2xl"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Mantra de Poder</p>
              <p className="text-2xl font-black italic text-slate-100 tracking-tight mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                "Sem dinheiro, sem graça."
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-2 gap-8"
            >
              <div>
                <p className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-widest mb-2">Segurança</p>
                <p className="text-xs font-medium leading-relaxed text-slate-300">
                  Infraestrutura baseada em nuvem com criptografia de ponta a ponta.
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-widest mb-2">Performance</p>
                <p className="text-xs font-medium leading-relaxed text-slate-300">
                  Algoritmos inteligentes para gestão de liquidez instantânea.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative z-10 border-t border-white/5 pt-8"
          >
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              © {new Date().getFullYear()} Nexus Asset Management • v2.4.0-PRO
            </p>
          </motion.div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-12 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[440px] p-8 sm:p-14 relative z-10 rounded-[32px] sm:rounded-[48px] bg-black/45 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
          >
            {/* Mobile Header Branding */}
            <div className="lg:hidden flex flex-col items-center mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8a660a] p-3 shadow-2xl shadow-[#D4AF37]/20 flex items-center justify-center mb-3">
                <span className="text-white font-black text-xl italic tracking-tighter">NP</span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Nexus Private
              </h3>
              <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mt-0.5">
                Crédito e Gestão
              </p>
              
              {/* Slogan for mobile */}
              <div className="mt-4 px-4 py-2 rounded-2xl bg-black/40 border border-[#D4AF37]/30 backdrop-blur-md">
                <p className="text-[10px] font-extrabold italic text-[#f3e5ab] tracking-wider">
                  "Sem dinheiro, sem graça"
                </p>
              </div>
            </div>

            {/* Desktop Header Text */}
            <div className="hidden lg:block mb-8">
              <h3 className="text-2xl font-black tracking-tight mb-2 text-white">
                Acessar Portal
              </h3>
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">
                Nexus Private Ledger
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 rounded-2xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-[10px] font-black uppercase tracking-widest flex items-center gap-3 overflow-hidden"
              >
                <div className="w-6 h-6 rounded-lg bg-brand-danger/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors text-slate-500 group-focus-within:text-[#D4AF37]" />
                  <input
                    type="email"
                    placeholder="email@nexusprivate.com"
                    value={email || ""}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[20px] py-4 pl-12 pr-4 text-sm transition-all border outline-none bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.08]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors text-slate-500 group-focus-within:text-[#D4AF37]" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password || ""}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[20px] py-4 pl-12 pr-4 text-sm transition-all border outline-none bg-white/[0.04] border-white/10 text-white placeholder:text-slate-600 focus:border-[#D4AF37]/50 focus:bg-white/[0.08]"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative group"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] to-amber-500 rounded-[22px] blur opacity-35 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
                  <div className="relative w-full bg-gradient-to-br from-[#D4AF37] to-[#8a660a] text-white font-black uppercase tracking-[0.2em] text-[11px] py-5 rounded-[20px] shadow-2xl hover:shadow-[#D4AF37]/40 flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Entrar</span>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'Principal', label: 'Principal', icon: BarChart3 },
    { id: 'Empréstimos', label: 'Empréstimos', icon: DollarSign },
    { id: 'Clientes', label: 'Clientes', icon: Users },
    { id: 'Transações', label: 'Transações', icon: Wallet },
    { id: 'Agendados', label: 'Agendamentos', icon: Calendar },
    { id: 'Notificações', label: 'Alertas', icon: Bell },
    { id: 'Relatórios', label: 'Relatórios', icon: FileText },
    { id: 'Configurações', label: 'Configurações', icon: Settings },
    { id: 'Suporte', label: 'Suporte', icon: Headphones },
  ];

  const handleSaveSystemSettings = async (settings: SystemSettings) => {
    if (!user) return;
    const path = `users/${user.uid}/settings/system`;
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'system');
      await setDoc(settingsRef, settings);
      setSystemSettings(settings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div 
      className={cn(
        "h-dvh flex font-sans selection:bg-brand-primary/20 overflow-x-hidden transition-colors duration-500",
        isDark ? "bg-black text-slate-300" : "bg-slate-50 text-slate-700"
      )}
      style={{ '--color-brand-primary': getAccentColorHex() } as React.CSSProperties}
    >
      <style>{`
        @keyframes luxuryGlow {
          0% { box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.4); }
          100% { box-shadow: 0 8px 30px rgba(212, 175, 55, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.7); }
        }
        @keyframes luxuryFloatBill {
          0% { transform: translateY(-50%) rotate(15deg) scale(0.95); opacity: 0.35; }
          50% { transform: translateY(-53%) rotate(18deg) scale(1.02); opacity: 0.55; }
          100% { transform: translateY(-47%) rotate(12deg) scale(0.95); opacity: 0.35; }
        }
        @keyframes luxuryFloatBillMini {
          0% { transform: rotate(15deg) scale(0.9); opacity: 0.35; }
          50% { transform: rotate(18deg) scale(1.05); opacity: 0.55; }
          100% { transform: rotate(12deg) scale(0.9); opacity: 0.35; }
        }
        @keyframes luxuryWaveFlow {
          0% { transform: scale(1.0) translateY(0%) rotate(0deg); filter: brightness(0.95) contrast(1.05); }
          50% { transform: scale(1.015) translateY(-0.8%) rotate(0.4deg); filter: brightness(1.15) contrast(1.1); }
          100% { transform: scale(1.0) translateY(0%) rotate(0deg); filter: brightness(0.95) contrast(1.05); }
        }
        @keyframes luxuryShine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        @keyframes ambientPulseGold {
          0% { box-shadow: 0 12px 32px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
          100% { box-shadow: 0 20px 48px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15); }
        }
        @keyframes ambientPulseRed {
          0% { box-shadow: 0 12px 32px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
          100% { box-shadow: 0 20px 48px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15); }
        }
        @keyframes ambientPulseGreen {
          0% { box-shadow: 0 12px 32px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05); }
          100% { box-shadow: 0 20px 48px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15); }
        }
        @keyframes floatPoster {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-8px) rotate(0.5deg); }
        }
        @keyframes floatPoster2 {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-8px) rotate(-0.5deg); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden lg:flex flex-col shrink-0 sticky top-0 h-dvh border-r transition-all duration-300 z-50 overflow-hidden",
        isSidebarCollapsed ? "w-20" : "w-72",
        isDark ? "bg-black border-surface-border" : "bg-white border-slate-200"
      )}>
        <div className={cn("p-8 flex items-center gap-4 transition-all", isSidebarCollapsed ? "p-5 justify-center" : "")}>
          <div className="p-0.5 rounded-2xl shrink-0">
            {userProfile?.profilePicture ? (
              <img src={userProfile.profilePicture} className="w-10 h-10 rounded-xl object-cover" alt="Logo" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-700 flex items-center justify-center p-1.5 shadow-md shrink-0">
                <div className="w-full h-full border border-white/20 rounded-md flex items-center justify-center">
                  <span className="text-white font-black text-sm italic tracking-tighter">NP</span>
                </div>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className={cn(
                "text-lg font-bold tracking-[0.05em] leading-none transition-colors",
                isDark ? "text-white" : "text-slate-900"
              )}>Nexus</h1>
              <span className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-black">Private</span>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 space-y-1 transition-all", isSidebarCollapsed ? "px-2" : "px-4")}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  changeTab(item.id as typeof activeTab);
                  setCommand('');
                  setShowOnlyOverdue(false);
                }}
                className={cn(
                  "w-full flex items-center transition-all duration-300 group relative overflow-hidden",
                  isSidebarCollapsed ? "justify-center p-3.5 rounded-xl" : "gap-4 px-4 py-3.5 rounded-2xl",
                  isActive 
                    ? "text-black font-extrabold scale-[1.03]" 
                    : cn("text-slate-500", isDark ? "hover:text-white hover:bg-white/5" : "hover:text-slate-900 hover:bg-slate-100")
                )}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFF5C0 50%, #D4AF37 100%)',
                  border: '1px solid #FFD700',
                  animation: 'luxuryGlow 2.5s ease-in-out infinite alternate',
                  color: '#000000'
                } : undefined}
                title={isSidebarCollapsed ? item.label : ""}
              >
                {isActive && (
                  <CurvedDarkLuxuryBanknote />
                )}

                <Icon className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-500", 
                  isActive ? "text-black scale-110" : "group-hover:text-brand-primary group-hover:scale-110"
                )} />
                {!isSidebarCollapsed && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.label}
                  </span>
                )}
                {!isActive && !isSidebarCollapsed && (
                  <div className="absolute right-4 transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn("transition-all", isSidebarCollapsed ? "p-2" : "p-4")}>
          <div className={cn(
            "border transition-colors overflow-hidden",
            isSidebarCollapsed ? "p-2 rounded-xl" : "p-4 rounded-[24px]",
            isDark ? "bg-surface-900 border-surface-border" : "bg-slate-50 border-slate-200"
          )}>
            <div className={cn("flex items-center mb-3", isSidebarCollapsed ? "justify-center mb-0" : "gap-3")}>
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {userProfile?.profilePicture ? (
                  <img src={userProfile.profilePicture} className="w-full h-full object-cover" alt="User" />
                ) : (
                  <UserIcon className="w-5 h-5 text-brand-primary" />
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col truncate animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className={cn("text-[10px] font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {userProfile?.displayName || user.displayName || 'Usuário'}
                  </span>
                  <span className="text-[8px] text-slate-500 font-medium truncate uppercase tracking-tighter">
                    {user.email}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className={cn(
            "absolute inset-y-0 left-0 w-80 p-6 flex flex-col animate-in slide-in-from-left duration-500",
            isDark ? "bg-[#050505] border-r border-surface-border" : "bg-white"
          )}>
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
                   <BarChart3 className="w-5 h-5 text-black" />
                </div>
                <h1 className={cn("text-xl font-black tracking-tighter transition-colors", isDark ? "text-white" : "text-slate-900")}>NEXUS</h1>
              </div>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={`mobile-${item.id}`}
                  onClick={() => {
                    changeTab(item.id as typeof activeTab);
                    setCommand('');
                    setShowOnlyOverdue(false);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative overflow-hidden",
                    activeTab === item.id 
                      ? "text-black font-black shadow-xl scale-[1.01]" 
                      : cn("text-slate-500", isDark ? "hover:bg-surface-800 hover:text-white" : "hover:bg-slate-100 hover:text-slate-900")
                  )}
                  style={activeTab === item.id ? {
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFF5C0 50%, #D4AF37 100%)',
                    border: '1px solid #FFD700',
                    animation: 'luxuryGlow 2.5s ease-in-out infinite alternate',
                    color: '#000000'
                  } : undefined}
                >
                  {activeTab === item.id && (
                    <CurvedDarkLuxuryBanknote />
                  )}
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className={cn("pt-6 border-t mt-6", isDark ? "border-white/5" : "border-slate-100")}>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                    {userProfile?.profilePicture ? (
                      <img src={userProfile.profilePicture} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary">
                        <UserIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-bold truncate transition-colors", isDark ? "text-white" : "text-slate-900")}>{userProfile?.displayName || user.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
               </div>
               <button 
                 onClick={() => auth.signOut()}
                 className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-danger bg-brand-danger/10 border border-brand-danger/20"
               >
                 <LogOut className="w-4 h-4" />
                 Sair
               </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-y-auto pb-24 lg:pb-0 relative custom-scrollbar">
      {/* Background Glows */}
      {!isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className={cn(
            "absolute -top-32 -left-32 w-full max-w-[800px] aspect-square rounded-full blur-[180px] transition-all duration-1000",
            isDark ? "bg-brand-primary/10" : "bg-brand-primary/15"
          )} />
          <div className={cn(
            "absolute top-1/2 -right-32 w-full max-w-[700px] aspect-square rounded-full blur-[160px] transition-all duration-1000",
            isDark ? "bg-brand-accent/5" : "bg-brand-accent/10"
          )} />
        </div>
      )}

        {/* Header */}
        <header className={cn(
          "sticky top-0 z-40 border-b transition-colors pt-[env(safe-area-inset-top)]",
          isDark ? "bg-black/95 backdrop-blur-md border-surface-border" : "bg-white/95 backdrop-blur-md border-slate-200"
        )}>
          <div className="w-full px-4 sm:px-6 h-16 sm:h-24 flex items-center justify-between">
            {/* Mobile Sidebar Toggle */}
            <div className="flex lg:hidden items-center gap-2">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2.5 text-slate-400 hover:text-brand-primary active:scale-90 transition-all"
              >
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2 h-2 rounded-sm bg-current" />
                  <div className="w-2 h-2 rounded-sm bg-current opacity-50" />
                  <div className="w-2 h-2 rounded-sm bg-current opacity-50" />
                  <div className="w-2 h-2 rounded-sm bg-current opacity-20" />
                </div>
              </button>
              <h1 className={cn("text-xs font-black tracking-[0.2em] uppercase ml-1", isDark ? "text-white" : "text-slate-900")}>Nexus</h1>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              <button 
                onClick={() => {
                  const newValue = !isSidebarCollapsed;
                  setIsSidebarCollapsed(newValue);
                  localStorage.setItem('nexus_sidebar_collapsed', String(newValue));
                }}
                className="p-3 bg-white/[0.03] border border-white/[0.05] text-slate-400 hover:text-brand-primary hover:border-brand-primary/20 transition-all active:scale-95 rounded-2xl group"
                title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
              >
                <LayoutGrid className={cn("w-5 h-5 transition-transform duration-500", !isSidebarCollapsed ? "rotate-90" : "rotate-0")} />
              </button>
              <div className="flex items-center gap-4 py-2 px-4 bg-white/[0.02] border border-white/[0.05] rounded-3xl backdrop-blur-xl">
                <div className="p-2.5 bg-brand-primary/20 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                   <Target className="w-5 h-5 text-brand-primary animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className={cn("text-[11px] font-black uppercase tracking-[0.2em]", isDark ? "text-white" : "text-slate-900")}>
                      {activeTab === 'Principal' ? 'ESTATÍSTICAS GERAIS' : activeTab.toUpperCase()}
                    </h2>
                    <span className="w-1 h-3 bg-slate-700/50 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentDateText}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.05em]">Nexus Managed Node <span className="opacity-40">#PX-041</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
              <div className="hidden lg:flex items-center gap-4 py-2 px-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl hover:bg-white/[0.06] transition-all cursor-default group">
                <div className="flex flex-col items-end">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                    isDark ? "text-white" : "text-slate-900"
                  )}>{user.displayName || 'Administrador'}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{user.email?.toLowerCase()}</span>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-black text-black text-xs shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                    {user.displayName?.charAt(0) || 'A'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] flex items-center justify-center">
                    <ShieldCheck className="w-2 h-2 text-white" />
                  </div>
                </div>
              </div>
            <div className={cn(
              "h-8 w-px hidden lg:block",
              isDark ? "bg-white/10" : "bg-slate-200"
            )} />
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setPrivacyMode(!privacyMode)}
                className={cn(
                  "p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all active:scale-90 border transition-all",
                  privacyMode 
                    ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                )}
                title={privacyMode ? "Desativar Modo Privado" : "Ativar Modo Privado"}
              >
                {privacyMode ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              <div className="relative">
                <button 
                  onClick={() => changeTab('Notificações')}
                  className={cn(
                    "p-2 sm:p-3 hover:bg-brand-primary/10 rounded-xl sm:rounded-2xl transition-all active:scale-90 border border-transparent hover:border-brand-primary/20 relative group",
                    activeTab === 'Notificações' ? "text-brand-primary bg-brand-primary/10 border-brand-primary/20" : "text-slate-400"
                  )}
                  title="Notificações"
                >
                  <Bell className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-transform", activeTab === 'Notificações' && "rotate-12")} />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-brand-danger rounded-full border-2 border-white dark:border-black animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-10 relative z-10">
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

        {/* Success Alert */}
        {addSuccess && (
          <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success p-5 rounded-[24px] flex items-center justify-between animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold tracking-tight">{addSuccess}</span>
            </div>
            <button onClick={() => setAddSuccess(null)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {activeTab !== 'Principal' && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
              <div className="flex items-center gap-4 flex-1">
                <button 
                  onClick={() => {
                    if (activeTab === 'Configurações' && activeSettingsSection !== 'menu') {
                      setActiveSettingsSection('menu');
                    } else {
                      setActiveTab(previousTab);
                    }
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 border border-white/10 group"
                  title="Voltar"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-brand-primary" />
                </button>
                <div className="flex-1">
                  <h2 className={cn("text-xl font-bold tracking-tight uppercase transition-colors", isDark ? "text-white" : "text-slate-900")}>
                    {activeTab === 'Agendados' ? 'Agendamentos' : 
                     (activeTab === 'Configurações' && activeSettingsSection !== 'menu') ? (
                       <span className="flex items-center gap-2">
                         <span className="opacity-50">Configurações</span>
                         <ChevronRight className="w-4 h-4 opacity-30" />
                         <span className="text-brand-primary">
                           {activeSettingsSection === 'perfil' && 'Perfil'}
                           {activeSettingsSection === 'recebimentos' && 'Receber'}
                           {activeSettingsSection === 'regras' && 'Regras'}
                           {activeSettingsSection === 'mensagem' && 'Mensagem'}
                           {activeSettingsSection === 'aparencia' && 'Aparência'}
                           {activeSettingsSection === 'dados' && 'Sistema'}
                         </span>
                       </span>
                     ) : activeTab}
                  </h2>
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
                {showOnlyPayoff && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg w-fit">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                      Quitados
                    </span>
                    <button 
                      onClick={() => setShowOnlyPayoff(false)}
                      className="p-1 hover:bg-amber-500/20 rounded-md transition-colors"
                    >
                      <X className="w-2.5 h-2.5 text-amber-500" />
                    </button>
                  </div>
                )}
              </div>
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

            {activeTab === 'Agendados' && (
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
                    className="bg-brand-primary text-slate-950 px-6 py-3 rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] hover:-translate-y-0.5 active:translate-y-1 hover:brightness-105 border border-brand-primary"
                  >
                    <Clock className="w-5 h-5 text-slate-950" />
                    Agendar Empréstimo
                  </button>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'Principal' ? (
              <motion.div 
                key="tab-principal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="px-0 py-4 sm:py-8 space-y-10"
              >
                {/* Welcome Header */}
                <div className="space-y-1 mb-6">
                  <h2 className={cn("text-lg sm:text-xl font-black tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>
                    Olá, {(() => {
                      const raw = (userProfile?.displayName || user?.displayName || 'Usuário').trim().split(' ')[0];
                      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
                    })()}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 leading-none">
                    gerencie seus empréstimos
                  </p>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <StatCard 
                  title="Capital Liberado" 
                  value={privacyMode ? "R$ ••••••••" : formatCurrency(stats.capitalLiberado)} 
                  icon={<DollarSign className="w-5 h-5" />}
                  color="primary"
                  trend="Ativo"
                  isDark={isDark}
                  loading={loading}
                />
                <StatCard 
                  title="Capital Recebido" 
                  value={privacyMode ? "R$ ••••••••" : formatCurrency(stats.capitalRecebido)} 
                  icon={<Wallet className="w-5 h-5" />}
                  color="success"
                  trend="Liquidado"
                  isDark={isDark}
                  loading={loading}
                  onClick={() => {
                    changeTab('Transações');
                    setShowOnlyCapital(true);
                    setShowOnlyInterest(false);
                    setShowOnlyPayoff(false);
                    setShowOnlyOverdue(false);
                    setFilterDate('');
                    setCommand('');
                  }}
                />
                <StatCard 
                  title="Juros Realizados" 
                  value={privacyMode ? "R$ ••••••••" : formatCurrency(stats.jurosRealizados)} 
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="primary"
                  trend="Lucro"
                  isDark={isDark}
                  loading={loading}
                  onClick={() => {
                    changeTab('Transações');
                    setShowOnlyInterest(true);
                    setShowOnlyCapital(false);
                    setShowOnlyPayoff(false);
                    setShowOnlyOverdue(false);
                    setFilterDate('');
                    setCommand('');
                  }}
                />
                
                <div className="md:col-span-3 xl:col-span-1 grid grid-cols-2 gap-3 sm:gap-6">
                  <StatCard 
                    title="Atrasados" 
                    value={privacyMode ? "••" : stats.atrasadosCount.toString()} 
                    icon={<AlertCircle className="w-5 h-5" />}
                    color="danger"
                    trend="Risco"
                    isDark={isDark}
                    isMini
                    loading={loading}
                    onClick={() => {
                      changeTab('Empréstimos');
                      setShowOnlyOverdue(true);
                      setFilterDate('');
                      setCommand('');
                    }}
                  />
                  <StatCard 
                    title="Vencem Hoje" 
                    value={privacyMode ? "••" : stats.dueTodayCount.toString()} 
                    icon={<Calendar className="w-5 h-5" />}
                    color="accent"
                    trend="Alerta"
                    isDark={isDark}
                    isMini
                    loading={loading}
                    onClick={() => {
                      changeTab('Empréstimos');
                      setFilterDate('TODAY');
                      setShowOnlyOverdue(false);
                      setCommand('');
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 mb-12">
                {/* POSTER 1: VISÃO DE ATIVOS (GOLDEN MAJESTY) */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "p-8 sm:p-10 rounded-[32px] border transition-all duration-300 relative overflow-hidden group cursor-pointer", 
                    isDark ? "bg-[#0d0e12] border-slate-800 hover:border-[#D4AF37]/50" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/40 hover:border-[#D4AF37]/50"
                  )}
                  whileHover={{ y: -4 }}
                >
                  {/* Subtle Corner Accents */}
                  <div className="absolute top-4 right-4 opacity-15 group-hover:opacity-30 transition-opacity">
                    <RealisticCoin className="w-6 h-6" />
                  </div>

                  {/* Header Badge */}
                  <div className="relative z-10 flex flex-col mb-6">
                    <div className="text-[8px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-1">REAL ASSETS & CAPITAL</div>
                    <h3 className="text-[12px] sm:text-[13px] font-black uppercase tracking-[0.25em] text-slate-800 dark:text-[#FFF5C0] flex items-center gap-3">
                      <span className="w-2 h-2 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]" />
                      Visão de Ativos
                    </h3>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-end pb-3 border-b border-slate-100 dark:border-slate-800/60">
                       <div className="flex flex-col">
                         <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Ativa</span>
                         <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">Clientes</span>
                       </div>
                       {loading ? (
                         <div className="h-8 w-12 bg-slate-500/15 rounded animate-pulse mt-1" />
                       ) : (
                         <span className={cn("text-2xl sm:text-3xl font-black tracking-tighter", isDark ? "text-[#FFF5C0]" : "text-slate-900")}>{stats.totalClients}</span>
                       )}
                    </div>
                    <div className="flex justify-between items-end pb-3 border-b border-slate-100 dark:border-slate-800/60">
                       <div className="flex flex-col">
                         <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capilaridade</span>
                         <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">Contratos</span>
                       </div>
                       {loading ? (
                         <div className="h-8 w-12 bg-slate-500/15 rounded animate-pulse mt-1" />
                       ) : (
                         <span className={cn("text-2xl sm:text-3xl font-black tracking-tighter", isDark ? "text-[#FFF5C0]" : "text-slate-900")}>{loans.filter(l => l.status !== 'Pago' || l.capital > 0).length}</span>
                       )}
                    </div>
                    <div className="flex justify-between items-end pb-1">
                       <div className="flex flex-col text-left">
                         <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score de Risco</span>
                         <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">Inadimplência</span>
                       </div>
                       {loading ? (
                         <div className="h-7 w-16 bg-slate-500/15 rounded animate-pulse mt-1" />
                       ) : (
                         <span className="text-xl sm:text-2xl font-black tracking-tighter text-red-500">
                           {((loans.filter(l => (l.status !== 'Pago' || l.capital > 0) && isOverdue(l)).length / (loans.filter(l => l.status !== 'Pago' || l.capital > 0).length || 1)) * 100).toFixed(1)}%
                         </span>
                       )}
                    </div>
                  </div>

                  {/* Sparkline Graphic */}
                  <AssetSparkline />

                  {/* Aesthetic Footer Watermark */}
                  <div className="absolute bottom-2 right-4 text-[7px] font-black tracking-[0.3em] text-slate-400/20 uppercase pointer-events-none">
                    SECURE LEDGER
                  </div>
                </motion.div>

                {/* POSTER 2: ALERTA DE ATRASOS (ROYAL CRIMSON) */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={cn(
                    "p-8 sm:p-10 rounded-[32px] border transition-all duration-300 relative overflow-hidden group cursor-pointer", 
                    isDark ? "bg-[#0d0e12] border-slate-800 hover:border-red-500/50" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/40 hover:border-red-500/50"
                  )}
                  whileHover={{ y: -4 }}
                >
                  {/* Subtle Stamp Overlay */}
                  <div className="absolute top-4 right-4 opacity-15 group-hover:opacity-30 transition-opacity">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>

                  {/* Header Badge */}
                  <div className="relative z-10 flex flex-col mb-6">
                    <div className="text-[8px] font-black text-red-500 uppercase tracking-[0.4em] mb-1">CRITICAL RISK & AUDIT</div>
                    <h3 className="text-[12px] sm:text-[13px] font-black uppercase tracking-[0.25em] text-red-600 dark:text-red-400 flex items-center gap-3">
                      <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_#EF4444]" />
                      Alerta de Atrasos
                    </h3>
                  </div>

                  <div className="space-y-3 relative z-10 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={`overdue-ske-${i}`} className="flex justify-between items-center p-3 rounded-xl bg-slate-500/5 animate-pulse">
                          <div className="space-y-1.5 w-1/2">
                            <div className="h-3.5 bg-slate-500/10 rounded w-3/4" />
                            <div className="h-2.5 bg-slate-500/10 rounded w-1/2" />
                          </div>
                          <div className="h-4.5 bg-slate-500/10 rounded w-1/4" />
                        </div>
                      ))
                    ) : (
                      <>
                        {loans
                          .filter(l => (l.status !== 'Pago' || l.capital > 0) && isOverdue(l))
                          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                          .slice(0, 3)
                          .map(loan => (
                            <div key={`overdue-dash-${loan.id}`} className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:bg-red-500/[0.03] transition-all",
                              isDark ? "bg-red-500/[0.01]" : "bg-red-50/20"
                            )}>
                              <div className="flex flex-col">
                                <span className={cn("text-xs font-bold uppercase tracking-tight", isDark ? "text-slate-200" : "text-slate-800")}>{loan.clientName}</span>
                                <span className="text-[9px] text-red-500 font-bold tracking-wider mt-1">
                                  ATRASO {Math.abs(getDaysDiff(loan.dueDate))} DIAS
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-red-500 font-mono">R$ {loan.totalBruto.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        {loans.filter(l => (l.status !== 'Pago' || l.capital > 0) && isOverdue(l)).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center opacity-70">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
                               <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                             </div>
                             <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Portfólio em Conformidade</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sparkline graphic inside */}
                  <OverdueSparkline />

                  {/* Aesthetic Footer Watermark */}
                  <div className="absolute bottom-2 right-4 text-[7px] font-black tracking-[0.3em] text-slate-400/20 uppercase pointer-events-none">
                    OVERDUE MONITOR
                  </div>
                </motion.div>

                {/* POSTER 3: PRÓXIMAS LIQUIDAÇÕES (EMERALD JADE) */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn(
                    "p-8 sm:p-10 rounded-[32px] border transition-all duration-300 relative overflow-hidden group cursor-pointer", 
                    isDark ? "bg-[#0d0e12] border-slate-800 hover:border-emerald-500/50" : "bg-white border-slate-200/80 shadow-md shadow-slate-100/40 hover:border-emerald-500/50"
                  )}
                  whileHover={{ y: -4 }}
                >
                  {/* Subtle Stamp Overlay */}
                  <div className="absolute top-4 right-4 opacity-15 group-hover:opacity-30 transition-opacity">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                  </div>

                  {/* Header Badge */}
                  <div className="relative z-10 flex flex-col mb-6">
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-1">LIQUIDITY & MATURITY</div>
                    <h3 className="text-[12px] sm:text-[13px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981]" />
                      Próximas Liquidações
                    </h3>
                  </div>

                  <div className="space-y-3 relative z-10 max-h-[190px] overflow-y-auto no-scrollbar pr-1">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={`upcoming-ske-${i}`} className="flex justify-between items-center p-3 rounded-xl bg-slate-500/5 animate-pulse">
                          <div className="space-y-1.5 w-1/2">
                            <div className="h-3.5 bg-slate-500/10 rounded w-3/4" />
                            <div className="h-2.5 bg-slate-500/10 rounded w-1/2" />
                          </div>
                          <div className="h-4.5 bg-slate-500/10 rounded w-1/4" />
                        </div>
                      ))
                    ) : (
                      <>
                        {loans
                          .filter(l => l.status === 'Pendente' && !isOverdue(l))
                          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                          .slice(0, 3)
                          .map(loan => (
                            <div key={`upcoming-dash-${loan.id}`} className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:bg-emerald-500/[0.03] transition-all",
                              isDark ? "bg-emerald-500/[0.01]" : "bg-emerald-50/20"
                            )}>
                              <div className="flex flex-col">
                                <span className={cn("text-xs font-bold uppercase tracking-tight", isDark ? "text-slate-200" : "text-slate-800")}>{loan.clientName}</span>
                                <span className="text-[9px] text-slate-400 font-bold tracking-wider mt-1">
                                  VENCE {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-emerald-400 font-mono">R$ {loan.totalBruto.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        {loans.filter(l => l.status === 'Pendente' && !isOverdue(l)).length === 0 && (
                          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center opacity-70">
                             <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200/50 dark:border-white/10">
                               <Calendar className="w-5 h-5 text-slate-500" />
                             </div>
                             <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Sem Vencimentos Imediatos</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sparkline/Bar Graphic */}
                  <LiquidationBars />

                  {/* Aesthetic Footer Watermark */}
                  <div className="absolute bottom-2 right-4 text-[7px] font-black tracking-[0.3em] text-slate-400/20 uppercase pointer-events-none">
                    LIQUIDITY STATUS
                  </div>
                </motion.div>
              </div>

              <div className={cn(
                "p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border transition-all relative overflow-hidden group mb-10", 
                isDark ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]" : "bg-white border-slate-100 shadow-xl shadow-slate-200/50"
              )}>
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl group-hover:bg-emerald-500/[0.05] transition-colors" />
                  <div className="flex items-center justify-between mb-8 sm:mb-10 pb-4 border-b border-white/[0.03] relative z-10">
                      <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-slate-500 flex items-center gap-3 sm:gap-4">
                        <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        Linha do Tempo
                      </h3>
                      <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest hidden sm:block">Últimas Operações</span>
                  </div>
                  <div className="space-y-2 relative z-10">
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <div key={`timeline-ske-${i}`} className="flex justify-between items-center p-4 rounded-2xl bg-slate-500/5 animate-pulse">
                            <div className="space-y-2 w-1/2">
                              <div className="h-4 bg-slate-500/10 rounded w-2/3" />
                              <div className="h-3 bg-slate-500/10 rounded w-1/3" />
                            </div>
                            <div className="space-y-1 w-1/6 flex flex-col items-end">
                              <div className="h-3 bg-slate-500/10 rounded w-full" />
                              <div className="h-2 bg-slate-500/10 rounded w-1/2" />
                            </div>
                          </div>
                        ))
                      ) : (
                        actions.slice(0, 6).map((action) => (
                          <div key={action.id} className={cn(
                            "flex items-center justify-between p-4 rounded-2xl transition-all group/item border border-transparent",
                            isDark ? "hover:bg-white/[0.02] hover:border-white/[0.03]" : "hover:bg-slate-50 hover:border-slate-100"
                          )}>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className={cn("text-sm font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>{action.clientName}</span>
                                <span className={cn("text-[10px] font-bold uppercase tracking-tight mt-1", isDark ? "text-slate-500" : "text-slate-400")}>{action.description}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-black text-slate-400 block mb-1 font-mono uppercase tracking-tighter">{safeFormatDate(action.date, 'dd/MM HH:mm')}</span>
                              <div className="flex items-center justify-end gap-1 opacity-20">
                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                                <div className="w-1 h-1 rounded-full bg-slate-500" />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                  </div>
              </div>
              </motion.div>
            ) : (
              <motion.div 
                key="tab-others"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn("glass-card overflow-hidden transition-colors shadow-2xl", !isDark && "bg-white border-slate-200")}
              >
                {(activeTab === 'Clientes' || activeTab === 'Empréstimos' || activeTab === 'Quitados') && (
                     <div className={cn("p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors", isDark ? "border-white/[0.03]" : "border-slate-100")}>
                       <div className="relative group flex-1">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <input 
                           type="text"
                           placeholder={`Buscar em ${activeTab.toLowerCase()}...`}
                           className={cn(
                             "w-full rounded-xl py-3 pl-12 pr-10 transition-all text-sm font-bold border focus:border-brand-primary/30 focus:outline-none",
                             isDark 
                               ? "bg-white/[0.02] text-white placeholder:text-slate-600 focus:bg-white/[0.04] border-white/[0.05]" 
                               : "bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white border-slate-200"
                           ) || ""}
                           value={command || ""}
                           onChange={(e) => {
                             setCommand(e.target.value);
                             if (e.target.value) setFilterDate('');
                           }}
                         />
                       </div>
                       <div className="flex items-center gap-3">
                         {activeTab === 'Quitados' && loans.some(l => l.status === 'Pago' && l.capital <= 0) && (
                           <button
                             onClick={deletePaidLoans}
                             className={cn(
                               "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shrink-0 shadow-lg shadow-brand-danger/10",
                               isDark 
                                 ? "bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/20" 
                                 : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                             )}
                             title="Excluir todos os empréstimos quitados"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                             <span className="hidden sm:inline">Excluir Todos Quitados</span>
                           </button>
                         )}
                         <div className={cn("flex items-center gap-2 border rounded-xl px-3 py-1.5 focus-within:border-brand-primary/50 transition-colors", isDark ? "bg-transparent border-white/10" : "bg-transparent border-slate-200")}>
                           <Calendar className="w-3.5 h-3.5 text-slate-500" />
                           <select 
                             className={cn("bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer", isDark ? "text-white" : "text-slate-900")}
                             value={filterDate || ""}
                             onChange={(e) => {
                               setFilterDate(e.target.value);
                               if (e.target.value) setCommand('');
                             }}
                           >
                             <option value="">Dia</option>
                             {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                               <option key={day} value={day.toString()}>Dia {day}</option>
                             ))}
                           </select>
                         </div>
                       </div>
                     </div>
                   )}
                   <div className="p-1">
                     <AnimatePresence mode="wait">
                       {activeTab === 'Clientes' ? (
                         <motion.div 
                           key="view-clientes"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                           className="space-y-4"
                         >
                           {/* Desktop Table */}
                   <div className="hidden lg:block overflow-hidden rounded-[32px] border border-white/[0.05] bg-white/[0.01]">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className={cn("border-b transition-colors", isDark ? "bg-white/[0.02] border-white/[0.05]" : "bg-slate-50 border-slate-100")}>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Contratos Ativos</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Capital em Aberto</th>
                           <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total a Receber</th>
                           <th className="px-8 py-6 text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] text-right">Ações (Total: {stats.totalClients})</th>
                         </tr>
                       </thead>
                       <tbody className={cn("divide-y transition-colors", isDark ? "divide-white/[0.05]" : "divide-slate-100")}>
                         {clients.length === 0 ? (
                           <tr>
                             <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-medium font-mono uppercase tracking-widest text-[10px]">
                               {command.trim() ? 'Nenhum cliente encontrado para esta busca.' : 'Nenhum cliente cadastrado.'}
                             </td>
                           </tr>
                         ) : (
                           clients.map((client, index) => (
                             <tr 
                               key={`client-row-${client.name}-${index}`}
                               onClick={() => setViewingClientDetail(client)}
                               className={cn(
                                 "group transition-all cursor-pointer", 
                                 isDark ? "hover:bg-brand-primary/[0.03]" : "hover:bg-slate-50"
                               )}
                             >
                               <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black uppercase text-xs border border-brand-primary/20">
                                     {client.name.charAt(0)}
                                   </div>
                                   <span className={cn("font-black tracking-tight text-sm uppercase transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                     {client.name}
                                   </span>
                                 </div>
                               </td>
                               <td className="px-8 py-6">
                                 <div className="flex items-center gap-2">
                                   <span className={cn(
                                     "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                     client.loanCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                                   )}>
                                     {client.loanCount} Ativo{client.loanCount !== 1 ? 's' : ''}
                                   </span>
                                   {client.totalLoans > client.loanCount && (
                                     <span className="text-[10px] font-bold text-slate-600">
                                       / {client.totalLoans} total
                                     </span>
                                   )}
                                 </div>
                               </td>
                               <td className="px-8 py-6">
                                 <span className={cn("text-xs font-bold font-mono", isDark ? "text-slate-300" : "text-slate-600")}>
                                   R$ {client.activeCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </span>
                               </td>
                               <td className="px-8 py-6">
                                 <span className="text-xs font-black text-brand-primary font-mono">
                                   R$ {client.activeDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </span>
                               </td>
                               <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
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
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                    title="Fazer Novo Empréstimo"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Novo Empréstimo</span>
                                  </button>
                                </td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-4 px-2">
                    <div className="flex items-center justify-between px-6 py-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Clientes na Base</span>
                      <span className="text-sm font-black text-brand-primary">{stats.totalClients}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {clients.length === 0 ? (
                        <div className="py-20 text-center text-slate-500 font-medium font-mono uppercase tracking-widest text-[10px] rounded-[32px] border border-white/5 bg-white/[0.01]">
                          {command.trim() ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                        </div>
                      ) : (
                        clients.map((client, index) => (
                          <div 
                            key={`client-mobile-${client.name}-${index}`} 
                            onClick={() => setViewingClientDetail(client)}
                            className={cn(
                              "relative overflow-hidden p-6 rounded-[32px] border transition-all active:scale-[0.98]", 
                              isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-xl"
                            )}
                          >
                            {/* Decorative line */}
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-primary/20" />
                            
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black uppercase text-sm border border-brand-primary/20">
                                  {client.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <h3 className={cn("font-black text-sm uppercase tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{client.name}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit",
                                      client.loanCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                                    )}>
                                      {client.loanCount} Ativo{client.loanCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                                      {client.totalLoans} Total
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-6 h-6 text-slate-600" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className={cn("p-4 rounded-2xl border transition-colors", isDark ? "bg-white/[0.03] border-white/[0.05]" : "bg-slate-50 border-slate-100")}>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Capital Ativo</span>
                                <p className={cn("text-xs font-bold leading-none font-mono", isDark ? "text-white" : "text-slate-900")}>
                                  R$ {client.activeCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className={cn("p-4 rounded-2xl border transition-colors", isDark ? "bg-brand-primary/5 border-brand-primary/10" : "bg-brand-primary/[0.03] border-brand-primary/10")}>
                                 <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest block mb-1">Total a Receber</span>
                                 <p className="text-xs font-black text-brand-primary leading-none font-mono">
                                   R$ {client.activeDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                 </p>
                               </div>
                             </div>

                             <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                                 className="w-full py-2.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-brand-primary hover:text-black flex items-center justify-center gap-1.5"
                               >
                                 <Plus className="w-3.5 h-3.5" />
                                 <span>Novo Empréstimo</span>
                               </button>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                         </motion.div>
                       ) : activeTab === 'Transações' ? (
                         <motion.div 
                           key="view-transacoes"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                           className="p-6 sm:p-0 space-y-10"
                         >
                           {/* Summary Cards */}
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                             <div className={cn("p-8 rounded-[32px] border transition-all", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl")}>
                               <div className="flex items-center gap-4 mb-4">
                                 <div className="p-3 bg-brand-primary/10 rounded-2xl">
                                   <DollarSign className="w-5 h-5 text-brand-primary" />
                                 </div>
                                 <div>
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total Recebido</p>
                                   <h4 className={cn("text-lg font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>no período</h4>
                                 </div>
                               </div>
                               <p className="text-2xl font-black text-brand-primary">
                                 {formatCurrency(stats.capitalRecebido + stats.jurosRealizados)}
                               </p>
                             </div>

                             <div className={cn("p-8 rounded-[32px] border transition-all", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl")}>
                               <div className="flex items-center gap-4 mb-4">
                                 <div className="p-3 bg-brand-primary/10 rounded-2xl">
                                   <TrendingUp className="w-5 h-5 text-brand-primary" />
                                 </div>
                                 <div>
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Juros Realizados</p>
                                   <h4 className={cn("text-lg font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>Lucro Líquido</h4>
                                 </div>
                               </div>
                               <p className="text-2xl font-black text-brand-primary">
                                 {formatCurrency(stats.jurosRealizados)}
                               </p>
                             </div>

                             <div className={cn("p-8 rounded-[32px] border transition-all", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl")}>
                               <div className="flex items-center gap-4 mb-4">
                                 <div className="p-3 bg-brand-accent/10 rounded-2xl">
                                   <Users className="w-5 h-5 text-brand-accent" />
                                 </div>
                                 <div>
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Capital Recuperado</p>
                                   <h4 className={cn("text-lg font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>Amortizações</h4>
                                 </div>
                               </div>
                               <p className={cn("text-2xl font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                 {formatCurrency(stats.capitalRecebido)}
                               </p>
                             </div>
                           </div>

                           <div className="space-y-4">
                             <div className="flex items-center justify-between px-2">
                               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                                 <span className="w-2 h-2 bg-brand-primary rounded-full" />
                                 Detalhando Recebimentos
                                </h3>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={handleToggleInterest}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                      showOnlyInterest ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-500 hover:text-white"
                                    )}
                                  >
                                    Juros
                                  </button>
                                  <button 
                                    onClick={handleToggleCapital}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                      showOnlyCapital ? "bg-brand-primary text-black" : "bg-white/5 text-slate-500 hover:text-white"
                                    )}
                                  >
                                    Amortizações
                                  </button>
                                  <button 
                                    onClick={handleTogglePayoff}
                                    className={cn(
                                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                      showOnlyPayoff ? "bg-amber-500 text-white" : "bg-white/5 text-slate-500 hover:text-white"
                                    )}
                                  >
                                    Quitados
                                  </button>
                                </div>
                              </div>
                              
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
                          Array.from({ length: 5 }).map((_, rowIndex) => (
                            <tr key={`trans-ske-${rowIndex}`} className="animate-pulse">
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-2/3" />
                              </td>
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-3/4" />
                              </td>
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-1/2" />
                              </td>
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-1/3" />
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="h-8 bg-slate-500/10 rounded w-24 ml-auto" />
                              </td>
                            </tr>
                          ))
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
                          filteredTransactions.slice(0, visibleTransactionsCount).map((action) => (
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
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={`trans-ske-mob-${i}`} className="glass-card p-5 space-y-4 border border-white/5 animate-pulse">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 w-1/2">
                              <div className="h-3 bg-slate-500/10 rounded w-1/3" />
                              <div className="h-4 bg-slate-500/10 rounded w-3/4" />
                              <div className="h-3 bg-slate-500/10 rounded w-2/3" />
                            </div>
                            <div className="h-5 bg-slate-500/10 rounded w-1/4" />
                          </div>
                          <div className="h-8 bg-slate-500/10 rounded w-full" />
                        </div>
                      ))
                    ) : filteredTransactions.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                         {command.trim() ? 'Nenhuma transação encontrada.' : 'Nenhuma transação registrada.'}
                      </div>
                    ) : (
                      filteredTransactions.slice(0, visibleTransactionsCount).map((action) => (
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

                  {filteredTransactions.length > visibleTransactionsCount && (
                    <div className="flex justify-center pt-6">
                      <button
                        onClick={() => setVisibleTransactionsCount(prev => prev + 50)}
                        className={cn(
                          "px-6 py-4 border font-bold uppercase tracking-widest text-[9px] rounded-2xl transition-all",
                          isDark 
                            ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300" 
                            : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600 shadow-sm"
                        )}
                      >
                        Carregar Mais Transações ({filteredTransactions.length - visibleTransactionsCount} restantes)
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'Pagamento' ? (
                         <motion.div 
                           key="view-pagamento"
                           initial={{ opacity: 0, scale: 0.98 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.98 }}
                           transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                           className="p-6 sm:p-12 flex flex-col items-center"
                         >
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
                </motion.div>
              ) : activeTab === 'Relatórios' ? (
                         <motion.div 
                           key="view-relatorios"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                           className="p-6 sm:p-0 space-y-10"
                         >
                  <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-8 rounded-[40px] border transition-all", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl")}>
                    <div className="lg:col-span-4 space-y-4">
                      <div>
                        <h2 className={cn("text-xl font-black tracking-tight uppercase transition-colors", isDark ? "text-white" : "text-slate-900")}>Centro de Performance</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Análise Consolidada {ptBrMonths[reportMonth]} • {reportYear}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 p-1 bg-black/10 rounded-xl w-fit">
                        <button 
                          onClick={() => setActiveReportTab('mensal')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeReportTab === 'mensal' ? "bg-brand-primary text-black" : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          Análise
                        </button>
                        <button 
                          onClick={() => setActiveReportTab('fechamentos')}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeReportTab === 'fechamentos' ? "bg-brand-primary text-black" : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          Histórico
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
                      <div className={cn("flex items-center gap-3 p-1.5 rounded-2xl border transition-all", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-100")}>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 group">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <select 
                            className={cn(
                              "bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer transition-colors",
                              isDark ? "text-white [color-scheme:dark]" : "text-slate-900 [color-scheme:light]"
                            )}
                            value={reportMonth}
                            onChange={(e) => {
                              setReportMonth(parseInt(e.target.value));
                              setViewingReport(false);
                            }}
                          >
                            {ptBrMonths.map((month, index) => (
                              <option key={month} value={index} className={isDark ? "bg-black" : "bg-white"}>{month}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                          <select 
                            className={cn(
                              "bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer transition-colors",
                              isDark ? "text-white [color-scheme:dark]" : "text-slate-900 [color-scheme:light]"
                            )}
                            value={reportYear}
                            onChange={(e) => {
                              setReportYear(parseInt(e.target.value));
                              setViewingReport(false);
                            }}
                          >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year} className={isDark ? "bg-black" : "bg-white"}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {monthlyClosures.some(c => c.month === reportMonth && c.year === reportYear) ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em]">
                          <Check className="w-3 h-3" />
                          Auditado
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em]">
                          <Clock className="w-3 h-3" />
                          Em Aberto
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-3 flex justify-end">
                      <button
                        onClick={handleCloseMonth}
                        className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-brand-primary to-amber-600 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all hover:-translate-y-1 active:translate-y-0"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {monthlyClosures.some(c => c.month === reportMonth && c.year === reportYear) ? 'Refazer Fechamento' : 'Arquivar Período'}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeReportTab === 'mensal' ? (
                      <motion.div 
                        key="report-monthly"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                      >
                        {!viewingReport ? (
                          <div className={cn(
                            "p-10 md:p-16 rounded-[40px] border text-center flex flex-col items-center justify-center max-w-3xl mx-auto transition-all duration-300",
                            isDark 
                              ? "bg-white/[0.01] border-white/5" 
                              : "bg-white border-slate-200 shadow-xl"
                          )}>
                            <div className={cn(
                              "w-20 h-20 rounded-full flex items-center justify-center mb-6 border animate-pulse",
                              isDark ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" : "bg-amber-50 border-amber-200 text-amber-600"
                            )}>
                              <FileText className="w-10 h-10" />
                            </div>
                            
                            <h3 className={cn("text-2xl font-black uppercase tracking-tight mb-2", isDark ? "text-white" : "text-slate-950")}>
                              Relatório de Performance
                            </h3>
                            
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6">
                              Ciclo de {ptBrMonths[reportMonth]} de {reportYear}
                            </p>
                            
                            <p className={cn("text-xs sm:text-sm max-w-md leading-relaxed mb-10", isDark ? "text-slate-400" : "text-slate-600")}>
                              Visualize a demonstração consolidada completa deste ciclo financeiro. O relatório gerado inclui os indicadores de lucratividade, distribuição de receita e fluxo de caixa sob gestão.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mb-10 text-left">
                              {[
                                { label: 'Demonstrativo Contábil', desc: 'Lançamentos detalhados de receitas de juros' },
                                { label: 'Metas e Rendimento', desc: 'Análise de performance sobre contratos ativos' },
                                { label: 'Distribuição de Fluxo', desc: 'Comparativo gráfico de juros e amortizações' },
                                { label: 'Assinatura e Autenticação', desc: 'Rastreabilidade digital com QR Code' }
                              ].map((item, index) => (
                                <div key={index} className={cn(
                                  "p-4 rounded-2xl border flex flex-col gap-1 transition-all",
                                  isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                                )}>
                                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isDark ? "text-slate-200" : "text-slate-800")}>
                                    {item.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{item.desc}</span>
                                </div>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => setViewingReport(true)}
                              className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-brand-primary text-slate-950 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-primary/10 hover:shadow-brand-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Visualizar Relatório Completo</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Elegant Back Navigation */}
                            <div className="flex justify-start no-print">
                              <button
                                onClick={() => setViewingReport(false)}
                                className={cn(
                                  "flex items-center gap-2 px-5 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                  isDark 
                                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300" 
                                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
                                )}
                              >
                                <ChevronLeft className="w-4 h-4" />
                                Voltar para Controle
                              </button>
                            </div>

                            <div id="printable-report" className="space-y-8 printable-content">
                              <div className="report-page font-sans shadow-none border-none p-10 rounded-[40px] bg-white text-black">
                            {/* Clean Professional Header */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-10 mb-12 gap-8 border-slate-200">
                              <div className="space-y-1">
                                <h1 className="text-2xl font-black tracking-tight uppercase leading-none text-slate-900">{userProfile?.displayName || 'Nexus Private'}</h1>
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-2 text-slate-400">Relatório Mensal de Performance</p>
                              </div>
                              <div className="text-left sm:text-right flex flex-col items-start sm:items-end w-full sm:w-auto">
                                 <div className="text-[10px] font-black px-4 py-2 rounded-xl mb-3 uppercase tracking-widest border w-full sm:w-auto text-center bg-slate-50 text-slate-900 border-slate-100">
                                   Ref: {ptBrMonths[reportMonth]} / {reportYear}
                                 </div>
                                 <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Emissão: {safeFormatDate(new Date().toISOString(), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>

                            {/* Executive Summary */}
                            <div className="mb-14">
                              <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3 text-slate-900">
                                <span className="w-2 h-2 bg-brand-primary rounded-full" />
                                Sumário Executivo
                              </h3>
                              <div className="border-l-4 border-brand-primary p-6 sm:p-8 rounded-tr-3xl rounded-br-3xl bg-slate-50">
                                <p className="text-xs sm:text-sm leading-relaxed font-medium text-slate-700">
                                  Este documento oficial apresenta a consolidação das operações financeiras de <b>{userProfile?.displayName || 'Nexus Private'}</b> referente ao ciclo de <b>{ptBrMonths[reportMonth]} de {reportYear}</b>. 
                                  Os dados aqui contidos refletem o movimento de capital liberado, as amortizações processadas e a colheita de rendimentos ativos sob gestão institucional. Esta análise visa fornecer transparência total sobre a liquidez e rentabilidade do portfólio no período.
                                </p>
                              </div>
                            </div>

                            {/* Clean Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-14">
                              {[
                                { label: 'Capital Liberado', value: monthlyReportStats.totalLent, sub: `${monthlyReportStats.loanCount} Contratos`, color: 'slate-900' },
                                { label: 'Total Recebido', value: monthlyReportStats.totalPayments, sub: `${monthlyReportStats.paymentCount} Transações`, color: 'emerald-600' },
                                { label: 'Lucro (Juros)', value: monthlyReportStats.interestPayments, sub: 'Rendimentos Reais', color: 'emerald-600' },
                                { label: 'Renda Estimada', value: monthlyReportStats.estimatedInterest, sub: 'Expectativa de Juros', color: 'amber-600' },
                                { label: 'Saldo Ativo', value: monthlyReportStats.currentOutstanding, sub: 'Em Aberto', color: 'slate-900' }
                              ].map((stat, i) => (
                                <div key={i} className="border p-6 rounded-xl flex flex-col justify-between items-center text-center bg-white border-slate-100">
                                  <span className="text-[9px] font-black uppercase tracking-widest mb-3 text-slate-400">{stat.label}</span>
                                  <div>
                                    <div className={cn(
                                      "text-xl font-black tracking-tight", 
                                      stat.color === 'emerald-600' ? "text-emerald-600" : 
                                      stat.color === 'amber-600' ? "text-amber-600" : "text-slate-900"
                                    )}>
                                      {formatCurrency(stat.value)}
                                    </div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-wider mt-1", isDark ? "text-white/20" : "text-slate-300")}>{stat.sub}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                             {/* Performance Chart & Distribution Section */}
                             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-14">
                               {/* Performance Chart */}
                               <div className="lg:col-span-8 border p-8 rounded-[32px] border-slate-100 bg-white flex flex-col justify-between">
                                 <div className="w-full">
                                   <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Evolução de Performance (Últimos 6 Meses)</h3>
                                     <div className="flex gap-4">
                                       <div className="flex items-center gap-1.5">
                                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                         <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Total Recebido</span>
                                       </div>
                                       <div className="flex items-center gap-1.5">
                                         <div className="w-2 h-2 rounded-full bg-slate-900" />
                                         <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Capital Liberado</span>
                                       </div>
                                     </div>
                                   </div>
                                   
                                   {/* Render vector chart */}
                                   {(() => {
                                     const maxVal = Math.max(...monthlyPerformanceHistory.map(d => Math.max(d.totalReceived, d.totalLent, 1000)));
                                     const scaleLimit = Math.ceil(maxVal * 1.15 / 1000) * 1000 || 1000;
                                     
                                     const width = 600;
                                     const height = 180;
                                     const paddingX = 40;
                                     const paddingY = 20;
                                     const chartWidth = width - paddingX * 2;
                                     const chartHeight = height - paddingY * 2;
                                     
                                     const getX = (index: number) => paddingX + (index / 5) * chartWidth;
                                     const getY = (val: number) => paddingY + chartHeight - (val / scaleLimit) * chartHeight;
                                     
                                     const receivedPoints = monthlyPerformanceHistory.map((d, index) => ({ x: getX(index), y: getY(d.totalReceived) }));
                                     const lentPoints = monthlyPerformanceHistory.map((d, index) => ({ x: getX(index), y: getY(d.totalLent) }));
                                     
                                     const receivedLinePath = receivedPoints.length > 0
                                       ? receivedPoints.reduce((acc, p, index) => acc + `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
                                       : '';
                                       
                                     const receivedAreaPath = receivedPoints.length > 0
                                       ? `${receivedLinePath} L ${receivedPoints[receivedPoints.length - 1].x} ${paddingY + chartHeight} L ${receivedPoints[0].x} ${paddingY + chartHeight} Z`
                                       : '';
                                       
                                     const lentLinePath = lentPoints.length > 0
                                       ? lentPoints.reduce((acc, p, index) => acc + `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')
                                       : '';

                                     const ticks = [scaleLimit, scaleLimit * 0.66, scaleLimit * 0.33, 0];

                                     return (
                                       <div className="relative w-full overflow-hidden">
                                         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-slate-400 font-bold text-[8px]" style={{ overflow: 'visible' }}>
                                           <defs>
                                             <linearGradient id="chart-received-gradient" x1="0" y1="0" x2="0" y2="1">
                                               <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                                               <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                             </linearGradient>
                                           </defs>
                                           
                                           {/* Horizontal Gridlines */}
                                           {ticks.map((tick, index) => {
                                             const y = getY(tick);
                                             return (
                                               <g key={index} className="opacity-40">
                                                 <line 
                                                   x1={paddingX} 
                                                   y1={y} 
                                                   x2={width - paddingX} 
                                                   y2={y} 
                                                   stroke="#e2e8f0" 
                                                   strokeWidth="0.5" 
                                                   strokeDasharray="3 3" 
                                                 />
                                                 <text 
                                                   x={paddingX - 8} 
                                                   y={y + 3} 
                                                   textAnchor="end" 
                                                   fill="#94a3b8" 
                                                   className="font-bold font-sans text-[7px]"
                                                 >
                                                   {formatCurrency(tick).replace('R$', '').trim()}
                                                 </text>
                                               </g>
                                             );
                                           })}
                                           
                                           {/* Vertical Gridlines & X labels */}
                                           {monthlyPerformanceHistory.map((d, index) => {
                                             const x = getX(index);
                                             return (
                                               <g key={index}>
                                                 <line 
                                                   x1={x} 
                                                   y1={paddingY} 
                                                   x2={x} 
                                                   y2={paddingY + chartHeight} 
                                                   stroke="#e2e8f0" 
                                                   strokeWidth="0.5" 
                                                   className="opacity-20"
                                                 />
                                                 <text 
                                                   x={x} 
                                                   y={paddingY + chartHeight + 14} 
                                                   textAnchor="middle" 
                                                   fill="#64748b" 
                                                   className="font-bold text-[8px] uppercase tracking-wider font-sans"
                                                 >
                                                   {d.monthName}
                                                 </text>
                                               </g>
                                             );
                                           })}
                                           
                                           {/* Total Received Area (Lucro / Retorno) */}
                                           {receivedPoints.length > 0 && (
                                             <>
                                               <path 
                                                 d={receivedAreaPath} 
                                                 fill="url(#chart-received-gradient)" 
                                               />
                                               <path 
                                                 d={receivedLinePath} 
                                                 fill="none" 
                                                 stroke="#10b981" 
                                                 strokeWidth="2" 
                                                 strokeLinecap="round" 
                                                 strokeLinejoin="round" 
                                               />
                                             </>
                                           )}
                                           
                                           {/* Capital Deployed Line (Novos Aportes) */}
                                           {lentPoints.length > 0 && (
                                             <path 
                                               d={lentLinePath} 
                                               fill="none" 
                                               stroke="#0f172a" 
                                               strokeWidth="1.5" 
                                               strokeDasharray="4 2"
                                               strokeLinecap="round" 
                                               strokeLinejoin="round" 
                                               className="opacity-70"
                                             />
                                           )}
                                           
                                           {/* Data dots on the lines */}
                                           {monthlyPerformanceHistory.map((d, index) => {
                                             const rx = getX(index);
                                             const ry = getY(d.totalReceived);
                                             const lx = getX(index);
                                             const ly = getY(d.totalLent);
                                             
                                             return (
                                               <g key={index}>
                                                 {/* Capital Deployed Dot */}
                                                 {d.totalLent > 0 && (
                                                   <circle 
                                                     cx={lx} 
                                                     cy={ly} 
                                                     r="3" 
                                                     fill="#0f172a" 
                                                     stroke="#ffffff" 
                                                     strokeWidth="1" 
                                                   />
                                                 )}
                                                 
                                                 {/* Total Received Dot */}
                                                 <circle 
                                                   cx={rx} 
                                                   cy={ry} 
                                                   r="4.5" 
                                                   fill="#10b981" 
                                                   stroke="#ffffff" 
                                                   strokeWidth="1.5" 
                                                 />
                                                 
                                                 {/* Values above final point of selected month or non-zero points */}
                                                 {(index === 5 || (index % 2 === 0 && d.totalReceived > 0)) && (
                                                   <text
                                                     x={rx}
                                                     y={ry - 8}
                                                     textAnchor="middle"
                                                     fill="#059669"
                                                     className="font-bold text-[7.5px] font-sans"
                                                   >
                                                     {formatCurrency(d.totalReceived).replace('R$', '').trim()}
                                                   </text>
                                                 )}
                                               </g>
                                             );
                                           })}
                                         </svg>
                                       </div>
                                     );
                                   })()}
                                 </div>
                               </div>
                               
                               {/* Simplified Progress Section / Distribution */}
                               <div className="lg:col-span-4 border p-8 rounded-[32px] border-slate-100 bg-white flex flex-col justify-between">
                                 <div className="w-full">
                                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 pb-4 border-b border-slate-100">Distribuição de Receita</h3>
                                   <div className="space-y-10">
                                     <div className="space-y-4">
                                       <div className="flex justify-between items-end">
                                         <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-900">Amortização de Capital</span>
                                         <span className="text-xs font-black text-slate-900">{(monthlyReportStats.capitalPayments / (monthlyReportStats.totalPayments || 1) * 100).toFixed(1)}%</span>
                                       </div>
                                       <div className="h-1 rounded-full overflow-hidden bg-slate-100">
                                         <div className="h-full rounded-full bg-slate-900" style={{ width: `${(monthlyReportStats.capitalPayments / (monthlyReportStats.totalPayments || 1)) * 100}%` }} />
                                       </div>
                                     </div>
                                     <div className="space-y-4">
                                       <div className="flex justify-between items-end">
                                         <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-900">Rendimento de Juros</span>
                                         <span className="text-xs font-black text-slate-900 font-sans">{(monthlyReportStats.interestPayments / (monthlyReportStats.totalPayments || 1) * 100).toFixed(1)}%</span>
                                       </div>
                                       <div className="h-1 rounded-full overflow-hidden bg-slate-100">
                                         <div className="h-full bg-brand-primary rounded-full" style={{ width: `${(monthlyReportStats.interestPayments / (monthlyReportStats.totalPayments || 1)) * 100}%` }} />
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             </div>

                            {/* Professional Sign-off & Footer */}
                            <div className={cn("mt-auto grid grid-cols-2 lg:grid-cols-4 gap-12 pt-12 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                              <div className="col-span-1 lg:col-span-3">
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
                                   <div className={cn("w-24 h-24 border rounded-2xl flex items-center justify-center p-3", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100")}>
                                     <QrCode className={cn("w-full h-full", isDark ? "text-white/10" : "text-slate-200")} />
                                   </div>
                                   <div className="w-full">
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest", isDark ? "text-white" : "text-slate-900")}>Controle de Autenticidade</p>
                                    <p className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter w-full">REF-{reportYear}{String(reportMonth + 1).padStart(2, '0')}-0229384-NXB-SECURE</p>
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
                              <button
                                onClick={() => shareAsPDF(true, 'pdf')}
                                disabled={isGeneratingPDF}
                                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 border border-slate-200"
                              >
                                {isGeneratingPDF ? (
                                  <div className="w-4 h-4 border-2 border-slate-900/35 border-t-slate-900 rounded-full animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span>{isGeneratingPDF ? 'Gerando...' : 'Baixar'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="report-history"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-10"
                      >
                        <div className="flex items-center justify-between px-4">
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                            <span className="w-2 h-2 bg-brand-primary rounded-full" />
                            Histórico de Fechamentos
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {monthlyClosures.length === 0 ? (
                            <div className="col-span-full py-20 text-center glass-card border-white/5 bg-white/[0.01]">
                               <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                 <Database className="w-8 h-8 text-slate-600" />
                               </div>
                               <p className="text-slate-500 font-medium">Nenhum fechamento registrado no sistema.</p>
                            </div>
                          ) : (
                            [...monthlyClosures].sort((a,b) => b.year - a.year || b.month - a.month).map((closure) => (
                              <div key={closure.id} className={cn("p-8 rounded-[32px] border transition-all hover:-translate-y-1", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200 shadow-xl")}>
                                <div className="flex justify-between items-start mb-6">
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit">
                                       <Check className="w-2.5 h-2.5" />
                                       Validado
                                     </div>
                                     <h4 className={cn("text-lg font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                       {ptBrMonths[closure.month]} {closure.year}
                                     </h4>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Arquivado em</span>
                                    <span className="text-[10px] font-bold text-slate-400">{safeFormatDate(closure.closedAt, 'dd/MM/yyyy')}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8 pt-6 border-t border-white/10 text-center">
                                  <div className="text-left">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Lucro Real</span>
                                    <div className="text-emerald-500 font-black text-xs">R$ {(closure.stats.interestPayments || 0).toLocaleString('pt-BR')}</div>
                                  </div>
                                  <div>
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Renda Est.</span>
                                    <div className="text-amber-500 font-black text-xs">R$ {(closure.stats.estimatedInterest ?? 0).toLocaleString('pt-BR')}</div>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Movimentado</span>
                                    <div className={cn("font-black text-xs", isDark ? "text-white" : "text-slate-900")}>R$ {(closure.stats.totalPayments || 0).toLocaleString('pt-BR')}</div>
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    setReportMonth(closure.month);
                                    setReportYear(closure.year);
                                    setActiveReportTab('mensal');
                                    setViewingReport(true);
                                  }}
                                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Ver Relatório Detalhado
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : activeTab === 'Notificações' ? (
                <motion.div 
                  key="tab-notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className={cn(
                    "p-8 sm:p-12 rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-6",
                    isDark ? "bg-white/5 border border-white/5" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100"
                  )}>
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[24px] bg-brand-primary/10 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-brand-primary" />
                      </div>
                      <div>
                        <h2 className={cn("text-2xl sm:text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>Central de Alertas</h2>
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mt-1">Nexus Private Intelligence</p>
                      </div>
                    </div>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => {
                          notifications.forEach(n => markNotificationAsRead(n.id));
                        }}
                        className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] hover:underline"
                      >
                        Arquivar Todas
                      </button>
                    )}
                  </div>

                  <div className="grid gap-6">
                    {notifications.length === 0 ? (
                      <div className={cn(
                        "p-12 sm:p-20 rounded-[40px] text-center border-2 border-dashed",
                        isDark ? "border-white/5" : "border-slate-100 bg-white"
                      )}>
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-500/20 mb-8 flex items-center justify-center mx-auto">
                          <Check className="w-10 h-10 text-emerald-500 opacity-50" />
                        </div>
                        <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Sistema em Compliance</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium">Não há notificações ou atrasos registrados no momento.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <motion.div 
                          layout
                          key={n.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "group relative p-8 sm:p-10 rounded-[40px] border transition-all",
                            isDark ? "bg-white/5 border-white/5 hover:bg-white/[0.08]" : "bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row items-start gap-8">
                            <div className={cn(
                              "w-16 h-16 rounded-[24px] flex items-center justify-center flex-shrink-0 shadow-lg",
                              n.type === 'overdue' ? "bg-rose-500/10 text-rose-500 shadow-rose-500/10" : "bg-brand-primary/10 text-brand-primary shadow-brand-primary/10"
                            )}>
                              {n.type === 'overdue' ? <AlertTriangle className="w-8 h-8" /> : <Calendar className="w-8 h-8" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                                <div className="flex items-center gap-4">
                                  <h4 className={cn("text-xl font-black tracking-tight uppercase", isDark ? "text-white" : "text-slate-900")}>{n.item.clientName}</h4>
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    n.type === 'overdue' ? "bg-rose-500/20 text-rose-500" : "bg-brand-primary/20 text-brand-primary"
                                  )}>
                                    {n.type === 'overdue' ? 'Atrasado' : 'Vencimento'}
                                  </span>
                                </div>
                                <span className="text-xs font-black text-slate-500 bg-white/5 dark:bg-black/10 px-4 py-2 rounded-xl tabular-nums">
                                  {safeFormatDate(n.date, 'dd/MM/yyyy')}
                                </span>
                              </div>
                              <p className={cn("text-base leading-relaxed mb-8 font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
                                {n.message}
                              </p>
                              
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                <button 
                                  onClick={() => {
                                    if (n.item.status === 'Agendado') {
                                      changeTab('Agendados');
                                    } else {
                                      changeTab('Empréstimos');
                                      if (n.type === 'overdue') setShowOnlyOverdue(true);
                                    }
                                    setCommand(n.item.clientName);
                                    setFilterDate('');
                                    markNotificationAsRead(n.id);
                                  }}
                                  className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-black rounded-[24px] text-[12px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-brand-primary/30 transition-all active:scale-95"
                                >
                                  Gerenciar Contrato
                                </button>
                                <button 
                                  onClick={() => markNotificationAsRead(n.id)}
                                  className={cn(
                                    "w-full sm:w-auto px-8 py-4 rounded-[24px] text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 border",
                                    isDark ? "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                  )}
                                >
                                  Arquivar Alerta
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : activeTab === 'Configurações' ? (
                <motion.div 
                  key="tab-configuracoes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-xl mx-auto py-8 px-4 sm:px-6"
                >
                  {activeSettingsSection === 'menu' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 'perfil', title: 'Perfil', subtitle: 'Identidade e Branding', icon: <UserIcon className="w-5 h-5" /> },
                        { id: 'recebimentos', title: 'Financeiro', subtitle: 'PIX e Instituição', icon: <Wallet className="w-5 h-5" /> },
                        { id: 'mensagem', title: 'Cobrança', subtitle: 'Template WhatsApp', icon: <MessageCircle className="w-5 h-5" /> },
                        { id: 'dados', title: 'Ecossistema', subtitle: 'Backup e Segurança', icon: <Database className="w-5 h-5" /> },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveSettingsSection(item.id as 'menu' | 'perfil' | 'recebimentos' | 'regras' | 'mensagem' | 'aparencia' | 'dados')}
                          className="flex flex-col items-start gap-4 p-6 rounded-3xl transition-all border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-brand-primary/30 group"
                        >
                          <div className="p-3 rounded-xl bg-white/5 text-slate-400 group-hover:text-brand-primary transition-colors">
                            {item.icon}
                          </div>
                          <div className="text-left">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">{item.title}</h4>
                            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.1em] mt-1 line-clamp-1">{item.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <motion.div 
                      key={`section-${activeSettingsSection}`}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden"
                    >
                      <div className="p-8 space-y-8">
                        {activeSettingsSection === 'perfil' && (
                          <div className="space-y-8">
                            <div className="flex justify-center">
                              <div className="relative group">
                                <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:border-[#FFD700]/50">
                                  {newProfilePicture ? (
                                    <img src={newProfilePicture} className="w-full h-full object-cover" alt="Preview" />
                                  ) : (
                                    <UserIcon className="w-8 h-8 text-slate-700" />
                                  )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[32px]">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest text-[#FFD700]">Mudar</span>
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
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Institucional</label>
                              <input 
                                type="text"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FFD700] focus:outline-none transition-all"
                              />
                            </div>


                          </div>
                        )}

                        {activeSettingsSection === 'recebimentos' && (
                          <div className="space-y-8">
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave PIX</label>
                                <input 
                                  type="text"
                                  value={newPixKey}
                                  onChange={(e) => setNewPixKey(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FFD700] focus:outline-none transition-all"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titular</label>
                                <input 
                                  type="text"
                                  value={newPixName}
                                  onChange={(e) => setNewPixName(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-[#FFD700] focus:outline-none transition-all"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Instituição Bancária</label>
                              <div className="grid grid-cols-4 gap-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                                {BRAZILIAN_BANKS.map((bank) => (
                                  <button
                                    key={bank.id}
                                    onClick={() => setNewPixBank(bank.name)}
                                    className={cn(
                                      "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                                      newPixBank === bank.name 
                                        ? "bg-[#FFD700]/10 border-[#FFD700]" 
                                        : "bg-white/5 border-transparent hover:border-white/10"
                                    )}
                                  >
                                    <div 
                                      className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg"
                                      style={{ backgroundColor: bank.color, color: bank.textColor || '#FFFFFF' }}
                                    >
                                      {bank.short}
                                    </div>
                                    <span className="text-[7px] font-black text-slate-500 uppercase truncate w-full text-center">
                                      {bank.name.split(' ')[0]}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>


                          </div>
                        )}
                        {activeSettingsSection === 'mensagem' && (
                          <div className="space-y-8">
                            {/* Standard Template */}
                            <div className="space-y-4">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Template de Cobrança Padrão</label>
                              <textarea 
                                value={systemSettings.whatsappTemplate}
                                onChange={(e) => setSystemSettings(prev => ({ ...prev, whatsappTemplate: e.target.value }))}
                                rows={5}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xs leading-relaxed font-medium text-slate-300 focus:border-brand-primary focus:outline-none transition-all placeholder:text-slate-800"
                              />
                              <div className="flex flex-wrap gap-2">
                                {['{nome}', '{valor do capital}', '{valor do juros}', '{vencimento}', '{pix}'].map(tag => (
                                  <button 
                                    key={tag}
                                    onClick={() => setSystemSettings(prev => ({ ...prev, whatsappTemplate: prev.whatsappTemplate + tag }))}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-brand-primary transition-all"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Overdue Template */}
                            <div className="space-y-4 pt-6 border-t border-white/[0.05]">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Template de Cobrança de Atrasados</label>
                              <textarea 
                                value={systemSettings.whatsappOverdueTemplate || ''}
                                onChange={(e) => setSystemSettings(prev => ({ ...prev, whatsappOverdueTemplate: e.target.value }))}
                                rows={5}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xs leading-relaxed font-medium text-slate-300 focus:border-brand-primary focus:outline-none transition-all placeholder:text-slate-800"
                              />
                              <div className="flex flex-wrap gap-2">
                                {['{nome}', '{capital}', '{juros}', '{total_bruto}', '{meses_atraso}', '{termo_meses}'].map(tag => (
                                  <button 
                                    key={tag}
                                    onClick={() => setSystemSettings(prev => ({ ...prev, whatsappOverdueTemplate: (prev.whatsappOverdueTemplate || '') + tag }))}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 hover:text-brand-primary transition-all"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-500 uppercase font-black leading-relaxed tracking-wider ml-1">
                                Dica: Utilize <span className="text-[#FFD700] font-bold">{'{meses_atraso}'}</span> (ex: 1, 2) e <span className="text-[#FFD700] font-bold">{'{termo_meses}'}</span> (mês/meses) para estruturar a mensagem de atrasados de maneira dinâmica.
                              </p>
                            </div>
                          </div>
                        )}

                        {activeSettingsSection === 'dados' && (
                          <div className="space-y-4">
                            <button 
                              onClick={() => {
                                const data = {
                                  loans,
                                  actions,
                                  monthlyClosures,
                                  settings: systemSettings,
                                  exportedAt: new Date().toISOString()
                                };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `nexus_backup.json`;
                                a.click();
                              }}
                              className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <Download className="w-5 h-5 text-[#FFD700]" />
                                <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">Backup System</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-700" />
                            </button>

                            <button 
                              onClick={requestNotificationPermission}
                              className={cn(
                                "w-full flex items-center justify-between p-6 rounded-2xl border transition-all active:scale-[0.98] lg:hover:scale-[1.01]",
                                isNativeNotificationsEnabled 
                                  ? "bg-emerald-500/10 border-emerald-500/30" 
                                  : "bg-white/5 border-white/10 hover:bg-white/10"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <Bell className={cn("w-5 h-5", isNativeNotificationsEnabled ? "text-emerald-500" : "text-slate-400")} />
                                <div className="text-left">
                                  <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">Notificações de Sistema</span>
                                  <p className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.1em] mt-0.5">
                                    {isNativeNotificationsEnabled ? 'Ativadas neste dispositivo' : 
                                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                     !("Notification" in window) ? ((window as any) !== (window as any).parent ? 'Restrito no Preview' : 'Não compatível') : 'Desativadas'}
                                  </p>
                                </div>
                              </div>
                              <div className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                isNativeNotificationsEnabled ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-slate-400 group-hover:text-slate-300"
                              )}>
                                {isNativeNotificationsEnabled ? 'Ativo' : 'Ativar'}
                              </div>
                            </button>
                          </div>
                        )}

                        <button 
                          onClick={() => {
                            if (activeSettingsSection === 'perfil' || activeSettingsSection === 'recebimentos') {
                              handleSaveProfile();
                            } else if (activeSettingsSection === 'regras' || activeSettingsSection === 'mensagem' || activeSettingsSection === 'aparencia') {
                              handleSaveSystemSettings(systemSettings);
                            }
                            setActiveSettingsSection('menu');
                          }}
                          className="w-full mt-8 py-5 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20"
                        >
                          Salvar Alterações e Voltar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : activeTab === 'Suporte' ? (
                <motion.div 
                  key="tab-suporte"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-xl mx-auto py-8 px-4 sm:px-6"
                >
                  <div className={cn(
                    "p-8 sm:p-12 rounded-[40px] border transition-all relative overflow-hidden",
                    isDark ? "bg-white/[0.02] border-white/5 shadow-2xl" : "bg-white border-slate-200 shadow-xl shadow-slate-200/50"
                  )}>
                    {/* Background gold glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-full md:w-2/5 flex flex-col items-center text-center p-6 rounded-3xl bg-black/20 border border-white/5">
                        <div className="relative w-24 h-24 mb-4 rounded-full p-1 bg-gradient-to-tr from-brand-primary to-amber-500 shadow-xl">
                          <div className={cn(
                            "w-full h-full rounded-full flex items-center justify-center font-black text-2xl uppercase",
                            isDark ? "bg-black text-white" : "bg-white text-slate-900"
                          )}>
                            RL
                          </div>
                          {/* Crown / Founder badge */}
                          <div className="absolute -bottom-1 -right-1 bg-brand-primary text-black p-1.5 rounded-full shadow-lg border border-black">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>

                        <h3 className={cn("text-lg font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                          Reyne Lucas
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary mt-1">
                          Criador do Sistema
                        </span>
                        
                        <div className="mt-4 px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20">
                          <span className="text-[8px] font-black uppercase tracking-widest text-brand-primary">Founder</span>
                        </div>
                      </div>

                      <div className="w-full md:w-3/5 space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Suporte do Sistema</h4>
                          <p className={cn("text-xs font-bold leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                            "Todo sistema tem seu criador." Projetado para proporcionar o mais alto nível de performance, controle financeiro e inteligência de crédito, o ecossistema Nexus Private foi integralmente planejado e desenvolvido por Reyne Lucas.
                          </p>
                        </div>

                        <div className="border-t border-white/5 pt-6 space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Canais de Atendimento</h4>
                          
                          {/* E-mail Contact */}
                          <div className={cn("flex items-center gap-4 p-4 rounded-2xl border", isDark ? "bg-white/[0.01] border-white/5" : "bg-slate-50 border-slate-100")}>
                            <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">E-mail Direto</p>
                              <a href="mailto:reyneperdigao@gmail.com" className={cn("text-xs font-black hover:text-brand-primary transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                reyneperdigao@gmail.com
                              </a>
                            </div>
                          </div>

                          {/* WhatsApp Contact */}
                          <a 
                            href="https://wa.me/5591993805974?text=Ol%C3%A1%20Reyne%20Lucas!%20Estou%20utilizando%20o%20sistema%20de%20gest%C3%A3o%20Nexus%20Private%20e%20gostaria%20de%20solicitar%20aux%C3%ADlio%20t%C3%A9cnico%20sobre%20o%20sistema."
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] hover:border-brand-primary/30 group",
                              isDark ? "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                            )}
                          >
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                              <MessageCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">WhatsApp Suporte</p>
                              <span className={cn("text-xs font-black group-hover:text-brand-primary transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                (91) 99380-5974
                              </span>
                            </div>
                            <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                              Online
                            </div>
                          </a>
                        </div>

                        <div className="pt-2">
                          <a 
                            href="https://wa.me/5591993805974?text=Ol%C3%A1%20Reyne%20Lucas!%20Estou%20utilizando%20o%20sistema%20de%20gest%C3%A3o%20Nexus%20Private%20e%20gostaria%20de%20solicitar%20aux%C3%ADlio%20t%C3%A9cnico%20sobre%20o%20sistema."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 bg-gradient-to-r from-brand-primary to-amber-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-4 h-4 fill-black" />
                            Falar no WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (


                         <motion.div 
                           key="view-others"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                           className="space-y-4"
                         >
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/[0.01] border-b border-white/[0.03]">
                          <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cliente</th>
                          {activeTab === 'Agendados' ? (
                            <>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Agendado</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Data para Efetuar</th>
                            </>
                          ) : activeTab === 'Quitados' ? (
                            <>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Pago</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Data</th>
                            </>
                          ) : (
                            <>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Valor Original</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Vencimento</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Juros</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Status</th>
                            </>
                          )}
                          {activeTab !== 'Quitados' && (
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Ações</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {loading ? (
                          Array.from({ length: 5 }).map((_, rowIndex) => (
                            <tr key={`loan-ske-${rowIndex}`} className="animate-pulse">
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-2/3" />
                              </td>
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-1/2" />
                              </td>
                              <td className="px-8 py-5">
                                <div className="h-4 bg-slate-500/10 rounded w-1/3" />
                              </td>
                              {activeTab !== 'Agendados' && activeTab !== 'Quitados' && (
                                <>
                                  <td className="px-8 py-5">
                                    <div className="h-4 bg-slate-500/10 rounded w-1/4" />
                                  </td>
                                  <td className="px-8 py-5">
                                    <div className="h-4 bg-slate-500/10 rounded w-1/4" />
                                  </td>
                                  <td className="px-8 py-5">
                                    <div className="h-4 bg-slate-500/10 rounded w-16" />
                                  </td>
                                </>
                              )}
                              {activeTab !== 'Quitados' && (
                                <td className="px-8 py-5 text-right">
                                  <div className="h-8 bg-slate-500/10 rounded w-24 ml-auto" />
                                </td>
                              )}
                            </tr>
                          ))
                        ) : filteredLoans.length === 0 ? (
                          <tr>
                            <td colSpan={activeTab === 'Agendados' ? 4 : activeTab === 'Quitados' ? 3 : 7} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="p-5 bg-white/[0.03] rounded-[32px] border border-white/[0.05]">
                                  <Users className="w-8 h-8 text-slate-600" />
                                </div>
                                <span className="text-slate-500 font-medium">
                                  {filterDate ? 'Nenhum Empréstimo Encontrado' : 
                                   command.trim() ? 'Nenhum empréstimo encontrado para esta busca.' : 
                                   activeTab === 'Agendados' ? 'Nenhum empréstimo agendado.' :
                                   activeTab === 'Quitados' ? 'Nenhum empréstimo quitado.' :
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
                                {activeTab === 'Quitados' ? (
                                  <span className={cn("font-bold text-left", isDark ? "text-white" : "text-slate-900")}>
                                    {loan.clientName}
                                  </span>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => setViewingClientLoans(loan.clientName)}
                                      className={cn("font-bold hover:text-brand-primary transition-colors text-left", isDark ? "text-white" : "text-slate-900")}
                                      title="Ver todos os contratos deste cliente"
                                    >
                                      {loan.clientName}
                                    </button>
                                    {loan.clientPhone && <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{loan.clientPhone}</div>}
                                  </>
                                )}
                              </td>
                              {activeTab === 'Agendados' ? (
                                <>
                                  <td className={cn("px-8 py-4 text-xs font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                    R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      <span className="text-brand-primary font-black">
                                        {safeFormatDate(loan.date, 'dd/MM/yyyy')}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              ) : activeTab === 'Quitados' ? (
                                <>
                                  <td className={cn("px-8 py-4 text-xs font-black transition-colors", isDark ? "text-white" : "text-slate-900")}>
                                    R$ {((loan.capitalPago || 0) + (loan.jurosPagos || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-8 py-4 text-slate-400 text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                                        {safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}
                                      </span>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
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
                                    <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} isDark={isDark} />
                                  </td>
                                </>
                              )}
                              {activeTab !== 'Quitados' && (
                                <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {loan.status !== 'Agendado' && (
                                    <button 
                                      onClick={() => setViewingClientLoans(loan.clientName)}
                                      className="p-2 bg-white/5 text-slate-400 hover:bg-brand-primary/20 hover:text-brand-primary rounded-xl border border-white/10 hover:border-brand-primary/30"
                                      title="Ver Histórico"
                                    >
                                      <History className="w-4 h-4" />
                                    </button>
                                  )}
                                  {loan.status === 'Agendado' && (
                                    <>
                                      <button 
                                        onClick={() => openEditModal(loan)}
                                        className="p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl border border-brand-primary/20 transition-all active:scale-95"
                                        title="Editar Agendamento"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setViewingScheduleReceipt(loan)}
                                        className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl border border-amber-500/20"
                                        title="Gerar Comprovante de Agendamento"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => cancelScheduledLoan(loan.id)}
                                        className="p-2 bg-brand-danger/10 text-brand-danger hover:bg-brand-danger hover:text-white rounded-xl border border-brand-danger/20 transition-all active:scale-95"
                                        title="Cancelar Agendamento"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
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
                                </div>
                              </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden grid grid-cols-1 gap-4">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={`loan-ske-mob-${i}`} className="glass-card p-5 space-y-4 border border-white/5 animate-pulse">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2 w-1/2">
                              <div className="h-4 bg-slate-500/10 rounded w-3/4" />
                              <div className="h-3 bg-slate-500/10 rounded w-1/2" />
                            </div>
                            <div className="h-5 bg-slate-500/10 rounded w-1/4" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.03]">
                            <div className="h-3 bg-slate-500/10 rounded w-2/3" />
                            <div className="h-3 bg-slate-500/10 rounded w-1/2" />
                            <div className="h-3 bg-slate-500/10 rounded w-3/4" />
                          </div>
                          <div className="h-8 bg-slate-500/10 rounded w-full" />
                        </div>
                      ))
                    ) : filteredLoans.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 font-medium glass-card">
                         {filterDate ? 'Nenhum Empréstimo Encontrado' : 
                          activeTab === 'Agendados' ? 'Nenhum agendamento encontrado.' :
                          activeTab === 'Quitados' ? 'Nenhum empréstimo quitado.' :
                          'Nenhum empréstimo registrado.'}
                      </div>
                    ) : (
                      filteredLoans.map((loan) => (
                        <div key={`loan-mobile-${loan.id}`} className={cn(
                          "glass-card p-5 space-y-4 border transition-all duration-300", 
                          isDark ? "border-white/5" : "bg-white border-slate-200 shadow-lg",
                          isOverdue(loan) && (isDark ? "border-brand-danger/30 bg-brand-danger/[0.03] shadow-lg shadow-brand-danger/5" : "border-brand-danger/20 bg-brand-danger/[0.01] shadow-lg shadow-brand-danger/5")
                        )}>
                          {activeTab === 'Quitados' ? (
                            <>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className={cn("font-bold text-sm leading-tight uppercase tracking-tight text-left", isDark ? "text-white" : "text-slate-900")}>
                                    {loan.clientName}
                                  </span>
                                </div>
                              </div>
                              <div className={cn("grid grid-cols-2 gap-4 pt-4 border-t transition-colors", isDark ? "border-white/5" : "border-slate-100")}>
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Valor Pago</span>
                                  <div className={cn("font-black text-sm tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {((loan.capitalPago || 0) + (loan.jurosPagos || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Data</span>
                                  <div className={cn("font-black text-xs tracking-tight", isDark ? "text-slate-300" : "text-slate-700")}>{safeFormatDate(loan.dueDate, 'dd/MM/yyyy')}</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
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
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} isDark={isDark} />
                          </div>

                          <div className={cn("grid grid-cols-2 gap-4 pt-4 border-t transition-colors", isDark ? "border-white/5" : "border-slate-100")}>
                            {activeTab === 'Agendados' ? (
                              <>
                                <div>
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Valor Agendado</span>
                                  <div className={cn("font-black text-sm tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Data Efetuar</span>
                                  <div className={cn("font-black text-xs tracking-tight text-brand-primary")}>{safeFormatDate(loan.date, 'dd/MM/yyyy')}</div>
                                </div>
                              </>
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                             {loan.status !== 'Agendado' && (
                               <button 
                                  onClick={() => setViewingClientLoans(loan.clientName)}
                                  className="p-3.5 bg-white/5 text-slate-400 rounded-xl border border-white/10 active:scale-95 transition-all"
                                >
                                  <History className="w-5 h-5" />
                                </button>
                             )}
                              {loan.status === 'Agendado' && (
                                <>
                                  <button 
                                    onClick={() => openEditModal(loan)}
                                    className="p-3.5 bg-brand-primary/10 text-brand-primary rounded-xl border border-brand-primary/20 active:scale-95 transition-all"
                                    title="Editar Agendamento"
                                  >
                                    <Edit2 className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => setViewingScheduleReceipt(loan)}
                                    className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 active:scale-95 transition-all"
                                    title="Comprovante de Agendamento"
                                  >
                                    <Printer className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={() => cancelScheduledLoan(loan.id)}
                                    className="p-3.5 bg-brand-danger/10 text-brand-danger rounded-xl border border-brand-danger/20 active:scale-95 transition-all"
                                    title="Cancelar Agendamento"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </>
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
                          </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</main>

      {/* Add Loan Modal */}
      {isAdding && (
        <div key="modal-add-loan" className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
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
                  {newLoan.status === 'Agendado' ? (
                    <>
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data para Efetivar</label>
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
                      <div className="space-y-2 md:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Previsão de Vencimento</label>
                        <input 
                          required
                          type="date"
                          className="w-full glass-input py-3 sm:py-4"
                          value={newLoan.dueDate || ""}
                          onChange={(e) => setNewLoan({...newLoan, dueDate: e.target.value})}
                        />
                      </div>
                    </>
                  ) : (
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
                  )}
                </div>

                <div className="bg-brand-primary/5 border border-brand-primary/10 p-5 sm:p-6 rounded-2xl sm:rounded-[28px] space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Juros Calculados</span>
                    <span className="text-brand-primary">{formatCurrency(parseLocaleNumber(newLoan.capital || '0') * (parseLocaleNumber(newLoan.interestRate || '0') / 100))}</span>
                  </div>
                  <div className="flex justify-between text-base sm:text-lg font-bold text-white tracking-tight">
                    <span>Total Bruto</span>
                    <span className="">{formatCurrency(parseLocaleNumber(newLoan.capital || '0') * (1 + parseLocaleNumber(newLoan.interestRate || '0') / 100))}</span>
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
          <div key="modal-payment" className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
            <div 
              onClick={() => { setPayingLoan(null); setLastAction(null); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <div 
              className="relative w-full h-full sm:h-auto sm:max-w-md glass-card p-6 sm:p-8 overflow-y-auto sm:rounded-[32px] rounded-none shadow-2xl space-y-6 sm:space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => { 
                    setPayingLoan(null); 
                    setLastAction(null); 
                    setPendingPayment(null);
                    setPixConfirmed(false);
                    setIsConfirmingPix(false);
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 border border-white/10 group"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-brand-primary" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Pagamento</h2>
                  <p className="text-slate-600 text-sm font-medium mt-1">{payingLoan.clientName}</p>
                </div>
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
                              <h3 className="text-xl font-bold text-white tracking-tight">
                                {pendingPayment.method === 'PIX' ? 'Monitorando PIX...' : 'Processando Dinheiro...'}
                              </h3>
                              <p className="text-slate-400 text-sm">
                                {pendingPayment.method === 'PIX' 
                                  ? `Verificando recebimento de ${formatCurrency(pendingPayment.amount)}`
                                  : `Registrando recebimento físico de ${formatCurrency(pendingPayment.amount)}`
                                }
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                           <div className="glass-card bg-brand-primary/5 border-brand-primary/20 p-4">
                              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">Total a Receber</span>
                              <div className="text-2xl font-black text-white">{formatCurrency(pendingPayment.amount)}</div>
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
                                    // Faster flow for cash (no real verification needed)
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
                                      }, 800);
                                    }, 1000);
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
                          <div className="text-sm font-bold text-white">{formatCurrency(payingLoan.capital)}</div>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Juros ({(payingLoan.interestRate * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)</span>
                          <div className="text-sm font-bold text-brand-accent">{formatCurrency(payingLoan.totalBruto - payingLoan.capital)}</div>
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
                            if (amount > 0) {
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
          <div key="modal-confirm" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setViewingClientLoans(null)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 border border-white/10 group"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-brand-primary" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Contratos de {viewingClientLoans}</h2>
                    <p className="text-slate-600 text-sm font-medium mt-1">Histórico completo de empréstimos e pagamentos.</p>
                  </div>
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
                            loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Agendado').length > 0 &&
                            loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Agendado').every(l => selectedLoansForUnified.includes(l.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const active = loans.filter(l => l.clientName === viewingClientLoans && l.status !== 'Agendado').map(l => l.id);
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
                      .filter(l => l.clientName === viewingClientLoans && l.status !== 'Agendado')
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
                               <div className="w-4 h-4 flex items-center justify-center text-slate-600 font-mono">-</div>
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
                            <StatusBadge status={isOverdue(loan) ? 'Atrasado' : loan.status} isDark={isDark} />
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
        <div className="fixed inset-0 z-[100] flex justify-center items-start p-4 sm:p-8 bg-black/95 overflow-y-auto">
          <div className={cn(
            "w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl relative my-auto sm:my-8",
            isDark ? "bg-[#0a0a0a]" : "bg-white"
          )}>
            <div id="printable-contract" className="p-8 sm:p-16 printable-content bg-white text-slate-900">
              {/* Elegant Header */}
              <div className="flex flex-col items-center mb-12 relative z-10">
                <div 
                  className="w-20 h-20 flex items-center justify-center rounded-3xl mb-6 shadow-xl overflow-hidden p-4"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                    backgroundColor: '#D4AF37'
                  }}
                >
                  <div 
                    className="w-full h-full rounded-xl flex items-center justify-center"
                    style={{ border: '2px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    <span className="text-white font-black text-2xl italic tracking-tighter">NP</span>
                  </div>
                </div>
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">Nexus Private</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400">Comprovante de Operação</p>
              </div>

              {/* Main Amount - Elegant Focus */}
              <div className="text-center mb-12 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest mb-4 text-slate-400">Valor Total da Operação</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {viewingContract.reduce((acc, l) => acc + l.totalBruto, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-x-12 mb-12 relative z-10 border-t pt-8 border-slate-100">
                <div className="col-span-1 sm:col-span-2 pb-4 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-2 text-slate-400">Cliente Beneficiário</span>
                  <p className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {viewingContract?.[0]?.clientName || 'Cliente'}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Capital Emprestado</span>
                  <p className="font-black uppercase text-sm leading-tight text-slate-900">
                    {formatCurrency(viewingContract.reduce((acc, l) => acc + l.capital, 0))}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Valor dos Juros</span>
                  <p className="font-black text-brand-primary uppercase text-sm leading-tight">
                    {formatCurrency(viewingContract.reduce((acc, l) => acc + (l.totalBruto - l.capital), 0))}
                  </p>
                </div>
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Data e Hora</span>
                  <p className="font-black uppercase text-sm leading-tight text-slate-900">{safeFormatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Vencimento Principal</span>
                  <p className="font-black text-neon-red uppercase text-sm leading-tight">
                    {viewingContract?.[0]?.dueDate ? safeFormatDate(viewingContract[0].dueDate, 'dd/MM/yyyy') : '---'}
                  </p>
                </div>
              </div>

              {/* Individual Contracts Breakdown */}
              {viewingContract.length > 1 && (
                <div className="mb-12 relative z-10">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-4 pb-2 border-b border-slate-50 text-slate-400">Detalhamento Individual</p>
                  <div className="space-y-4">
                    {viewingContract.map((loan, index) => (
                      <div key={loan.id} className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 py-2 border-b border-slate-50 last:border-0">
                        <div className="flex gap-4">
                          <span className="text-[9px] font-black mt-1 text-slate-300">0{index + 1}</span>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-900">Contrato {loan.id ? loan.id.slice(0, 8) : ''}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Venc. {safeFormatDate(loan.dueDate, 'dd/MM/y')}</p>
                          </div>
                        </div>
                        <div className="sm:text-right w-full sm:w-auto">
                          <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-bold text-slate-900">
                              <span className="mr-2 text-slate-300">CAPITAL</span>
                              R$ {loan.capital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[9px] font-bold text-brand-primary">
                              <span className="mr-2 text-slate-300">JUROS</span>
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
              <div className="pt-8 border-t relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6 border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border p-2 shrink-0 bg-slate-50 border-slate-100">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase mb-1 text-slate-900">Autenticação Digital</p>
                    <p className="text-[7px] font-mono text-slate-500 uppercase tracking-tighter">
                      {viewingContract?.[0]?.id ? viewingContract[0].id.toUpperCase() : 'NEXUS'}-{viewingContract?.[0]?.date ? toDate(viewingContract[0].date).getTime() : new Date().getTime()}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right opacity-40 w-full sm:w-auto">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Asset Management</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Separated, Outside printable-contract) */}
            <div className={cn(
              "p-6 sm:p-8 border-t flex flex-col gap-4 relative z-20 no-print-section no-print",
              isDark ? "bg-[#0b0b0b] border-white/5" : "bg-slate-50 border-slate-100"
            )}>
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
                  className="flex items-center justify-center gap-3 px-6 py-5 bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-3xl hover:bg-slate-200 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 border border-slate-200"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                className="px-10 py-5 bg-slate-200 text-slate-800 font-black uppercase tracking-widest text-xs rounded-3xl hover:bg-slate-300 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Cliente */}
      {viewingClientDetail && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start p-4 sm:p-8 bg-black/95 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-4xl sm:rounded-[40px] overflow-hidden shadow-2xl my-auto relative",
              isDark ? "bg-surface-900 border border-white/5" : "bg-white"
            )}
          >
            <div className="p-8 sm:p-12 relative">
              <button 
                onClick={() => setViewingClientDetail(null)}
                className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                      <UserIcon className="w-10 h-10 text-brand-primary" />
                    </div>
                    <div>
                      <h2 className={cn("text-3xl font-black tracking-tight uppercase", isDark ? "text-white" : "text-slate-900")}>
                        {viewingClientDetail.name}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                          viewingClientDetail.loanCount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                        )}>
                          {viewingClientDetail.loanCount} Ativos
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          / {viewingClientDetail.totalLoans} Contratos no Total
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-6 rounded-3xl border transition-all", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Dívida Ativa</span>
                    <p className="text-xl font-black text-brand-primary font-mono">R$ {viewingClientDetail.activeDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className={cn("p-6 rounded-3xl border transition-all", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Capital em Aberto</span>
                    <p className={cn("text-xl font-black font-mono", isDark ? "text-white" : "text-slate-900")}>R$ {viewingClientDetail.activeCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Dados do Cliente
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className={cn("p-4 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Telefone / WhatsApp</span>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editClientData.phone}
                            onChange={(e) => setEditClientData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-brand-primary outline-none transition-all"
                            placeholder="Telefone"
                          />
                        ) : (
                          <p className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                            {viewingClientDetail.phone || "Não informado"}
                          </p>
                        )}
                      </div>
                      <div className={cn("p-4 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Endereço Residencial</span>
                        {isEditingDetail ? (
                          <textarea 
                            value={editClientData.address}
                            onChange={(e) => setEditClientData(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-brand-primary outline-none transition-all min-h-[80px]"
                            placeholder="Endereço"
                          />
                        ) : (
                          <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                            {viewingClientDetail.address || "Não informado"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        setViewingClientLoans(viewingClientDetail.name);
                        setViewingClientDetail(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all active:scale-95 group",
                        isDark ? "bg-white/5 border-white/10 hover:bg-brand-primary/10 hover:border-brand-primary/30" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                      )}
                    >
                      <History className="w-6 h-6 text-brand-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Histórico</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingLoanId(null);
                        setNewLoan({
                          clientName: viewingClientDetail.name,
                          clientPhone: viewingClientDetail.phone || '',
                          clientAddress: viewingClientDetail.address || '',
                          capital: '',
                          interestRate: '',
                          date: format(new Date(), 'yyyy-MM-dd'),
                          dueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
                          status: 'Pendente'
                        });
                        setIsAdding(true);
                        setViewingClientDetail(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all active:scale-95 group",
                        isDark ? "bg-white/5 border-white/10 hover:bg-brand-primary/10 hover:border-brand-primary/30" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                      )}
                    >
                      <Plus className="w-6 h-6 text-brand-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Novo Loan</span>
                    </button>
                    <button 
                      onClick={() => {
                        const activeLoans = loans.filter(l => l.clientName === viewingClientDetail.name && (l.status !== 'Pago' || l.capital > 0));
                        if (activeLoans.length > 0) {
                          setViewingContract(activeLoans);
                          setViewingClientDetail(null);
                        } else {
                          setError("Este cliente não possui contratos ativos para gerar contrato.");
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all active:scale-95 group",
                        isDark ? "bg-white/5 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                      )}
                    >
                      <FileText className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Contrato</span>
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Excluir Cliente',
                          message: `Deseja excluir todos os empréstimos de ${viewingClientDetail.name}? Esta ação não pode ser desfeita.`,
                          onConfirm: async () => {
                            try {
                              const clientLoans = loans.filter(l => l.clientName === viewingClientDetail.name);
                              const batch = writeBatch(db);
                              clientLoans.forEach(l => {
                                batch.delete(doc(db, 'loans', l.id));
                              });
                              await batch.commit();
                              setViewingClientDetail(null);
                            } catch {
                              setError("Erro ao excluir cliente.");
                            }
                          }
                        });
                      }}
                      className={cn(
                        "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all active:scale-95 group",
                        isDark ? "bg-white/5 border-white/10 hover:bg-brand-danger/10 hover:border-brand-danger/30" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                      )}
                    >
                      <Trash2 className="w-6 h-6 text-brand-danger group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Excluir</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {isEditingDetail ? (
                  <>
                    <button 
                      onClick={handleUpdateClient}
                      className="flex-1 py-5 bg-brand-primary text-black rounded-[32px] font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3"
                    >
                      <Check className="w-4 h-4" />
                      Salvar Alterações
                    </button>
                    <button 
                      onClick={() => setIsEditingDetail(false)}
                      className={cn(
                        "flex-1 py-5 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all",
                        isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        setEditClientData({
                          phone: viewingClientDetail.phone || '',
                          address: viewingClientDetail.address || ''
                        });
                        setIsEditingDetail(true);
                      }}
                      className="flex-1 py-5 bg-brand-primary text-black rounded-[32px] font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-3"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Cadastro
                    </button>
                    <button 
                       onClick={() => setViewingClientDetail(null)}
                       className={cn(
                         "flex-1 py-5 rounded-[32px] font-black text-xs uppercase tracking-widest transition-all",
                         isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                       )}
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start p-4 sm:p-8 bg-black/95 overflow-y-auto">
          <div className={cn(
            "w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl relative my-auto sm:my-8",
            isDark ? "bg-[#0a0a0a]" : "bg-white"
          )}>
            <div id="printable-receipt" className="p-8 sm:p-16 printable-content bg-white text-slate-900">
              {/* Elegant Header */}
              <div className="flex flex-col items-center mb-12 relative z-10">
                <div 
                  className="w-20 h-20 flex items-center justify-center rounded-3xl mb-6 shadow-xl overflow-hidden p-4"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                    backgroundColor: '#D4AF37'
                  }}
                >
                  <div 
                    className="w-full h-full rounded-xl flex items-center justify-center"
                    style={{ border: '2px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    <span className="text-white font-black text-2xl italic tracking-tighter">NP</span>
                  </div>
                </div>
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{userProfile?.displayName || 'Nexus Private'}</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400">Comprovante de Recebimento</p>
              </div>

              {/* Amount Centerpiece */}
              <div className="text-center mb-12 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest mb-4 text-slate-400">Valor Total Recebido</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {(viewingReceipt?.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-100">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Efetivado com Sucesso</span>
                </div>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-x-12 mb-12 relative z-10 border-t pt-8 border-slate-100">
                <div className="col-span-1 sm:col-span-2 pb-4 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-2 text-slate-400">Pagador</span>
                  <p className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {viewingReceipt?.clientName || 'Cliente'}
                  </p>
                </div>
                
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Data e Hora</span>
                  <p className="font-black uppercase text-sm leading-tight text-slate-900">{viewingReceipt?.date ? safeFormatDate(viewingReceipt.date, 'dd/MM/yyyy HH:mm') : '---'}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Operação</span>
                  <p className="font-black text-brand-primary uppercase text-sm leading-tight">
                    {viewingReceipt?.description?.toLowerCase()?.includes('juros') ? 'Rendimentos' : 
                     viewingReceipt?.description?.toLowerCase()?.includes('capital') ? 'Amortização' : 
                     'Recebimento'}
                  </p>
                </div>

                <div className="col-span-1 sm:col-span-2 pt-6 border-t border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-2 text-slate-400">Descrição Detalhada</span>
                  <p className="text-xs leading-relaxed font-medium uppercase tracking-tight text-slate-600">
                    {viewingReceipt?.description || 'Recebimento de parcelas'}
                  </p>
                </div>
              </div>

              {/* Footer Authentication */}
              <div className="pt-8 border-t relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6 border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border p-2 shrink-0 bg-slate-50 border-slate-100">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase mb-1 text-slate-900">Autenticação Digital</p>
                    <p className="text-[7px] font-mono text-slate-500 uppercase tracking-tighter">
                      {viewingReceipt?.id ? viewingReceipt.id.toUpperCase() : 'NEXUS'}-{viewingReceipt?.date ? toDate(viewingReceipt.date).getTime() : new Date().getTime()}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right opacity-40 w-full sm:w-auto">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Digital Auth</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Separated, Outside printable-receipt) */}
            <div className={cn(
              "p-6 sm:p-8 border-t flex flex-col gap-4 relative z-20 no-print-section no-print",
              isDark ? "bg-[#0b0b0b] border-white/5" : "bg-slate-50 border-slate-100"
            )}>
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
                className="py-4 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors text-center"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingScheduleReceipt && (
        <div className="fixed inset-0 z-[100] flex justify-center items-start p-4 sm:p-8 bg-black/95 overflow-y-auto">
          <div className={cn(
            "w-full max-w-2xl sm:rounded-[40px] overflow-hidden shadow-2xl relative my-auto sm:my-8",
            isDark ? "bg-[#0a0a0a]" : "bg-white"
          )}>
            <div id="printable-schedule-receipt" className="p-8 sm:p-16 printable-content bg-white text-slate-900">
              {/* Elegant Header */}
              <div className="flex flex-col items-center mb-12 relative z-10">
                <div 
                  className="w-20 h-20 flex items-center justify-center rounded-3xl mb-6 shadow-xl overflow-hidden p-4"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%)',
                    backgroundColor: '#D4AF37'
                  }}
                >
                  <div 
                    className="w-full h-full rounded-xl flex items-center justify-center"
                    style={{ border: '2px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    <span className="text-white font-black text-2xl italic tracking-tighter">NP</span>
                  </div>
                </div>
                <h1 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{userProfile?.displayName || 'Nexus Private'}</h1>
                <div className="h-px w-12 bg-brand-primary my-4" />
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-400">Comprovante de Agendamento</p>
              </div>

              {/* Amount Centerpiece */}
              <div className="text-center mb-12 relative z-10">
                <p className="text-[9px] font-black uppercase tracking-widest mb-4 text-slate-400">Valor Total Agendado</p>
                <h2 className="text-5xl font-black tracking-tighter text-slate-900">
                  <span className="text-xl mr-2 text-slate-300">R$</span>
                  {(viewingScheduleReceipt?.capital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>

              {/* Essential Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-x-12 mb-12 relative z-10 border-t pt-8 border-slate-100">
                <div className="col-span-1 sm:col-span-2 pb-4 border-b border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-2 text-slate-400">Cliente Beneficiário</span>
                  <p className="text-xl font-black uppercase tracking-tight text-slate-900">
                    {viewingScheduleReceipt?.clientName || 'Cliente'}
                  </p>
                </div>
                
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Data para Liberação</span>
                  <p className="font-black uppercase text-sm leading-tight text-slate-900">{viewingScheduleReceipt?.date ? safeFormatDate(viewingScheduleReceipt.date, 'dd/MM/yyyy') : '---'}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-1 text-slate-400">Previsão de Vencimento</span>
                  <p className="font-black text-neon-red uppercase text-sm leading-tight">{viewingScheduleReceipt?.dueDate ? safeFormatDate(viewingScheduleReceipt.dueDate, 'dd/MM/yyyy') : '---'}</p>
                </div>

                <div className="col-span-1 sm:col-span-2 pt-6 border-t border-slate-50">
                  <span className="text-[8px] font-black uppercase tracking-widest block mb-2 text-slate-400">Observações do Agendamento</span>
                  <p className="text-xs leading-relaxed font-medium uppercase tracking-tight text-slate-600">
                    O crédito de R$ {(viewingScheduleReceipt?.capital || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está programado no sistema para processamento na data indicada. A ativação ocorrerá automaticamente após a validação do lastro financeiro.
                  </p>
                </div>
              </div>

              {/* Footer Authentication */}
              <div className="pt-8 border-t relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6 border-slate-100">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border p-2 shrink-0 bg-slate-50 border-slate-100">
                    <QrCode className="w-full h-full text-slate-200" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase mb-1 text-slate-900">Controle de Agendamento</p>
                    <p className="text-[7px] font-mono text-slate-500 uppercase tracking-tighter">
                      SCH-{viewingScheduleReceipt?.id ? viewingScheduleReceipt.id.toUpperCase() : 'SCH'}-{viewingScheduleReceipt?.createdAt ? toDate(viewingScheduleReceipt.createdAt).getTime() : new Date().getTime()}
                    </p>
                  </div>
                </div>
                <div className="text-center sm:text-right opacity-40 w-full sm:w-auto">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-900">Nexus Private</p>
                  <p className="text-[6px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Reserve System</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (Separated, Outside printable-schedule-receipt) */}
            <div className={cn(
              "p-6 sm:p-8 border-t flex flex-col gap-4 relative z-20 no-print-section no-print",
              isDark ? "bg-[#0b0b0b] border-white/5" : "bg-slate-50 border-slate-100"
            )}>
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
                className="py-4 text-slate-400 font-bold uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors text-center"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModalData && shareModalData.isOpen && (
        <div className="fixed inset-0 z-[150] flex justify-center items-center p-4 sm:p-6 bg-black/95 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border my-auto relative",
              isDark ? "bg-[#0c0c0c] border-white/10" : "bg-white border-slate-200"
            )}
          >
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                  <Share2 className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="text-left">
                  <h3 className={cn("text-base font-black uppercase tracking-wider leading-none", isDark ? "text-white" : "text-slate-900")}>
                    {shareModalData.title || "Compartilhar"}
                  </h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 leading-none">Opções Disponíveis</p>
                </div>
              </div>
              <button 
                onClick={() => setShareModalData(null)}
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thumbnail Preview of Captured Document */}
            {shareModalData.imgDataUrl && (
              <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex flex-col items-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Prévia do Documento Gerado</p>
                <div className="relative group max-w-[200px] rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 bg-white">
                  <img 
                    src={shareModalData.imgDataUrl} 
                    alt="Document preview" 
                    className="max-h-36 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Content Options */}
            <div className="p-6 sm:p-8 space-y-4">
              
              {/* WhatsApp Option */}
              <button
                onClick={() => {
                  const url = `https://api.whatsapp.com/send?text=${shareModalData.whatsappText}`;
                  window.open(url, '_blank');
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-[0.98] text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform shrink-0">
                  <MessageCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-wider text-emerald-400 group-hover:text-emerald-300 transition-colors">Enviar por WhatsApp</p>
                  <p className="text-[10px] text-slate-400">Mensagem estruturada profissional</p>
                </div>
              </button>

              {/* Copy Text Option */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareModalData.detailsText);
                  setCopiedShareText(true);
                  setTimeout(() => setCopiedShareText(false), 2000);
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left group",
                  isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform shrink-0">
                  {copiedShareText ? (
                    <Check className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Copy className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-wider text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    {copiedShareText ? "Copiado!" : "Copiar Texto do Comprovante"}
                  </p>
                  <p className="text-[10px] text-slate-400">Salvar dados organizados na área de transferência</p>
                </div>
              </button>

              {/* Download PNG Option */}
              {shareModalData.imgDataUrl && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = shareModalData.fileName;
                    link.href = shareModalData.imgDataUrl || '';
                    link.click();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left group",
                    isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform shrink-0">
                    <Download className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-wider text-amber-500 group-hover:text-amber-400 transition-colors">Baixar Imagem (PNG)</p>
                    <p className="text-[10px] text-slate-400">Salvar comprovante como foto de alta qualidade</p>
                  </div>
                </button>
              )}

              {/* Download PDF Option */}
              <button
                onClick={async () => {
                  let docElementId = 'printable-receipt';
                  if (shareModalData.fileName.includes('contrato')) docElementId = 'printable-contract';
                  else if (shareModalData.fileName.includes('agendamento')) docElementId = 'printable-schedule-receipt';
                  else if (shareModalData.fileName.includes('relatorio')) docElementId = 'printable-report';

                  setShareModalData(null);
                  await shareAsPDF(true, 'pdf', docElementId);
                }}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left group",
                  isDark ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform shrink-0">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black uppercase tracking-wider text-red-400 group-hover:text-red-300 transition-colors">Baixar PDF Oficial</p>
                  <p className="text-[10px] text-slate-400">Gerar documento em formato PDF estruturado</p>
                </div>
              </button>

              {/* Native System Share Menu */}
              {navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      const dataurl = shareModalData.imgDataUrl || '';
                      const arr = dataurl.split(',');
                      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
                      const bstr = atob(arr[1]);
                      let n = bstr.length;
                      const u8arr = new Uint8Array(n);
                      while(n--){
                        u8arr[n] = bstr.charCodeAt(n);
                      }
                      const blob = new Blob([u8arr], {type:mime});
                      const file = new File([blob], shareModalData.fileName, { type: mime });

                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                          files: [file],
                          title: shareModalData.title,
                          text: shareModalData.text
                        });
                      } else {
                        await navigator.share({
                          title: shareModalData.title,
                          text: shareModalData.detailsText
                        });
                      }
                    } catch (err) {
                      console.warn('Native share failed inside modal, fallback completed:', err);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left group border-dashed",
                    isDark ? "bg-white/[0.02] border-white/10 hover:bg-white/5" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
                    <Share2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-wider text-blue-400 group-hover:text-blue-300 transition-colors">Compartilhamento do Aparelho</p>
                    <p className="text-[10px] text-slate-400">Usar o menu de compartilhamento padrão do sistema</p>
                  </div>
                </button>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setShareModalData(null)}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all"
              >
                Voltar
              </button>
            </div>
          </motion.div>
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

      {/* Floating Action Button - Mobile */}
      {['Principal', 'Empréstimos', 'Clientes'].includes(activeTab) && (
        <button 
          onClick={() => setIsAdding(true)}
          className={cn(
            "fixed bottom-24 right-6 lg:hidden z-[85] p-5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all active:scale-90 animate-in zoom-in slide-in-from-bottom-10 duration-500",
            isDark ? "bg-brand-primary text-black" : "bg-slate-900 text-white"
          )}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}

      {/* Bottom Navigation - Mobile only */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 lg:hidden z-[90] border-t backdrop-blur-xl transition-colors pb-[env(safe-area-inset-bottom)] px-2",
        isDark ? "bg-black/90 border-white/5" : "bg-white/90 border-slate-200"
      )}>
        <div className="flex items-center justify-around h-16">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`bottom-nav-${item.id}`}
                onClick={() => changeTab(item.id as typeof activeTab)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all active:scale-90",
                  isActive ? "text-[#D4AF37]" : "text-slate-500"
                )}
              >
                <div 
                  className={cn(
                    "p-1.5 rounded-xl transition-colors relative overflow-hidden",
                    isActive ? "shadow-md" : ""
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFF5C0 50%, #D4AF37 100%)',
                    border: '1px solid #FFD700',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                  } : undefined}
                >
                  {isActive && (
                    <CurvedDarkLuxuryBanknote />
                  )}
                  <Icon className={cn("w-5 h-5", isActive ? "text-black scale-110" : "text-slate-400")} />
                </div>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "opacity-100" : "opacity-50")}>
                  {item.label === 'Principal' ? 'Início' : 
                   item.label === 'Empréstimos' ? 'Giro' :
                   item.label === 'Quitados' ? 'Pagos' :
                   item.label === 'Clientes' ? 'Base' : 
                   item.label === 'Transações' ? 'Fluxo' : item.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => changeTab('Configurações')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all active:scale-90",
              activeTab === 'Configurações' ? "text-[#D4AF37]" : "text-slate-500"
            )}
          >
            <div 
              className={cn(
                "p-1.5 rounded-xl transition-colors relative overflow-hidden",
                activeTab === 'Configurações' ? "shadow-md" : ""
              )}
              style={activeTab === 'Configurações' ? {
                background: 'linear-gradient(135deg, #FFD700 0%, #FFF5C0 50%, #D4AF37 100%)',
                border: '1px solid #FFD700',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
              } : undefined}
            >
              {activeTab === 'Configurações' && (
                <CurvedDarkLuxuryBanknote />
              )}
              <Settings className={cn("w-5 h-5", activeTab === 'Configurações' ? "text-black scale-110" : "text-slate-400")} />
            </div>
            <span className={cn("text-[8px] font-black uppercase tracking-widest", activeTab === 'Configurações' ? "opacity-100" : "opacity-50")}>
              Ajustes
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ title, value, icon, color, trend, onClick, isDark, isMini, loading }: { title: string, value: string, icon: React.ReactNode, color: 'primary' | 'secondary' | 'accent' | 'danger' | 'success', trend?: string, onClick?: () => void, isDark: boolean, isMini?: boolean, loading?: boolean }) {
  const colors = {
    primary: 'text-brand-primary bg-brand-primary/5 border-brand-primary/10',
    secondary: cn(isDark ? 'text-white bg-white/5 border-white/10' : 'text-black bg-slate-100 border-slate-200'),
    accent: 'text-brand-accent bg-brand-accent/5 border-brand-accent/10',
    danger: 'text-brand-danger bg-brand-danger/5 border-brand-danger/10',
    success: cn(isDark ? 'text-brand-success bg-brand-success/5 border-brand-success/10 shadow-[0_0_15px_rgba(57,255,20,0.1)]' : 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10'),
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card group relative overflow-hidden transition-all duration-500 flex flex-col justify-between",
        isMini ? "p-4 sm:p-5 h-full" : "p-5 sm:p-7 space-y-4 sm:space-y-5",
        isDark ? "bg-black border-white/5 shadow-2xl" : "bg-white border-slate-200 shadow-xl shadow-slate-200/50",
        onClick && "cursor-pointer active:scale-[0.98] lg:hover:scale-[1.02] lg:hover:border-brand-primary/30 lg:hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
      )}
    >
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-tr from-brand-primary/0 via-brand-primary/0 to-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
      )} />
      
      <div className={cn(
        "absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-brand-primary/5 -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl",
        !isDark && "bg-brand-primary/10"
      )} />
      
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("rounded-[16px] sm:rounded-[20px] transition-all duration-500", 
          isMini ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3.5",
          colors[color])}>
          {React.cloneElement(icon as React.ReactElement, { className: isMini ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-6 sm:h-6" })}
        </div>
        {trend && (
          loading ? (
            <div className="h-4 w-12 bg-slate-500/15 rounded-md animate-pulse" />
          ) : (
            <span className={cn("font-black uppercase border", 
              isMini ? "text-[7px] sm:text-[8px] tracking-widest px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg" : "text-[8px] sm:text-[9px] tracking-[0.1em] sm:tracking-[0.2em] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl",
              colors[color])}>
              {trend}
            </span>
          )
        )}
      </div>
      <div className="relative z-10">
        <span className={cn("font-bold text-slate-500 uppercase block transition-colors",
          isMini ? "text-[8px] tracking-[0.15em] mb-0.5 sm:mb-1" : "text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] mb-1 sm:mb-1.5")}>{title}</span>
        {loading ? (
          <div className="h-7 w-24 bg-slate-500/15 rounded-lg animate-pulse mt-1" />
        ) : (
          <div className={cn("font-black tracking-tight group-hover:text-brand-primary transition-colors duration-500", 
            isMini ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
            isDark ? "text-white" : "text-black")}>{value}</div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, isDark }: { status: Loan['status'], isDark?: boolean }) {
  const config = {
    'Pendente': {
      classes: 'bg-slate-500/10 text-slate-500 border-slate-500/20 shadow-slate-500/5',
      icon: Clock
    },
    'Pago': {
      classes: cn(isDark ? 'bg-brand-success/10 text-brand-success border-brand-success/20 shadow-brand-success/5' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5'),
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


