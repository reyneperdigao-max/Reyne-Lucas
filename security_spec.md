# Security Specification: Nexus Private

## Data Invariants
1. A loan must belong to the user who created it (`uid`).
2. A loan's `totalBruto` must always be non-negative and computed cleanly from `capital * (1 + interestRate)` (plus accrued overdue cycles).
3. `interestRate` must be a non-negative number.
4. `capital`, `capitalPago`, and `jurosPagos` must be non-negative numbers.
5. The `status` of a loan must be one of: "Pendente", "Pago", "Atrasado", "Agendado".
6. System actions must record the current user's `uid` and properly reference a `loanId`.
7. User profiles can only be managed by the owner.
8. Each `/client_portals/{token}` document must be keyed by a cryptographic `cli_...` token (`>= 24` chars), reference an existing `loans/{loanId}` owned by `uid`, and contain zero sensitive PII (`cpf`, `email`, `phone`, `address`).
9. Public `list` queries on `/client_portals` are strictly forbidden; only the authenticated lender (`uid`) may list their own portal records.
10. Every charge in `/client_portals/{token}/charges/{chargeId}` must record `operationType` in `['JUROS', 'AMORTIZACAO', 'QUITACAO']`, non-negative `interestAmount` and `amortizedAmount`, `totalAmount > 0`, and must start with `settled == false` upon creation.
11. Only the authenticated lender (`uid`) or admin may mark a charge `settled == true`, apply balance/dueDate mutations on `/loans/{loanId}` and `/client_portals/{token}`, or record verified entries in `/client_portals/{token}/payments/{paymentId}`.
12. Per-user Asaas integration documents at `/users/{userId}/integrations/asaas` store only non-secret display status/metadata (`configured`, `environment`, masked key suffix, `webhookUrl`) and are strictly readable/writable only by `isOwner(userId)`. Raw Asaas API keys and webhook secrets never leave the server in plaintext.

## The "Dirty Dozen" Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempting to create a loan or client portal with another user's `uid`.
2. **Resource Poisoning**: Injecting an oversized string into `clientName`, `loanId`, `token`, or `asaasChargeId`.
3. **Ghost Field Injection**: Adding unexpected shadow fields (e.g., `isAdmin: true`, `settledByFake: true`) to `loans`, `client_portals`, `charges`, or `payments`.
4. **Relationship Orphanage**: Creating a `client_portals/{token}` or `charges/{chargeId}` for a non-existent `loanId` or `token`.
5. **State Skipping / Fake Settlement**: An unauthenticated client portal caller attempting to create a charge with `settled: true` or `asaasStatus: 'RECEIVED'`, or directly updating `capital: 0` on `/client_portals/{token}` or `/loans/{loanId}`.
6. **Immutable Field Tampering**: Changing `uid`, `loanId`, `token`, or `operationType` after document creation.
7. **Negative / Invalid Financial Values**: Creating a charge with `amortizedAmount < 0`, `interestAmount < 0`, or `totalAmount <= 0`.
8. **PII Leak**: An authenticated or unauthenticated user attempting to `list` `/client_portals` or read another user's `/loans` or `/users`.
9. **Token Guessing / Short ID**: Creating or querying a `/client_portals/{token}` document without the `cli_` prefix or below minimum length `< 24`.
10. **Shadow List Query**: Authenticated user trying to global-list `/loans`, `/client_portals`, or `/actions` without `uid` ownership enforcement.
11. **Operation Type Spoofing**: Submitting a charge with an unknown `operationType` outside `JUROS | AMORTIZACAO | QUITACAO`.
12. **Webhook Spoofing**: Calling `/api/asaas/webhook/:uid` with a forged or mismatched `asaas-access-token` header or cross-tenant charge ID, or tampering with charge amounts client-side.
13. **Cross-User Credential Access**: One authenticated user attempting to read or overwrite another user's `/users/{otherUid}/integrations/asaas` document or `/api/asaas/config`.

## Test Runner (Verification)

Validated via ESLint (`@firebase/eslint-plugin-security-rules`) and server-side threat checks.
