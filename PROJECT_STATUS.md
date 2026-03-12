# ZimLivestock — Project Status

> Last updated: 2026-03-12

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| Backend | Flask (Python) + Blueprints |
| Database | Supabase (PostgreSQL + Auth) |
| Payments | Paynow SDK (web + EcoCash/OneMoney) |
| State | Zustand + axios interceptors |
| Deploy | Docker + Render.yaml + GitHub Actions CI |

---

## What's Built & Working

### Backend (12 endpoints)

| Endpoint | Method | Auth | Status |
|----------|--------|:----:|--------|
| `/` | GET | - | Index |
| `/health` | GET | - | Health check |
| `/auth/register` | POST | - | Email/password + metadata |
| `/auth/login` | POST | - | Returns JWT |
| `/auth/me` | GET | Yes | Current user profile |
| `/livestock` | GET | - | List all (filterable by category) |
| `/livestock/<id>` | GET | - | Single listing + bids |
| `/livestock` | POST | Yes | Create listing (validated) |
| `/bids/livestock/<id>` | GET | - | All bids for item |
| `/bids` | POST | Yes | Place bid (must beat current highest) |
| `/payments/initiate` | POST | Yes | Web or mobile payment via Paynow |
| `/payments/webhook` | POST | - | Paynow callback (SHA512 verified) |
| `/payments/status/<ref>` | GET | Yes | Check payment (owner only) |
| `/payments/history` | GET | Yes | User's payment history |

### Frontend (8 screens)

| Screen | Status |
|--------|--------|
| AuthScreen (login/signup) | Done |
| HomeFeed (livestock listing) | Done (has mock data fallback) |
| BiddingScreen (detail + bid + pay) | Done |
| PostLivestock (create listing) | Done (placeholder images) |
| MyListings (user's items) | Done |
| PaymentStatus (polling) | Done |
| PaymentHistory | Done |
| Notifications | Stub only |

### Infrastructure

| Item | Status |
|------|--------|
| Backend Dockerfile (Python 3.11 + gunicorn) | Done |
| Frontend Dockerfile (Node 20 multi-stage) | Done |
| docker-compose.yml | Done |
| render.yaml (Render.com deploy) | Done |
| GitHub Actions CI (pytest + vitest + tsc + build) | Done |
| Supabase RLS policies | Done |

### Tests

| Suite | Count | Status |
|-------|:-----:|--------|
| Backend (pytest) | 38 | All passing |
| Frontend (vitest) | 18 | All passing |

---

## What Needs Fixing

### Critical

| Issue | File | Details |
|-------|------|---------|
| Image upload is placeholder | `PostLivestock.tsx` | Uses hardcoded Unsplash URLs. Need Supabase Storage upload |
| Mock data in production code | `HomeFeed.tsx:17-130` | 130 lines of fake livestock. Should only show API data |
| Seed script broken | `seed.py` | Imports from old FastAPI architecture, won't run |
| `python-dotenv` missing from requirements | `requirements.txt` | Used in `db.py` and `app.py` but not listed |

### High Priority

| Issue | File | Details |
|-------|------|---------|
| Console.error in 6+ components | Various | Should use structured error handling, not console.log |
| Hardcoded API URL fallback | `api.ts:4` | Falls back to `localhost:8000` — needs env var |
| Payment reference is guessable | `payments.py` | Format `ZL-{id}-{hex}` — add rate limiting |
| Notifications page is empty | `Notifications.tsx` | Stub component, no real functionality |

### Medium Priority

| Issue | Details |
|-------|---------|
| No real-time bid updates | Bids only refresh on page load. Need WebSocket or polling |
| No image gallery on listings | Single image per listing |
| No search functionality | Only category filter exists |
| No seller ratings/reviews | No trust system |
| Unused frontend deps | recharts, cmdk, react-day-picker installed but unused |

---

## Blocked — Needs External Action

| Task | Blocker | Action |
|------|---------|--------|
| Paynow production integration | No merchant account | Register at paynow.co.zw, get integration ID + key |
| Market-accurate auction features | No field research | Visit Koala auction yards for first-hand info |
| Production deployment | No domain / hosting configured | Set up Render.com or similar, configure DNS |

---

## Phase Tracker

```
Phase 1: Critical Backend Fixes     [████████████] Done
Phase 2: Paynow Production          [░░░░░░░░░░░░] Blocked (need merchant creds)
Phase 3: Koala Feature Research      [░░░░░░░░░░░░] Blocked (need site visit)
Phase 4: Docker & Deployment         [████████████] Done
Phase 5: Testing & CI/CD            [████████████] Done
Phase 6: Public Launch              [░░░░░░░░░░░░] After 2 + 3
```

---

## File Structure

```
zimlivestock1/
├── app.py                    # Flask app + CORS + blueprints
├── db.py                     # Supabase client
├── middleware.py              # @require_auth, @require_supabase
├── requirements.txt
├── Dockerfile / docker-compose.yml / render.yaml
├── routes/
│   ├── auth.py               # Register, login, me
│   ├── listings.py            # CRUD livestock
│   ├── bids.py                # Get/place bids
│   └── payments.py            # Paynow initiate, webhook, status, history
├── services/__init__.py       # Paynow SDK wrapper
├── supabase/rls_policies.sql  # Row-level security
├── tests/                     # 38 pytest tests
├── .github/workflows/ci.yml   # CI pipeline
└── frontend/
    ├── src/
    │   ├── App.tsx            # Router
    │   ├── components/        # 8 screens + 60+ UI primitives
    │   ├── services/api.ts    # Axios API client
    │   ├── stores/            # Zustand (auth + app)
    │   ├── hooks/             # useAuth, useLivestock
    │   └── test/              # 18 vitest tests
    ├── Dockerfile
    └── package.json
```
