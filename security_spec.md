# Security Specification: Nexus Private

## Data Invariants
1. A loan must belong to the user who created it (`uid`).
2. A loan's `totalBruto` must always be `capital * (1 + interestRate)`.
3. `interestRate` must be a positive number.
4. `capital`, `capitalPago`, and `jurosPagos` must be positive numbers.
5. The `status` of a loan must be one of: "Pendente", "Pago", "Atrasado", "Agendado".
6. System actions must record the current user's `uid` and properly reference a `loanId`.
7. User profiles can only be managed by the owner.

## The "Dirty Dozen" Payloads (Attack Vectors)

1. **Identity Spoofing**: Attempting to create a loan with a different user's `uid`.
2. **Resource Poisoning**: Injection of a 1MB string into `clientName` or `loanId`.
3. **Ghost Field Injection**: Adding an `isAdmin: true` field to a user profile or loan document.
4. **Relationship Orphanage**: Creating a `system_action` for a non-existent `loanId`.
5. **State Skipping**: Manually setting a loan to "Pago" without properly updating `capitalPago`.
6. **Immutable Field Tampering**: Attempting to change the `uid` of a loan or user after creation.
7. **Negative Capital**: Creating a loan with a negative `capital` amount.
8. **PII Leak**: An authenticated user attempting to read another user's profile.
9. **Bypassing Math**: Setting `totalBruto` to a value that doesn't match `capital * (1 + interestRate)`.
10. **Shadow List Query**: Authenticated user trying to global-list all loans without a `where('uid', '==', uid)` filter.
11. **Action Spoofing**: Creating a "payment_received" action for another user's loan.
12. **Future Poisoning**: Setting `createdAt` to a future date instead of `request.time`.

## Test Runner (Verification)

A separate `firestore.rules.test.ts` would normally verify these, but here I will focus on implementing the rules that block these.

