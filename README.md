# Saam’s Haya Wears Storefront

A polished, mobile-first editorial ecommerce storefront for Saam’s Haya Wears.

## Owner Studio on Vercel

The public store and protected Owner Studio share one deployment:

- Storefront: `/`
- Owner login: `/admin.html`
- Owner workspace: `/studio.html`

Production authentication uses an HTTP-only signed session. Configure `ADMIN_PASSWORD` and a long random `ADMIN_SESSION_SECRET` as encrypted Vercel environment variables. The four-digit local PIN is used only on `localhost`.

The live catalogue is stored in Vercel Blob. Connect a Blob store to the Vercel project so `BLOB_READ_WRITE_TOKEN` is provisioned automatically. The storefront reads `/api/catalog`, and authenticated owners publish through that endpoint. Never commit any secrets; `.env.example` lists variable names only.

## Run locally

No installation or build step is required.

From this folder run `python3 -m http.server 8080`, then visit `http://localhost:8080`.
(Opening `index.html` straight from disk works too, but the browser blocks reading
`data/catalog.json` over `file://`, so the site falls back to the built-in starter catalogue.)

## Files

| File | What it does |
| --- | --- |
| `index.html` / `styles.css` / `landing-v2.css` / `app.js` | The public storefront and Taste-led landing-page layer |
| `store.js` | Shared data layer used by every page |
| `data/catalog.json` | The published catalogue everyone sees |
| `assets/logo.svg` | Brand mark (header, footer, favicon, about medallion) |
| `assets/brand-original.png` | The earlier logo artwork, kept as a backup |
| `assets/campaign-olive-v2.jpg` | Web-optimized campaign artwork generated for the landing page |
| `terms.html` / `privacy.html` | Public Terms of Service and Privacy Policy |
| `delivery.html` / `returns.html` | Public delivery and returns/refunds policies |
| `legal.css` | Shared accessible styling for customer-policy pages |

## Owner Studio (local only)

The experimental browser-only Owner Studio remains local and is intentionally excluded from this public repository because a client-side PIN is not secure authentication. Open `admin.html` locally. Entering the locally configured PIN takes you to `studio.html`, a separate page, so the
studio opens as its own full screen rather than unfolding underneath the login. “Lock studio”
returns you to the login page, and going to `studio.html` without unlocking sends you back to it.

**The studio needs a web address, not a file.** Serve the folder (`python3 -m http.server 8123`)
and open `http://localhost:8123/admin.html`, or use your live site once it’s deployed. Opening
`admin.html` straight from Finder — or through a preview pane that snapshots the file — stops the
page’s scripts and storage from working, so the PIN box won’t let you in. If that happens the page
now tells you rather than sitting there silently.

- **Listings** — add, edit, duplicate, reorder, hide or delete pieces. Each listing carries a
  name, category, description, sizes, stock note, corner badge, price, was-price and photos.
  A live preview beside the form shows exactly how the card will look on the shop grid.
- **Photos** — choose or drag in JPG/PNG files. They’re resized to 1100px and compressed in
  the browser, so the catalogue file stays small. The first photo is the one shoppers see;
  use “Make main” to promote another.
- **Sale designs** — six starting treatments (classic strike, percentage off, corner ribbon,
  starburst, gold flag, glow pill), and every one of them is editable. *Customise* opens an
  editor for the badge shape (chip, pill, ribbon, starburst, flag, side tab), where it sits on
  the photo, its colours and gradient, text size, rounding, letter spacing, capitals, a gentle
  pulse, and the wording itself. Wording accepts `{label}`, `{off}`, `{price}`, `{was}` and
  `{save}` — so "SAVE {save}" prints "SAVE GH₵ 140" — and a `|` splits it over two lines.
  *Duplicate* builds a new named design from any existing one; built-ins can be reset to
  original, custom ones deleted. Saving a design updates every piece already using it.
- **Customer accounts** — under *Store settings*. Guest checkout is always available and needs
  nothing. On top of it you can offer saving details by email, and Google or Facebook sign-in
  once you paste in a Google client ID / Facebook app ID. Leave a field blank and that button
  stays hidden rather than appearing broken.
- **Store settings** — WhatsApp number and help message, announcement bar, hero headline and
  intro, footer phone and social links, shop categories, and the studio PIN.
- **Publish** — see below.

Anything on sale also appears in an “On sale now” section on the storefront, and in the
Shop menu.

## What a customer account is here — and isn't

Guest checkout is the default and always works. If a shopper saves their details (by email, or
by signing in with Google or Facebook), the profile is stored **in that shopper's own browser**
and used to fill in checkout next time. No password is asked for, because there is nowhere safe
to keep one on a static site.

That means it is a saved profile, not a verified account: it doesn't follow them to another
device, and it isn't proof of who they are. Google and Facebook sign-in here confirm identity to
the browser but nothing checks that server-side, so treat the name and email as convenience,
not verification. Real accounts — order history, sign-in across devices, verified email — need a
backend. If you add one for payments, that is the natural place to add accounts too.

## Publishing changes

Edits save instantly to the owner’s own browser, so the storefront on that device updates
immediately — that’s the preview.

To show the changes to everyone else:

1. In the studio, open **Publish** and click *Download catalog.json*.
2. Upload that file to your website’s `data/` folder, replacing the existing `catalog.json`.

Visitors see the update on their next page load. The studio also has **Download backup** and
**Restore from file** for moving the catalogue between computers or rolling back.

### One thing to know about the PIN

The studio PIN only hides the page in the browser; it is not real server security, and anyone
who can read the site’s files can find it. It keeps casual visitors out of the studio, which is
what it’s for. If you later want true accounts and server-side publishing (so you can update
the shop from your phone without downloading a file), that needs a small backend — a good next
step once the shop is running.

## Contact points

Every WhatsApp entry point — the floating help button, the mobile menu, the contact section,
the “ask about this piece” link and checkout — uses the number set in *Store settings*
(currently +233 55 789 6248). Checkout hands the finished order to WhatsApp; no payment is
taken on the site.

## Online payments

Checkout now presents MTN Mobile Money, local/international cards and bank transfer (where
available) through Paystack, followed by WhatsApp as an alternative. Live online payments
require a protected backend endpoint that initializes the Paystack transaction and returns
an `access_code`; enter that endpoint under *Store settings → Online payments*. Never put a
Paystack secret key in browser code. The backend must verify the transaction status and amount
before the owner fulfils an order.

## Production notes

Dependency-free static site — deploy to Netlify, Vercel, Cloudflare Pages, GitHub Pages or any
standard host. Keep `data/catalog.json` alongside `index.html`.
