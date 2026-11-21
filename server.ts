import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

type AsaasBillingType = 'UNDEFINED' | 'PIX' | 'BOLETO';

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

function getAsaasConfig(): { apiKey: string; baseUrl: string; environment: 'sandbox' | 'production' } {
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

async function asaasFetch<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { apiKey, baseUrl } = getAsaasConfig();
  if (!apiKey) {
    const err = new Error('ASAAS_API_KEY não configurada no servidor.');
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
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

async function resolveAsaasCustomer(input: {
  name: string;
  cpfCnpj?: string;
  phone?: string;
  email?: string;
}): Promise<string> {
  const digitsCpf = normalizeDigits(input.cpfCnpj);
  const cleanEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const digitsPhone = normalizeDigits(input.phone).replace(/^55(?=\d{10,11}$)/, '');

  if (digitsCpf.length === 11 || digitsCpf.length === 14) {
    const existingByCpf = await asaasFetch<{ data?: AsaasCustomer[] }>(
      `/customers?cpfCnpj=${encodeURIComponent(digitsCpf)}`
    );
    if (existingByCpf?.data && existingByCpf.data.length > 0) {
      return existingByCpf.data[0].id;
    }
  } else if (cleanEmail) {
    const existingByEmail = await asaasFetch<{ data?: AsaasCustomer[] }>(
      `/customers?email=${encodeURIComponent(cleanEmail)}`
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
    body: createPayload
  });
  return created.id;
}

async function fetchChargeDetails(payment: AsaasPayment) {
  let pixData: AsaasPixQrCode | null = null;
  let boletoData: AsaasIdentificationField | null = null;

  const shouldFetchPix = payment.billingType === 'PIX' || payment.billingType === 'UNDEFINED' || payment.billingType === 'BOLETO';
  const shouldFetchBoleto = payment.billingType === 'BOLETO' || payment.billingType === 'UNDEFINED';

  if (shouldFetchPix) {
    try {
      pixData = await asaasFetch<AsaasPixQrCode>(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
    } catch {
      // Pix QR code may not be enabled for some billing types or already paid
    }
  }

  if (shouldFetchBoleto) {
    try {
      boletoData = await asaasFetch<AsaasIdentificationField>(
        `/payments/${encodeURIComponent(payment.id)}/identificationField`
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
    asaasBoletoLine: boletoData?.identificationField || null,
    asaasLastSyncAt: new Date().toISOString()
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Check if Asaas integration is configured on the server (never exposes key)
  app.get('/api/asaas/status', (_req, res) => {
    const { apiKey, environment } = getAsaasConfig();
    res.json({
      configured: Boolean(apiKey),
      environment
    });
  });

  // Create a new Asaas charge (Pix / Boleto)
  app.post('/api/asaas/charges', async (req, res) => {
    try {
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

      const customerId = await resolveAsaasCustomer({
        name: clientName,
        cpfCnpj: body.clientCpf,
        phone: body.clientPhone,
        email: body.clientEmail
      });

      const payment = await asaasFetch<AsaasPayment>('/payments', {
        method: 'POST',
        body: {
          customer: customerId,
          billingType,
          value: Math.round(amount * 100) / 100,
          dueDate,
          description: (body.description || `Empréstimo Nexus Private - ${clientName}`).slice(0, 500),
          externalReference: loanId || undefined
        }
      });

      const chargeDetails = await fetchChargeDetails(payment);
      res.status(201).json(chargeDetails);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: status !== 503,
        error: e.message || 'Falha ao gerar cobrança no Asaas.'
      });
    }
  });

  // Sync live status & payment codes for an existing Asaas charge
  app.get('/api/asaas/charges/:paymentId', async (req, res) => {
    try {
      const paymentId = (req.params.paymentId || '').trim();
      if (!paymentId || !/^[a-zA-Z0-9_-]+$/.test(paymentId)) {
        res.status(400).json({ error: 'ID de cobrança Asaas inválido.' });
        return;
      }

      const payment = await asaasFetch<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
      const chargeDetails = await fetchChargeDetails(payment);
      res.json(chargeDetails);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      const status = e.statusCode && e.statusCode >= 400 ? e.statusCode : 500;
      res.status(status).json({
        configured: status !== 503,
        error: e.message || 'Falha ao consultar cobrança no Asaas.'
      });
    }
  });

  // Optional webhook receiver for Asaas payment events
  app.post('/api/asaas/webhook', (req, res) => {
    const expectedToken = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
    if (expectedToken) {
      const provided = String(req.headers['asaas-access-token'] || '');
      if (provided !== expectedToken) {
        res.status(401).json({ error: 'Token de webhook inválido.' });
        return;
      }
    }
    res.status(200).json({ received: true });
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
