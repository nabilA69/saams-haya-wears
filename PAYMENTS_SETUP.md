# Safe online-payment setup

The storefront is ready to offer:

- MTN Mobile Money
- Local and international Visa/Mastercard cards
- Bank transfer where Paystack makes it available
- WhatsApp checkout as a fallback

## What the owner needs

1. Create and verify a Ghana Paystack business account.
2. In the Paystack dashboard, enable Mobile Money, Cards and Pay with Transfer under payment preferences.
3. Deploy a protected server or serverless function with the Paystack **secret key stored only as an environment variable**.
4. The endpoint must accept the checkout order, recalculate its total using trusted catalogue data, call Paystack’s transaction-initialize API, and return only the `access_code` to this storefront.
5. Add that public endpoint URL in **Owner Studio → Store settings → Online payments**.
6. Add a Paystack webhook. Verify its `x-paystack-signature`, then verify the transaction status, currency and amount before fulfilling an order.
7. Test with Paystack test credentials before switching the server environment variable to the live secret key.

Never add the Paystack secret key to `index.html`, `app.js`, `store.js`, the catalogue, or Owner Studio. A public key is safe in a browser, but this implementation uses Paystack’s recommended server-initialized flow and therefore resumes checkout with a short-lived `access_code`.

## Endpoint contract expected by the storefront

The configured endpoint receives JSON with `email`, `amount`, `currency`, `channel`, customer and delivery details, and cart items. The selected channel is one of:

- `mobile_money`
- `card`
- `bank_transfer`

After safely initializing the transaction, return:

```json
{ "access_code": "Paystack access code returned by transaction initialization" }
```

The server—not the browser—must decide the final amount and permitted channel.
