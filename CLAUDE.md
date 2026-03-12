# ZimLivestock — Project Context

## What This Is
A mobile-first livestock auction marketplace for Zimbabwe. Farmers list animals, buyers browse & bid, winners pay via Paynow (EcoCash, OneMoney, or web). Think "online cattle auction" built for Zimbabwean mobile users.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix primitives)
- **Backend**: Flask (Python) with Blueprints
- **Database**: Supabase (PostgreSQL + built-in Auth + Row Level Security)
- **Payments**: Paynow SDK (web checkout + EcoCash/OneMoney USSD)
- **State**: Zustand (auth store with localStorage persistence) + axios interceptors for JWT
- **Deploy**: Docker + Render.yaml + GitHub Actions CI

## Architecture

### Backend (Flask)
```
app.py              → Flask app factory, CORS, blueprint registration
db.py               → Centralized Supabase client (import `supabase` from here)
middleware.py        → @require_auth (JWT validation), @require_supabase decorators
routes/
  auth.py           → POST /auth/register, POST /auth/login, GET /auth/me
  listings.py       → GET /livestock, GET /livestock/<id>, POST /livestock
  bids.py           → GET /bids/livestock/<id>, POST /bids
  payments.py       → POST /payments/initiate, POST /payments/webhook,
                      GET /payments/status/<ref>, GET /payments/history
services/__init__.py → Paynow SDK wrapper (initiate_web_payment, initiate_mobile_payment,
                       check_payment_status, verify_paynow_webhook)
```

### Frontend (React)
```
src/
  App.tsx            → Tab-based routing via state (no react-router)
  types.ts           → LivestockItem, User interfaces
  components/
    AuthScreen.tsx    → Login/signup tabs
    HomeFeed.tsx      → Livestock listing feed + category filter
    BiddingScreen.tsx → Item detail + bid form + payment initiation
    PostLivestock.tsx → Create listing form
    MyListings.tsx    → User's selling/won items
    PaymentStatus.tsx → Payment polling after Paynow redirect
    PaymentHistory.tsx→ Transaction history list
    Notifications.tsx → Notification list (stub — not fully implemented)
    BottomNavigation.tsx → 5-tab mobile nav
    PaynowButton.tsx  → Styled Paynow payment button
    ui/               → 60+ shadcn/ui components (Button, Card, Input, etc.)
  services/api.ts     → Axios client with Bearer token interceptor
  stores/
    authStore.ts      → Zustand: user, token, login(), logout(), checkAuth()
    appStore.ts       → Zustand: theme management
  hooks/
    useAuth.ts        → Auth hook (stub)
    useLivestock.ts   → Livestock data hook
```

### Database (Supabase)
Tables: `livestock_items`, `bids`, `payments`, `profiles`
RLS policies defined in `supabase/rls_policies.sql`

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|:----:|---------|
| `/auth/register` | POST | No | Register with email/password + firstName, lastName, phone |
| `/auth/login` | POST | No | Login, returns JWT |
| `/auth/me` | GET | Yes | Current user profile |
| `/livestock` | GET | No | List all, optional `?category=` filter |
| `/livestock/<id>` | GET | No | Single listing with bids |
| `/livestock` | POST | Yes | Create listing (validated: title, category, price) |
| `/bids/livestock/<id>` | GET | No | Bids for item, sorted by amount DESC |
| `/bids` | POST | Yes | Place bid (must beat current highest) |
| `/payments/initiate` | POST | Yes | Start web or mobile payment |
| `/payments/webhook` | POST | No | Paynow callback (SHA512 verified) |
| `/payments/status/<ref>` | GET | Yes | Check payment status (owner only) |
| `/payments/history` | GET | Yes | User's payment list |

## Payment Flow
1. User wins auction → taps "Pay Now"
2. Chooses method: EcoCash, OneMoney, or Web
3. **Web**: Redirected to Paynow checkout → redirected back with reference → PaymentStatus polls
4. **Mobile**: Backend sends USSD prompt to phone → frontend polls `/payments/status/<ref>` every 5s for up to 5 min
5. Paynow POSTs to `/payments/webhook` with status update → backend updates DB

## Validation Rules
- Listing categories: cattle, goats, sheep, pigs, chickens, other
- Title: max 200 chars
- Description: max 2000 chars
- Starting price: must be positive number
- Bid: must be higher than current highest bid
- Zimbabwe locations: Harare, Bulawayo, Mutare, Masvingo, Gweru, Chinhoyi, Kadoma, Kwekwe

## Environment Variables
See `.env.example` — requires:
- `SUPABASE_URL` + `SUPABASE_KEY`
- `PAYNOW_INTEGRATION_ID` + `PAYNOW_INTEGRATION_KEY`
- `PAYNOW_RESULT_URL` (webhook) + `PAYNOW_RETURN_URL` (browser redirect)
- `SECRET_KEY`, `DEBUG`, `ALLOWED_ORIGINS`
- Frontend: `VITE_API_URL` (defaults to `http://localhost:8000`)

## Testing
- **Backend**: `python3 -m pytest tests/ -v` — 38 tests (auth, listings, bids, payments, health)
- **Frontend**: `cd frontend && npm test` — 18 tests (API service layer, auth store)
- **CI**: `.github/workflows/ci.yml` runs both suites + tsc + build on push

## Known Issues & Gaps
1. **No Checkout Screen** — payment method selection is a dialog inside BiddingScreen, needs a proper standalone checkout with order summary + cost breakdown
2. **Image upload is placeholder** — PostLivestock uses hardcoded Unsplash URLs, needs Supabase Storage
3. **HomeFeed has 130 lines of mock data** as fallback when API fails
4. **Notifications screen is a stub** — hardcoded data, no real backend
5. **No real-time bid updates** — bids only refresh on page load
6. **No search** — only category filter exists
7. **No seller ratings/reviews**
8. **seed.py is broken** — references old FastAPI architecture
9. **`python-dotenv` missing from requirements.txt** but used in code
10. **Console.error scattered** in 6+ components instead of structured error handling

## Design Reference
See `DESIGN_BRIEF.md` for complete wireframes, screen specs, user journey maps, and Zimbabwe-specific design context for the designer.

## Running Locally
```bash
# Backend
pip install -r requirements.txt
cp .env.example .env  # fill in Supabase + Paynow credentials
python3 app.py        # runs on :8000

# Frontend
cd frontend
npm install
npm run dev           # runs on :3000
```

## Key Decisions
- No react-router — navigation is state-based via `activeTab` + `selectedItem` in App.tsx
- Auth uses Supabase Auth (JWT) — backend validates via `supabase.auth.get_user(token)`
- Paynow SDK is used server-side only — frontend never touches payment credentials
- 5% platform fee on sales (shown in PostLivestock terms)
- Auctions have fixed durations (1, 3, 7, or 14 days)
