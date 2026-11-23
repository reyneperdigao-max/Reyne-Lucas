import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type AsaasBillingType = 'UNDEFINED' | 'PIX' | 'BOLETO';
type PortalOperationType = 'JUROS' | 'AMORTIZACAO' | 'QUITACAO';

interface AsaasCustomer {
  id: string;
  name?: string;
  cpfCnpj?: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  billingType: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  externalReference?: string;
}

interface AsaasPixQrCode {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
}

interface AsaasIdentificationField {
  identificationField?: string;
  nossoNumero?: string;
  barCode?: string;
}

interface ServerContractRecord {
  token: string;
  loanId: string;
  uid: string;
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
  updatedAt: string;
}

interface ServerChargeRecord {
  id: string;
  token: string;
  loanId: string;
  uid: string;
  operationType: PortalOperationType;
  totalAmount: number;
  interestAmount: number;
  amortizedAmount: number;
  principalBefore: number;
  projectedNewCapital: number;
  dueDateBefore: string;
  dueDateAfter: string;
  billingType: 'PIX';
  asaasChargeId: string;
  asaasCustomerId?: string | null;
  asaasStatus: string;
  asaasPixPayload?: string | null;
  asaasPixQrCode?: string | null;
  asaasInvoiceUrl?: string | null;
  asaasExpirationDate?: string | null;
  settled: boolean;
  settledAt: string | null;
  webhookEvent: string | null;
  reconciledInFirestore: boolean;
  reconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServerUserAsaasConfig {
  uid: string;
  environment: 'sandbox' | 'production';
  apiKeyEncrypted: string;
  apiKeyMasked: string;
  webhookTokenEncrypted?: string | null;
  webhookTokenMasked?: string | null;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
  updatedAt: string;
}

interface AsaasLedgerStore {
  contracts: Record<string, ServerContractRecord>;
  charges: Record<string, ServerChargeRecord>;
  userConfigs: Record<string, ServerUserAsaasConfig>;
}

const PAID_ASAAS_STATUSES = new Set([
  'RECEIVED',
  'CONFIRMED',
  'RECEIVED_IN_CASH',
  'DUNNING_RECEIVED'
]);

const PAID_WEBHOOK_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED_IN_CASH',
  'PAYMENT_DUNNING_RECEIVED'
]);

const DATA_DIR = path.resolve(process.cwd(), '.data');
const LEDGER_FILE = path.join(DATA_DIR, 'asaas-ledger.json');

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function isValidPortalToken(token: unknown): token is string {
  return typeof token === 'string' && /^cli_[a-zA-Z0-9_-]{20,124}$/.test(token);
}

function computeNextDueDateISO(currentDueDateStr: string, referenceNow: Date = new Date()): string {
  const today = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate());
  const parts = (currentDueDateStr || '').split('T')[0].split('-').map(Number);

  const addOneCalendarMonth = (base: Date): Date => {
    const targetMonth = base.getMonth() + 1;
    const year = base.getFullYear() + Math.floor(targetMonth / 12);
    const month = targetMonth % 12;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(base.getDate(), lastDay);
    return new Date(year, month, clampedDay);
  };

  let baseDue: Date;
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    baseDue = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    baseDue = today;
  }

  let nextDue = addOneCalendarMonth(baseDue);
  if (Number.isNaN(nextDue.getTime()) || nextDue < today) {
    nextDue = addOneCalendarMonth(today);
  }

  const yyyy = nextDue.getFullYear();
  const mm = String(nextDue.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDue.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const MASTER_KEY_FILE = path.join(DATA_DIR, 'master.key');
let cachedMasterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;
  const envSecret = (process.env.ASAAS_CONFIG_SECRET || '').trim();
  if (envSecret) {
    cachedMasterKey = crypto.createHash('sha256').update(envSecret).digest();
    return cachedMasterKey;
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(MASTER_KEY_FILE)) {
      const hex = fs.readFileSync(MASTER_KEY_FILE, 'utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(hex)) {
        cachedMasterKey = Buffer.from(hex, 'hex');
        return cachedMasterKey;
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(MASTER_KEY_FILE, generated.toString('hex'), { encoding: 'utf8', mode: 0o600 });
    cachedMasterKey = generated;
    return cachedMasterKey;
  } catch (err) {
    console.warn('Fallback to process-scoped key for Asaas encryption:', err);
    cachedMasterKey = crypto.randomBytes(32);
    return cachedMasterKey;
  }
}

function encryptSecret(plain: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(payload?: string | null): string {
  if (!payload || typeof payload !== 'string') return '';
  const parts = payload.split(':');
  if (parts.length !== 3) return '';
  try {
    const key = getMasterKey();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function maskSecret(secret: string): string {
  const clean = secret.trim();
  if (!clean) return '';
  if (clean.length <= 6) return '••••';
  const suffix = clean.slice(-4);
  if (clean.startsWith('$aact_')) {
    return `$aact_••••${suffix}`;
  }
  return `${clean.slice(0, 2)}••••${suffix}`;
}

function loadLedger(): AsaasLedgerStore {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      const raw = fs.readFileSync(LEDGER_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AsaasLedgerStore>;
      return {
        contracts: parsed.contracts && typeof parsed.contracts === 'object' ? parsed.contracts : {},
        charges: parsed.charges && typeof parsed.charges === 'object' ? parsed.charges : {},
        userConfigs: parsed.userConfigs && typeof parsed.userConfigs === 'object' ? parsed.userConfigs : {}
      };
    }
  } catch (err) {
    console.warn('Could not read asaas-ledger.json, initializing fresh store:', err);
  }
  return { contracts: {}, charges: {}, userConfigs: {} };
}

const ledger: AsaasLedgerStore = loadLedger();
let persistChain: Promise<void> = Promise.resolve();

function persistLedger(): Promise<void> {
  persistChain = persistChain
    .then(async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const tmpPath = `${LEDGER_FILE}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(ledger, null, 2), { encoding: 'utf8', mode: 0o600 });
      await fs.promises.rename(tmpPath, LEDGER_FILE);
    })
    .catch((err) => {
      console.error('Failed to persist asaas-ledger.json:', err);
    });
  return persistChain;
}

function getFirebaseAppletConfig(): { projectId: string; firestoreDatabaseId: string } {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string; firestoreDatabaseId?: string };
    return {
      projectId: (parsed.projectId || '').trim(),
      firestoreDatabaseId: (parsed.firestoreDatabaseId || '(default)').trim()
    };
  } catch {
    return { projectId: '', firestoreDatabaseId: '(default)' };
  }
}

function getFirebaseProjectId(): string {
  return getFirebaseAppletConfig().projectId;
}

let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } = {
  certs: {},
  expiresAt: 0
};

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < cachedGoogleCerts.expiresAt && Object.keys(cachedGoogleCerts.certs).length > 0) {
    return cachedGoogleCerts.certs;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) {
    throw new Error(`Falha ao obter chaves públicas do Firebase Auth (${res.status}).`);
  }
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = (await res.json()) as Record<string, string>;
  cachedGoogleCerts = {
    certs,
    expiresAt: now + Math.max(60, maxAgeSec) * 1000
  };
  return certs;
}

function base64UrlToBuffer(str: string): Buffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

async function verifyFirebaseBearerToken(
  authHeader: string | undefined
): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const header = JSON.parse(base64UrlToBuffer(segments[0]).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(base64UrlToBuffer(segments[1]).toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
    };

    if (header.alg !== 'RS256' || !header.kid) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
    if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) return null;

    const certs = await getGooglePublicCerts();
    const pem = certs[header.kid];
    if (!pem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${segments[0]}.${segments[1]}`);
    verifier.end();
    const signatureValid = verifier.verify(pem, base64UrlToBuffer(segments[2]));
    if (!signatureValid) return null;

    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

function getAsaasBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

function getGlobalEnvAsaasConfig(): { apiKey: string; baseUrl: string; environment: 'sandbox' | 'production' } {
  const apiKey = (process.env.ASAAS_API_KEY || '').trim();
  const explicitUrl = (process.env.ASAAS_BASE_URL || '').trim().replace(/\/+$/, '');
  const isProdKey = apiKey.includes('_prod_') || apiKey.startsWith('$aact_prod_');
  const isSandboxKey = apiKey.includes('_hmlg_') || apiKey.includes('sandbox');

  let baseUrl = explicitUrl;
  if (!baseUrl) {
    baseUrl = isProdKey ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
  } else if (isProdKey && baseUrl.includes('sandbox')) {
    baseUrl = 'https://api.asaas.com/v3';
  } else if (isSandboxKey && !baseUrl.includes('sandbox')) {
    baseUrl = 'https://api-sandbox.asaas.com/v3';
  }

  const environment = baseUrl.includes('sandbox') ? 'sandbox' : 'production';
  return { apiKey, baseUrl, environment };
}

function getAsaasConfigForUid(uid?: string | null): {
  apiKey: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  source: 'user' | 'env' | 'none';
} {
  if (uid && ledger.userConfigs[uid]?.apiKeyEncrypted) {
    const cfg = ledger.userConfigs[uid];
    const decryptedKey = decryptSecret(cfg.apiKeyEncrypted).trim();
    if (decryptedKey) {
      const env: 'sandbox' | 'production' = cfg.environment === 'production' ? 'production' : 'sandbox';
      return {
        apiKey: decryptedKey,
        baseUrl: getAsaasBaseUrl(env),
        environment: env,
        source: 'user'
      };
    }
  }

  const envCfg = getGlobalEnvAsaasConfig();
  if (envCfg.apiKey) {
    return {
      ...envCfg,
      source: 'env'
    };
  }

  return {
    apiKey: '',
    baseUrl: getAsaasBaseUrl('sandbox'),
    environment: 'sandbox',
    source: 'none'
  };
}

function getWebhookTokenForUid(uid?: string | null): string {
  if (uid && ledger.userConfigs[uid]?.webhookTokenEncrypted) {
    const decrypted = decryptSecret(ledger.userConfigs[uid].webhookTokenEncrypted).trim();
    if (decrypted) return decrypted;
  }
  return (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
}

function buildUserWebhookUrl(req: express.Request, uid: string): string {
  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const safeHost = /^[a-zA-Z0-9.:-]+$/.test(rawHost) ? rawHost : '';
  const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim().toLowerCase();
  const isLocal = safeHost.startsWith('localhost') || safeHost.startsWith('127.0.0.1');
  const proto = rawProto === 'http' && isLocal ? 'http' : 'https';
  if (!safeHost) return `/api/asaas/webhook/${encodeURIComponent(uid)}`;
  return `${proto}://${safeHost}/api/asaas/webhook/${encodeURIComponent(uid)}`;
}

function buildUserConfigView(req: express.Request, uid: string) {
  const cfg = ledger.userConfigs[uid];
  const resolved = getAsaasConfigForUid(uid);
  const webhookUrl = buildUserWebhookUrl(req, uid);

  if (cfg && cfg.apiKeyEncrypted) {
    return {
      configured: Boolean(resolved.apiKey),
      environment: cfg.environment === 'production' ? ('production' as const) : ('sandbox' as const),
      apiKeyMasked: cfg.apiKeyMasked || '••••',
      hasWebhookToken: Boolean(cfg.webhookTokenEncrypted),
      webhookTokenMasked: cfg.webhookTokenMasked || '',
      webhookUrl,
      lastTestedAt: cfg.lastTestedAt || null,
      lastTestOk: cfg.lastTestOk ?? null,
      updatedAt: cfg.updatedAt,
      source: 'user' as const
    };
  }

  return {
    configured: resolved.source === 'env',
    environment: resolved.source === 'env' ? resolved.environment : ('sandbox' as const),
    apiKeyMasked: '',
    hasWebhookToken: false,
    webhookTokenMasked: '',
    webhookUrl,
    lastTestedAt: null,
    lastTestOk: null,
    updatedAt: null,
    source: resolved.source
  };
}

async function asaasFetch<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    uid?: string | null;
    overrideConfig?: { apiKey: string; baseUrl: string };
  } = {}
): Promise<T> {
  const cfg = options.overrideConfig
    ? { ...options.overrideConfig, source: 'user' as const }
    : getAsaasConfigForUid(options.uid);

  if (!cfg.apiKey) {
    const err = new Error(
      'Integração Asaas não configurada para esta conta. Acesse Ajustes > Integração Asaas para cadastrar sua API Key.'
    );
    (err as Error & { statusCode?: number; needsUserConfig?: boolean }).statusCode = 422;
    (err as Error & { statusCode?: number; needsUserConfig?: boolean }).needsUserConfig = true;
    throw err;
  }

  const response = await fetch(`${cfg.baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      access_token: cfg.apiKey,
      'User-Agent': 'NexusPrivate/1.0'
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000)
  });

  const text = await response.text();
  let parsed: unknown = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const parsedObj = parsed as { errors?: Array<{ description?: string; code?: string }>; message?: string };
    const firstDesc = parsedObj?.errors?.[0]?.description || parsedObj?.message || `Erro Asaas HTTP ${response.status}`;
    const err = new Error(firstDesc);
    (err as Error & { statusCode?: number }).statusCode = response.status;
    throw err;
  }

  return parsed as T;
}

function normalizeDigits(val: unknown): string {
  return typeof val === 'string' ? val.replace(/\D/g, '') : '';
}

async function resolveAsaasCustomer(
  input: {
    name: string;
    cpfCnpj?: string;
    phone?: string;
    email?: string;
    asaasCustomerId?: string | null;
  },
  uid?: string | null
): Promise<string> {
  if (input.asaasCustomerId && /^cus_[a-zA-Z0-9_-]+$/.test(input.asaasCustomerId)) {
    return input.asaasCustomerId;
  }

  const digitsCpf = normalizeDigits(input.cpfCnpj);
  const cleanEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const digitsPhone = normalizeDigits(input.phone).replace(/^55(?=\d{10,11}$)/, '');

  if (digitsCpf.length === 11 || digitsCpf.length === 14) {
    const existingByCpf = await asaasFetch<{ data?: AsaasCustomer[] }>(
      `/customers?cpfCnpj=${encodeURIComponent(digitsCpf)}`,
      { uid }
    );
    if (existingByCpf?.data && existingByCpf.data.length > 0) {
      return existingByCpf.data[0].id;
    }
  } else if (cleanEmail) {
    const existingByEmail = await asaasFetch<{ data?: AsaasCustomer[] }>(
      `/customers?email=${encodeURIComponent(cleanEmail)}`,
      { uid }
    );
    if (existingByEmail?.data && existingByEmail.data.length > 0) {
      return existingByEmail.data[0].id;
    }
  }

  const createPayload: Record<string, unknown> = {
    name: input.name.trim().slice(0, 120),
    notificationDisabled: false
  };
  if (digitsCpf.length === 11 || digitsCpf.length === 14) {
    createPayload.cpfCnpj = digitsCpf;
  }
  if (digitsPhone.length >= 10 && digitsPhone.length <= 11) {
    createPayload.mobilePhone = digitsPhone;
  }
  if (cleanEmail) {
    createPayload.email = cleanEmail;
  }

  const created = await asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: createPayload,
    uid
  });
  return created.id;
}

async function fetchChargeDetails(payment: AsaasPayment, uid?: string | null) {
  let pixData: AsaasPixQrCode | null = null;
  let boletoData: AsaasIdentificationField | null = null;

  const shouldFetchPix = payment.billingType === 'PIX' || payment.billingType === 'UNDEFINED' || payment.billingType === 'BOLETO';
  const shouldFetchBoleto = payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED';

  if (shouldFetchPix) {
    try {
      pixData = await asaasFetch<AsaasPixQrCode>(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`, { uid });
    } catch {
      // Pix QR code may not be enabled for some billing types or already paid
    }
  }

  if (shouldFetchBoleto) {
    try {
      boletoData = await asaasFetch<AsaasIdentificationField>(
        `/payments/${encodeURIComponent(payment.id)}/identificationField`,
        { uid }
      );
    } catch {
      // Identification field is only available for boleto charges
    }
  }

  return {
    asaasCustomerId: payment.customer || null,
    asaasChargeId: payment.id,
    asaasBillingType: payment.billingType || 'UNDEFINED',
    asaasStatus: payment.status || 'PENDING',
    asaasInvoiceUrl: payment.invoiceUrl || null,
    asaasBankSlipUrl: payment.bankSlipUrl || null,
    asaasPixPayload: pixData?.payload || null,
    asaasPixQrCode: pixData?.encodedImage || null,
    asaasExpirationDate: pixData?.expirationDate || null,
    asaasBoletoLine: boletoData?.identificationField || null,
    asaasLastSyncAt: new Date().toISOString()
  };
}

type FirestoreTypedValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: unknown;
};

function parseFirestoreFieldNumber(field?: FirestoreTypedValue): number {
  if (!field) return 0;
  if (typeof field.doubleValue === 'number') return field.doubleValue;
  if (typeof field.integerValue === 'string') return Number(field.integerValue) || 0;
  return 0;
}

async function fetchPortalContractFromFirestore(token: string): Promise<ServerContractRecord | null> {
  if (!isValidPortalToken(token)) return null;
  const { projectId, firestoreDatabaseId } = getFirebaseAppletConfig();
  if (!projectId) return null;

  try {
    const dbName = firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(dbName)}/documents/client_portals/${encodeURIComponent(token)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: Record<string, FirestoreTypedValue> };
    const f = json.fields;
    if (!f) return null;

    if (f.active?.booleanValue === false) return null;
    const uid = f.uid?.stringValue || '';
    const loanId = f.loanId?.stringValue || '';
    if (!uid || !loanId) return null;

    return {
      token,
      loanId,
      uid,
      lenderName: f.lenderName?.stringValue || 'Nexus Private',
      clientName: f.clientName?.stringValue || 'Cliente',
      asaasCustomerId: f.asaasCustomerId?.stringValue || null,
      capital: round2(parseFirestoreFieldNumber(f.capital)),
      interestRate: Math.max(0, parseFirestoreFieldNumber(f.interestRate)),
      periodInterest: round2(parseFirestoreFieldNumber(f.periodInterest)),
      totalBruto: round2(parseFirestoreFieldNumber(f.totalBruto)),
      date: f.date?.stringValue || '',
      dueDate: f.dueDate?.stringValue || '',
      status: f.status?.stringValue || 'Pendente',
      capitalPago: round2(parseFirestoreFieldNumber(f.capitalPago)),
      jurosPagos: round2(parseFirestoreFieldNumber(f.jurosPagos)),
      updatedAt: f.updatedAt?.stringValue || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function getEffectiveProjectedContract(token: string, baseContract?: ServerContractRecord) {
  const stored = baseContract || ledger.contracts[token];
  const tokenCharges = Object.values(ledger.charges)
    .filter((c) => c.token === token)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pendingSettlements = tokenCharges.filter((c) => c.settled && !c.reconciledInFirestore);
  const settledCharges = tokenCharges.filter((c) => c.settled);

  if (!stored) {
    return {
      projectedContract: undefined,
      activeCharges: tokenCharges.filter((c) => !c.settled),
      pendingSettlements,
      settledPayments: settledCharges.map((c) => ({
        id: c.id,
        token: c.token,
        loanId: c.loanId,
        uid: c.uid,
        operationType: c.operationType,
        amount: c.totalAmount,
        interestAmount: c.interestAmount,
        amortizedAmount: c.amortizedAmount,
        paymentMethod: 'PIX' as const,
        description:
          c.operationType === 'JUROS'
            ? `Renovação com pagamento de juros via PIX Asaas`
            : c.operationType === 'AMORTIZACAO'
            ? `Amortização (${c.amortizedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) + Juros (${c.interestAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) via PIX Asaas`
            : `Quitação total via PIX Asaas`,
        asaasChargeId: c.asaasChargeId,
        date: c.settledAt || c.updatedAt
      }))
    };
  }

  let capital = round2(stored.capital);
  let periodInterest = round2(stored.periodInterest);
  let totalBruto = round2(stored.totalBruto);
  let dueDate = stored.dueDate;
  let date = stored.date;
  let status = stored.status;
  let capitalPago = round2(stored.capitalPago);
  let jurosPagos = round2(stored.jurosPagos);
  const interestRate = stored.interestRate;

  for (const ch of pendingSettlements) {
    if (ch.operationType === 'JUROS') {
      jurosPagos = round2(jurosPagos + ch.interestAmount);
      dueDate = ch.dueDateAfter;
      date = (ch.settledAt || new Date().toISOString()).slice(0, 10);
      periodInterest = round2(capital * interestRate);
      totalBruto = round2(capital + periodInterest);
      status = 'Pago';
    } else if (ch.operationType === 'AMORTIZACAO') {
      capital = round2(Math.max(0, capital - ch.amortizedAmount));
      capitalPago = round2(capitalPago + ch.amortizedAmount);
      jurosPagos = round2(jurosPagos + ch.interestAmount);
      dueDate = ch.dueDateAfter;
      date = (ch.settledAt || new Date().toISOString()).slice(0, 10);
      periodInterest = round2(capital * interestRate);
      totalBruto = round2(capital + periodInterest);
      status = capital === 0 ? 'Pago' : 'Pendente';
    } else if (ch.operationType === 'QUITACAO') {
      capitalPago = round2(capitalPago + capital);
      jurosPagos = round2(jurosPagos + ch.interestAmount);
      capital = 0;
      periodInterest = 0;
      totalBruto = 0;
      status = 'Pago';
    }
  }

  return {
    projectedContract: {
      token: stored.token,
      loanId: stored.loanId,
      uid: stored.uid,
      lenderName: stored.lenderName,
      clientName: stored.clientName,
      capital,
      interestRate,
      periodInterest,
      totalBruto,
      date,
      dueDate,
      status: status as 'Pendente' | 'Pago' | 'Atrasado' | 'Agendado',
      capitalPago,
      jurosPagos,
      asaasCustomerId: stored.asaasCustomerId || null,
      active: true,
      updatedAt: stored.updatedAt
    },
    activeCharges: tokenCharges.filter((c) => !c.settled),
    pendingSettlements,
    settledPayments: settledCharges.map((c) => ({
      id: c.id,
      token: c.token,
      loanId: c.loanId,
      uid: c.uid,
      operationType: c.operationType,
      amount: c.totalAmount,
      interestAmount: c.interestAmount,
      amortizedAmount: c.amortizedAmount,
      paymentMethod: 'PIX' as const,
      description:
        c.operationType === 'JUROS'
          ? `Renovação com pagamento de juros via PIX Asaas`
          : c.operationType === 'AMORTIZACAO'
          ? `Amortização (${c.amortizedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) + Juros (${c.interestAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) via PIX Asaas`
          : `Quitação total via PIX Asaas`,
      asaasChargeId: c.asaasChargeId,
      date: c.settledAt || c.updatedAt
    }))
  };
}

function markChargeSettledInLedger(
  charge: ServerChargeRecord,
  newStatus: string,
  webhookEvent: string | null = null
): boolean {
  const nowIso = new Date().toISOString();
  charge.asaasStatus = newStatus;
  charge.updatedAt = nowIso;
  if (webhookEvent) {
    charge.webhookEvent = webhookEvent;
  }

  if (PAID_ASAAS_STATUSES.has(newStatus.toUpperCase()) && !charge.settled) {
    charge.settled = true;
    charge.settledAt = charge.settledAt || nowIso;
    return true;
  }
  return false;
}

function safeCompareTokens(provided: string, expected: string): boolean {
  const bufA = Buffer.from(provided, 'utf8');
  const bufB = Buffer.from(expected, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Check Asaas integration status (per authenticated user if Bearer token provided, else env fallback status)
  app.get('/api/asaas/status', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    const resolved = getAsaasConfigForUid(authUser?.uid);
    res.json({
      configured: Boolean(resolved.apiKey),
      environment: resolved.environment,
      source: resolved.source
    });
  });

  // Per-user Asaas integration configuration routes (strictly isolated by authenticated uid)
  app.get('/api/asaas/config', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    res.json(buildUserConfigView(req, authUser.uid));
  });

  app.put('/api/asaas/config', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    const body = req.body as {
      apiKey?: string;
      environment?: string;
      webhookToken?: string;
      updateWebhookToken?: boolean;
    };

    const environment: 'sandbox' | 'production' =
      body?.environment === 'production' ? 'production' : 'sandbox';
    const existing = ledger.userConfigs[authUser.uid];
    const incomingApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';

    if (incomingApiKey && (incomingApiKey.length < 10 || incomingApiKey.length > 500 || /\s/.test(incomingApiKey))) {
      res.status(400).json({ error: 'API Key do Asaas inválida. Verifique se foi colada corretamente sem espaços.' });
      return;
    }

    const resolvedApiKey = incomingApiKey || (existing?.apiKeyEncrypted ? decryptSecret(existing.apiKeyEncrypted).trim() : '');
    if (!resolvedApiKey) {
      res.status(400).json({ error: 'Informe sua API Key do Asaas para salvar a configuração.' });
      return;
    }

    let webhookTokenEncrypted = existing?.webhookTokenEncrypted ?? null;
    let webhookTokenMasked = existing?.webhookTokenMasked ?? null;
    if (body?.updateWebhookToken || typeof body?.webhookToken === 'string') {
      const cleanWebhook = (body.webhookToken || '').trim();
      if (cleanWebhook.length > 256) {
        res.status(400).json({ error: 'Webhook Token excede o tamanho máximo permitido (256 caracteres).' });
        return;
      }
      if (cleanWebhook) {
        webhookTokenEncrypted = encryptSecret(cleanWebhook);
        webhookTokenMasked = maskSecret(cleanWebhook);
      } else if (body?.updateWebhookToken) {
        webhookTokenEncrypted = null;
        webhookTokenMasked = null;
      }
    }

    const nowIso = new Date().toISOString();
    ledger.userConfigs[authUser.uid] = {
      uid: authUser.uid,
      environment,
      apiKeyEncrypted: incomingApiKey ? encryptSecret(incomingApiKey) : existing!.apiKeyEncrypted,
      apiKeyMasked: incomingApiKey ? maskSecret(incomingApiKey) : existing!.apiKeyMasked,
      webhookTokenEncrypted,
      webhookTokenMasked,
      lastTestedAt: existing?.lastTestedAt || null,
      lastTestOk: existing?.lastTestOk ?? null,
      updatedAt: nowIso
    };

    await persistLedger();
    res.json(buildUserConfigView(req, authUser.uid));
  });

  app.post('/api/asaas/config/test', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    const body = req.body as {
      apiKey?: string;
      environment?: string;
    };

    const existing = ledger.userConfigs[authUser.uid];
    const enteredKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    const testEnv: 'sandbox' | 'production' =
      body?.environment === 'production'
        ? 'production'
        : body?.environment === 'sandbox'
        ? 'sandbox'
        : existing?.environment === 'production'
        ? 'production'
        : 'sandbox';

    const resolvedKey =
      enteredKey || (existing?.apiKeyEncrypted ? decryptSecret(existing.apiKeyEncrypted).trim() : '');

    if (!resolvedKey) {
      res.status(400).json({ error: 'Informe ou salve uma API Key do Asaas antes de testar a conexão.' });
      return;
    }

    const nowIso = new Date().toISOString();
    try {
      await asaasFetch<{ data?: unknown[] }>('/customers?limit=1', {
        overrideConfig: {
          apiKey: resolvedKey,
          baseUrl: getAsaasBaseUrl(testEnv)
        }
      });

      if (existing) {
        existing.lastTestedAt = nowIso;
        existing.lastTestOk = true;
        await persistLedger();
      }

      res.json({
        ok: true,
        environment: testEnv,
        message: `Conexão com Asaas (${testEnv === 'production' ? 'Produção' : 'Sandbox'}) validada com sucesso!`,
        config: buildUserConfigView(req, authUser.uid)
      });
    } catch (err) {
      if (existing) {
        existing.lastTestedAt = nowIso;
        existing.lastTestOk = false;
        await persistLedger();
      }
      const e = err as Error & { statusCode?: number };
      const status = e.statusCode && e.statusCode >= 400 && e.statusCode < 500 ? e.statusCode : 400;
      res.status(status).json({
        ok: false,
        environment: testEnv,
        error: e.message || 'Não foi possível validar a API Key no Asaas. Verifique a chave e o ambiente escolhido.',
        config: buildUserConfigView(req, authUser.uid)
      });
    }
  });

  app.delete('/api/asaas/config', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    delete ledger.userConfigs[authUser.uid];
    await persistLedger();
    res.json({
      ok: true,
      ...buildUserConfigView(req, authUser.uid)
    });
  });

  // Admin: Register/sync contracts & customer billing metadata server-side (never exposed to public routes)
  app.post('/api/client-portal/sync-contracts', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    const body = req.body as { contracts?: Array<Partial<ServerContractRecord>> };
    if (!Array.isArray(body?.contracts)) {
      res.status(400).json({ error: 'Lista de contratos inválida.' });
      return;
    }

    const nowIso = new Date().toISOString();
    let count = 0;

    for (const item of body.contracts.slice(0, 500)) {
      if (!isValidPortalToken(item?.token) || typeof item?.loanId !== 'string' || !item.loanId) {
        continue;
      }
      const existing = ledger.contracts[item.token];
      if (existing && existing.uid !== authUser.uid) {
        continue;
      }

      ledger.contracts[item.token] = {
        token: item.token,
        loanId: item.loanId.slice(0, 128),
        uid: authUser.uid,
        lenderName: String(item.lenderName || 'Nexus Private').slice(0, 100),
        clientName: String(item.clientName || 'Cliente').slice(0, 120),
        clientCpf: typeof item.clientCpf === 'string' ? item.clientCpf.slice(0, 20) : existing?.clientCpf,
        clientPhone: typeof item.clientPhone === 'string' ? item.clientPhone.slice(0, 30) : existing?.clientPhone,
        clientEmail: typeof item.clientEmail === 'string' ? item.clientEmail.slice(0, 256) : existing?.clientEmail,
        asaasCustomerId:
          typeof item.asaasCustomerId === 'string' && item.asaasCustomerId
            ? item.asaasCustomerId.slice(0, 128)
            : existing?.asaasCustomerId || null,
        capital: round2(Number(item.capital) || 0),
        interestRate: Math.max(0, Number(item.interestRate) || 0),
        periodInterest: round2(Number(item.periodInterest) || 0),
        totalBruto: round2(Number(item.totalBruto) || 0),
        date: String(item.date || '').slice(0, 20),
        dueDate: String(item.dueDate || '').slice(0, 20),
        status: String(item.status || 'Pendente').slice(0, 30),
        capitalPago: round2(Number(item.capitalPago) || 0),
        jurosPagos: round2(Number(item.jurosPagos) || 0),
        updatedAt: nowIso
      };
      count += 1;
    }

    await persistLedger();
    res.json({ synced: count });
  });

  // Admin: Retrieve settled charges from Asaas webhooks/live checks waiting to be reconciled in Firestore
  app.get('/api/asaas/pending-reconciliations', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    const pending = Object.values(ledger.charges)
      .filter((c) => c.uid === authUser.uid && c.settled && !c.reconciledInFirestore)
      .sort((a, b) => (a.settledAt || a.createdAt).localeCompare(b.settledAt || b.createdAt));

    res.json({ pending });
  });

  // Admin: Acknowledge reconciliation committed cleanly to Firestore
  app.post('/api/asaas/pending-reconciliations/ack', async (req, res) => {
    const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!authUser) {
      res.status(401).json({ error: 'Autenticação necessária.' });
      return;
    }

    const body = req.body as { chargeId?: string };
    const chargeId = typeof body?.chargeId === 'string' ? body.chargeId.trim() : '';
    const charge = chargeId ? ledger.charges[chargeId] : undefined;
    if (!charge || charge.uid !== authUser.uid) {
      res.status(404).json({ error: 'Cobrança não encontrada.' });
      return;
    }

    charge.reconciledInFirestore = true;
    charge.reconciledAt = new Date().toISOString();
    await persistLedger();
    res.json({ ok: true });
  });

  // Client Portal: Token-isolated contract projection & unsettled/settled PIX charges (NO PII)
  app.get('/api/client-portal/projection/:token', async (req, res) => {
    const token = (req.params.token || '').trim();
    if (!isValidPortalToken(token)) {
      res.status(400).json({ error: 'Token de acesso inválido.' });
      return;
    }

    let storedContract = ledger.contracts[token];
    if (!storedContract) {
      const verifiedDoc = await fetchPortalContractFromFirestore(token);
      if (verifiedDoc) {
        storedContract = verifiedDoc;
        ledger.contracts[token] = verifiedDoc;
      }
    }

    const projection = getEffectiveProjectedContract(token, storedContract);
    const ownerUid = storedContract?.uid || projection.activeCharges[0]?.uid || projection.settledPayments[0]?.uid || null;
    const ownerConfig = getAsaasConfigForUid(ownerUid);
    res.json({
      ...projection,
      asaasConfigured: Boolean(ownerConfig.apiKey)
    });
  });

  // Client Portal: Generate Asaas PIX charge strictly for one of the 3 allowed operations
  app.post('/api/client-portal/charges', async (req, res) => {
    try {
      const body = req.body as {
        token?: string;
        operationType?: PortalOperationType;
        amortizedAmount?: number;
        contractSnapshot?: {
          loanId?: string;
          uid?: string;
          lenderName?: string;
          clientName?: string;
          capital?: number;
          interestRate?: number;
          periodInterest?: number;
          dueDate?: string;
          date?: string;
          status?: string;
          asaasCustomerId?: string | null;
        };
      };

      const token = (body?.token || '').trim();
      if (!isValidPortalToken(token)) {
        res.status(400).json({ error: 'Link do contrato inválido.' });
        return;
      }

      const operationType = body?.operationType;
      if (operationType !== 'JUROS' && operationType !== 'AMORTIZACAO' && operationType !== 'QUITACAO') {
        res.status(400).json({ error: 'Tipo de operação inválido. Utilize JUROS, AMORTIZACAO ou QUITACAO.' });
        return;
      }

      // Build authoritative base contract from server registry or verified Firestore portal doc
      let storedContract = ledger.contracts[token];
      if (!storedContract) {
        const verifiedDoc = await fetchPortalContractFromFirestore(token);
        if (verifiedDoc) {
          storedContract = verifiedDoc;
          ledger.contracts[token] = verifiedDoc;
        }
      }

      if (!storedContract) {
        res.status(404).json({ error: 'Contrato não localizado ou indisponível para este token.' });
        return;
      }

      const ownerConfig = getAsaasConfigForUid(storedContract.uid);
      if (!ownerConfig.apiKey) {
        res.status(422).json({
          configured: false,
          needsUserConfig: true,
          error: 'O responsável por este contrato ainda não configurou a integração Asaas em Ajustes para pagamentos via PIX.'
        });
        return;
      }

      const { projectedContract } = getEffectiveProjectedContract(token, storedContract);
      const effective = projectedContract || storedContract;
      const principalBefore = round2(effective.capital);
      const rate = Math.max(0, effective.interestRate);
      let interestAmount = round2(effective.periodInterest);
      if (interestAmount <= 0 && principalBefore > 0) {
        interestAmount = round2(principalBefore * rate);
      }

      if (principalBefore <= 0 || (effective.status === 'Pago' && principalBefore <= 0)) {
        res.status(400).json({ error: 'Este contrato já encontra-se quitado.' });
        return;
      }

      let amortizedAmount = 0;
      let totalAmount = 0;
      let projectedNewCapital = principalBefore;
      const dueDateBefore = effective.dueDate || new Date().toISOString().slice(0, 10);
      const dueDateAfter =
        operationType === 'QUITACAO'
          ? dueDateBefore
          : computeNextDueDateISO(dueDateBefore);

      if (operationType === 'JUROS') {
        amortizedAmount = 0;
        totalAmount = interestAmount;
        projectedNewCapital = principalBefore;
        if (totalAmount <= 0) {
          res.status(400).json({ error: 'Valor de juros do período inválido para cobrança.' });
          return;
        }
      } else if (operationType === 'AMORTIZACAO') {
        const requestedAmort = round2(Number(body?.amortizedAmount) || 0);
        if (!Number.isFinite(requestedAmort) || requestedAmort <= 0 || requestedAmort >= principalBefore) {
          res.status(400).json({
            error: 'Informe um valor de amortização maior que R$ 0,00 e menor que o saldo principal atual.'
          });
          return;
        }
        amortizedAmount = requestedAmort;
        totalAmount = round2(interestAmount + amortizedAmount);
        projectedNewCapital = round2(principalBefore - amortizedAmount);
      } else {
        // QUITACAO
        amortizedAmount = principalBefore;
        totalAmount = round2(principalBefore + interestAmount);
        projectedNewCapital = 0;
      }

      const customerId = await resolveAsaasCustomer(
        {
          name: storedContract.clientName,
          cpfCnpj: storedContract.clientCpf,
          phone: storedContract.clientPhone,
          email: storedContract.clientEmail,
          asaasCustomerId: storedContract.asaasCustomerId
        },
        storedContract.uid
      );

      if (!storedContract.asaasCustomerId && customerId) {
        storedContract.asaasCustomerId = customerId;
        ledger.contracts[token] = storedContract;
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const chargeDueDate = dueDateBefore >= todayIso ? dueDateBefore : todayIso;
      const opLabel =
        operationType === 'JUROS'
          ? 'Renovação (Juros)'
          : operationType === 'AMORTIZACAO'
          ? 'Amortização + Juros'
          : 'Quitação Total';

      const payment = await asaasFetch<AsaasPayment>('/payments', {
        method: 'POST',
        uid: storedContract.uid,
        body: {
          customer: customerId,
          billingType: 'PIX',
          value: totalAmount,
          dueDate: chargeDueDate,
          description: `Nexus Private · ${opLabel} · Contrato #${storedContract.loanId.slice(0, 6).toUpperCase()}`,
          externalReference: `np:${token}:${operationType}`
        }
      });

      const details = await fetchChargeDetails(payment, storedContract.uid);
      const nowIso = new Date().toISOString();
      const record: ServerChargeRecord = {
        id: payment.id,
        token,
        loanId: storedContract.loanId,
        uid: storedContract.uid,
        operationType,
        totalAmount,
        interestAmount,
        amortizedAmount,
        principalBefore,
        projectedNewCapital,
        dueDateBefore,
        dueDateAfter,
        billingType: 'PIX',
        asaasChargeId: payment.id,
        asaasCustomerId: customerId,
        asaasStatus: details.asaasStatus,
        asaasPixPayload: details.asaasPixPayload,
        asaasPixQrCode: details.asaasPixQrCode,
        asaasInvoiceUrl: details.asaasInvoiceUrl,
        asaasExpirationDate: details.asaasExpirationDate,
        settled: PAID_ASAAS_STATUSES.has((details.asaasStatus || '').toUpperCase()),
        settledAt: PAID_ASAAS_STATUSES.has((details.asaasStatus || '').toUpperCase()) ? nowIso : null,
        webhookEvent: null,
        reconciledInFirestore: false,
        reconciledAt: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      ledger.charges[record.id] = record;
      await persistLedger();
      res.status(201).json(record);
    } catch (err) {
      const e = err as Error & { statusCode?: number; needsUserConfig?: boolean };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: !e.needsUserConfig && status !== 503,
        needsUserConfig: Boolean(e.needsUserConfig),
        error: e.message || 'Falha ao gerar cobrança PIX no Asaas.'
      });
    }
  });

  // Client Portal: Sync live payment status for a single token-owned charge using the contract owner's Asaas config
  app.get('/api/client-portal/charges/:token/:chargeId/sync', async (req, res) => {
    try {
      const token = (req.params.token || '').trim();
      const chargeId = (req.params.chargeId || '').trim();
      if (!isValidPortalToken(token) || !/^[a-zA-Z0-9_-]{1,128}$/.test(chargeId)) {
        res.status(400).json({ error: 'Parâmetros de cobrança inválidos.' });
        return;
      }

      const existing = ledger.charges[chargeId];
      if (existing && existing.token !== token) {
        res.status(403).json({ error: 'Acesso negado a esta cobrança.' });
        return;
      }

      let storedContract = ledger.contracts[token];
      if (!existing && !storedContract) {
        const verifiedDoc = await fetchPortalContractFromFirestore(token);
        if (verifiedDoc) {
          storedContract = verifiedDoc;
          ledger.contracts[token] = verifiedDoc;
        }
      }

      const ownerUid = existing?.uid || storedContract?.uid;
      if (!ownerUid) {
        res.status(404).json({ error: 'Contrato não localizado para sincronização.' });
        return;
      }

      const payment = await asaasFetch<AsaasPayment>(`/payments/${encodeURIComponent(chargeId)}`, {
        uid: ownerUid
      });
      if (payment.externalReference?.startsWith('np:')) {
        const refToken = payment.externalReference.split(':')[1];
        if (refToken && refToken !== token) {
          res.status(403).json({ error: 'Acesso negado a esta cobrança.' });
          return;
        }
      }

      const details = await fetchChargeDetails(payment, ownerUid);
      if (existing) {
        existing.asaasPixPayload = details.asaasPixPayload || existing.asaasPixPayload;
        existing.asaasPixQrCode = details.asaasPixQrCode || existing.asaasPixQrCode;
        existing.asaasInvoiceUrl = details.asaasInvoiceUrl || existing.asaasInvoiceUrl;
        existing.asaasExpirationDate = details.asaasExpirationDate || existing.asaasExpirationDate;
        markChargeSettledInLedger(existing, details.asaasStatus || payment.status || 'PENDING');
        await persistLedger();
        res.json(existing);
        return;
      }

      res.json(details);
    } catch (err) {
      const e = err as Error & { statusCode?: number; needsUserConfig?: boolean };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: !e.needsUserConfig && status !== 503,
        needsUserConfig: Boolean(e.needsUserConfig),
        error: e.message || 'Falha ao consultar pagamento PIX no Asaas.'
      });
    }
  });

  // Create a new Asaas charge (Authenticated lender uses their own isolated Asaas config)
  app.post('/api/asaas/charges', async (req, res) => {
    try {
      const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!authUser) {
        res.status(401).json({ error: 'Autenticação necessária para emitir cobranças Asaas.' });
        return;
      }

      const userAsaas = getAsaasConfigForUid(authUser.uid);
      if (!userAsaas.apiKey) {
        res.status(422).json({
          configured: false,
          needsUserConfig: true,
          error: 'Sua conta ainda não possui uma API Key do Asaas configurada. Acesse Ajustes > Integração Asaas para configurar.'
        });
        return;
      }

      const body = req.body as {
        loanId?: string;
        clientName?: string;
        clientCpf?: string;
        clientPhone?: string;
        clientEmail?: string;
        amount?: number;
        dueDate?: string;
        description?: string;
        billingType?: AsaasBillingType;
      };

      const clientName = (body.clientName || '').trim();
      const amount = Number(body.amount || 0);
      const dueDate = (body.dueDate || '').trim();
      const loanId = (body.loanId || '').trim();
      const billingType: AsaasBillingType =
        body.billingType === 'PIX' || body.billingType === 'BOLETO' || body.billingType === 'UNDEFINED'
          ? body.billingType
          : 'UNDEFINED';

      if (!clientName) {
        res.status(400).json({ error: 'Nome do cliente é obrigatório para gerar cobrança.' });
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'Valor da cobrança deve ser maior que zero.' });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        res.status(400).json({ error: 'Data de vencimento inválida (esperado AAAA-MM-DD).' });
        return;
      }

      const customerId = await resolveAsaasCustomer(
        {
          name: clientName,
          cpfCnpj: body.clientCpf,
          phone: body.clientPhone,
          email: body.clientEmail
        },
        authUser.uid
      );

      const payment = await asaasFetch<AsaasPayment>('/payments', {
        method: 'POST',
        uid: authUser.uid,
        body: {
          customer: customerId,
          billingType,
          value: Math.round(amount * 100) / 100,
          dueDate,
          description: (body.description || `Empréstimo Nexus Private - ${clientName}`).slice(0, 500),
          externalReference: loanId || undefined
        }
      });

      const chargeDetails = await fetchChargeDetails(payment, authUser.uid);
      res.status(201).json(chargeDetails);
    } catch (err) {
      const e = err as Error & { statusCode?: number; needsUserConfig?: boolean };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: !e.needsUserConfig && status !== 503,
        needsUserConfig: Boolean(e.needsUserConfig),
        error: e.message || 'Falha ao gerar cobrança no Asaas.'
      });
    }
  });

  // Sync live status & payment codes for an existing Asaas charge using authenticated owner's config
  app.get('/api/asaas/charges/:paymentId', async (req, res) => {
    try {
      const authUser = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!authUser) {
        res.status(401).json({ error: 'Autenticação necessária para consultar cobranças Asaas.' });
        return;
      }

      const paymentId = (req.params.paymentId || '').trim();
      if (!paymentId || !/^[a-zA-Z0-9_-]+$/.test(paymentId)) {
        res.status(400).json({ error: 'ID de cobrança Asaas inválido.' });
        return;
      }

      const ledgerCharge = ledger.charges[paymentId];
      if (ledgerCharge && ledgerCharge.uid !== authUser.uid) {
        res.status(403).json({ error: 'Acesso negado a esta cobrança.' });
        return;
      }

      const payment = await asaasFetch<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
        uid: authUser.uid
      });
      const chargeDetails = await fetchChargeDetails(payment, authUser.uid);
      if (ledgerCharge) {
        markChargeSettledInLedger(ledgerCharge, chargeDetails.asaasStatus || payment.status || 'PENDING');
        await persistLedger();
      }
      res.json(chargeDetails);
    } catch (err) {
      const e = err as Error & { statusCode?: number; needsUserConfig?: boolean };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: !e.needsUserConfig && status !== 503,
        needsUserConfig: Boolean(e.needsUserConfig),
        error: e.message || 'Falha ao consultar cobrança no Asaas.'
      });
    }
  });

  // Shared webhook processor (supports isolated per-user URL /api/asaas/webhook/:uid and fallback /api/asaas/webhook)
  const handleAsaasWebhook = async (req: express.Request, res: express.Response, targetUid?: string) => {
    const body = req.body as {
      event?: string;
      payment?: {
        id?: string;
        status?: string;
        value?: number;
        externalReference?: string;
        confirmedDate?: string;
      };
    };

    const eventName = typeof body?.event === 'string' ? body.event.trim().toUpperCase() : '';
    const paymentId = typeof body?.payment?.id === 'string' ? body.payment.id.trim() : '';
    const rawStatus = typeof body?.payment?.status === 'string' ? body.payment.status.trim().toUpperCase() : '';
    const effectiveStatus = rawStatus || (PAID_WEBHOOK_EVENTS.has(eventName) ? 'RECEIVED' : '');

    const trackedCharge = paymentId ? ledger.charges[paymentId] : undefined;
    const ownerUid = targetUid || trackedCharge?.uid;

    if (targetUid && trackedCharge && trackedCharge.uid !== targetUid) {
      res.status(403).json({ error: 'Cobrança não pertence a esta conta.' });
      return;
    }

    const expectedToken = getWebhookTokenForUid(ownerUid);
    if (expectedToken) {
      const provided = String(req.headers['asaas-access-token'] || '');
      if (!safeCompareTokens(provided, expectedToken)) {
        res.status(401).json({ error: 'Token de webhook inválido.' });
        return;
      }
    }

    if (trackedCharge) {
      markChargeSettledInLedger(trackedCharge, effectiveStatus || trackedCharge.asaasStatus, eventName || null);
      await persistLedger();
    }

    res.status(200).json({ received: true, processed: Boolean(trackedCharge) });
  };

  app.post('/api/asaas/webhook/:uid', async (req, res) => {
    const uid = (req.params.uid || '').trim();
    if (!/^[a-zA-Z0-9_:-]{1,128}$/.test(uid)) {
      res.status(400).json({ error: 'Identificador de conta inválido.' });
      return;
    }
    await handleAsaasWebhook(req, res, uid);
  });

  app.post('/api/asaas/webhook', async (req, res) => {
    await handleAsaasWebhook(req, res);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Private server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

