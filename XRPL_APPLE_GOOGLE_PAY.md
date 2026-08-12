# CardVault Payment Rails

CardVault now supports two payment rails for development:

| Rail | Purpose | Settlement | Sensitive card data handled by CardVault? |
| --- | --- | --- | --- |
| Apple Pay / Google Pay | Fiat credit-pack checkout | Stripe PaymentIntent | No |
| XRP Ledger Testnet | Direct XRP credit-pack checkout | XRPL validated ledger | No |

## Apple Pay and Google Pay

The app uses Stripe's Express Checkout surface for Apple Pay and Google Pay. The browser receives only a Stripe client secret, while Stripe tokenizes and processes the payment. The server fulfills credits only from a verified `payment_intent.succeeded` webhook. Apple Pay requires an Apple merchant ID, merchant identity certificate, and verified domain; Google Pay requires a supported gateway and merchant configuration. See the official [Apple Pay on the Web configuration guide](https://developer.apple.com/documentation/applepayontheweb/configuring_your_environment) and [Google Pay Web tutorial](https://developers.google.com/pay/api/web/guides/tutorial).

For local development, wallet buttons may not appear because Apple Pay and Google Pay require HTTPS, browser/device support, a registered domain, and processor configuration. The existing hosted Stripe Checkout fallback remains available.

## XRPL Testnet

The default development endpoint is:

```env
XRPL_NETWORK_WS=wss://s.altnet.rippletest.net:51233
XRPL_DESTINATION_ADDRESS=r...
```

`XRPL_DESTINATION_ADDRESS` must be a public receiving account. CardVault never requests or stores a seed, secret, or private key. Each invoice uses a unique destination tag and exact XRP amount. The server verifies the transaction hash against a validated ledger transaction, destination address, destination tag, exact direct XRP amount, successful result, and non-partial-payment flags before granting credits. Transaction hashes are recorded with a unique constraint so retries cannot grant credits twice.

Use the [XRPL Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html) to create and fund disposable development wallets. Testnet XRP has no mainnet value. The payment verification behavior follows the XRPL [Payment transaction reference](https://xrpl.org/docs/references/protocol/transactions/types/payment), including the warning that partial payments must not be treated as exact delivered amounts.

## Security hardening included

The server now applies security headers, disables the Express fingerprint, restricts CORS to configured origins, enforces HTTPS redirects in production, limits JSON and URL-encoded body sizes, rate-limits tRPC requests, preserves raw Stripe webhook bodies for signature verification, and uses secure cookie behavior with `SameSite=Lax` for local HTTP development and `SameSite=None; Secure` for HTTPS deployments.

Stripe webhook fulfillment now checks signatures, rejects missing webhook secrets, handles test verification events, and uses payment-intent, checkout-session, and invoice identifiers to avoid duplicate credit grants. XRPL fulfillment is transactional and idempotent.

## Testing checklist

1. Keep the XRPL destination account and endpoint on Testnet.
2. Use a separate disposable customer testnet account and fund it from the faucet.
3. Create an invoice in the Credits page, send the exact XRP amount with the displayed destination tag, paste the validated transaction hash, and verify the payment.
4. Confirm that a second verification attempt does not add credits again.
5. Configure Apple Pay and Google Pay only on a verified HTTPS domain, then test Stripe webhooks in Stripe Test mode.
6. Do not switch to mainnet, store wallet secrets, or accept customer funds until legal, accounting, custody, and operational controls have been reviewed.
