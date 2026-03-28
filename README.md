Jimo East Chief Digital Services Portal

**Official GovTech platform for Jimo East Location, Republic of Kenya**  
Chief John Otieno Otieno · 20 Villages · NGAO Digital Services

Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 18 + Vite 5 (SPA, no router library) |
| Backend   | Node.js 18 + Express 4                     |
| Database  | MongoDB 6+ via Mongoose 8                  |
| Auth      | JWT (access 1h + refresh 7d) + SMS OTP     |
| PDF       | PDFKit — official letter generation         |
| SMS       | Africa's Talking API                        |
| Logging   | Winston + daily-rotate-file                 |
| Docs      | Swagger UI at `/api/docs`                   |

---

Quick Start

Prerequisites
- Node.js ≥ 18
- MongoDB running locally **or** a MongoDB Atlas connection string
- npm ≥ 9

1 — Install all dependencies
```bash
# From the monorepo root
npm run install:all
```

2 — Configure the backend
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set at minimum:
```env
MONGODB_URI=mongodb://localhost:27017/jimo_east_db
JWT_SECRET=<at-least-32-random-chars>
JWT_REFRESH_SECRET=<another-32-random-chars>
```

Everything else has safe defaults for development.

3 — Seed the database
```bash
npm run seed
```

This creates:
- **Admin**: `0700000001` / `ChiefAdmin@2025`
- **Citizen**: `0712345678` / `Test@1234`
- 5 announcements, 5 letter requests, 2 disputes, 2 security reports

4 — Run both servers simultaneously
```bash
npm run dev
```

| Service   | URL                                      |
|-----------|------------------------------------------|
| Frontend  | http://localhost:5173                    |
| Backend   | http://localhost:5000                    |
| API Docs  | http://localhost:5000/api/docs           |
| Health    | http://localhost:5000/health             |

> Vite proxies all `/api/*` requests to `:5000` — **no CORS issues in development**.

---

Project Structure

```
jimo-east-fullstack/
├── package.json              ← Root: concurrently scripts
│
├── backend/
│   ├── server.js             ← Express entry point
│   ├── .env.example          ← Environment variable template
│   ├── config/
│   │   ├── db.js             ← MongoDB connection (5-retry)
│   │   └── swagger.js        ← OpenAPI 3.0 spec
│   ├── controllers/          ← Business logic (7 controllers)
│   ├── routes/               ← Express routers (8 route files)
│   ├── models/               ← Mongoose schemas (7 models)
│   ├── middlewares/          ← auth, validate, upload, rate limit, errors
│   ├── services/             ← token, OTP, SMS, PDF generation
│   ├── utils/                ← logger, apiResponse, ref numbers, seeder
│   └── uploads/              ← evidence/, letters/, profiles/
│
└── frontend/
    ├── index.html
    ├── vite.config.js        ← Proxy: /api/* → localhost:5000
    ├── .env.example
    └── src/
        ├── main.jsx          ← React root, AuthProvider wrapper
        ├── App.jsx           ← SPA router / page dispatcher
        ├── styles.css        ← All CSS variables and classes
        ├── services/
        │   └── api.js        ← Central API client (all fetch calls)
        ├── contexts/
        │   └── AuthContext.jsx ← JWT storage, login/logout, user state
        ├── hooks/
        │   └── useApi.js     ← loading/error/data wrapper hook
        ├── utils/
        │   └── formatters.js ← Date, ID, category, shape normalisation
        ├── pages/            ← 11 pages (all wired to real API)
        └── components/       ← Topbar, SiteFooter
```

---

All NPM Scripts

Root (monorepo)
| Script             | What it does                                       |
|--------------------|----------------------------------------------------|
| `npm run install:all` | Install deps for root + backend + frontend       |
| `npm run dev`      | Start backend (:5000) + frontend (:5173) together  |
| `npm run build`    | Production build of the frontend                   |
| `npm run start`    | Production start (backend + frontend preview)       |
| `npm run lint`     | ESLint both backend and frontend                   |
| `npm run seed`     | Seed MongoDB with test data                        |
| `npm run seed:destroy` | Wipe all collections (dev only)               |
| `npm run test`     | Run backend Jest test suite                        |

Backend only (`cd backend`)
| Script             | What it does                                       |
|--------------------|----------------------------------------------------|
| `npm start`        | `node server.js`                                   |
| `npm run dev`      | `nodemon server.js` (watches source dirs)          |
| `npm test`         | Jest with coverage + forceExit                     |
| `npm run lint`     | ESLint all `.js` files                             |
| `npm run seed`     | `node utils/seed.js`                               |

Frontend only (`cd frontend`)
| Script          | What it does                          |
|-----------------|---------------------------------------|
| `npm run dev`   | Vite dev server on port 5173          |
| `npm run build` | Production build → `dist/`            |
| `npm run preview` | Preview the production build        |
| `npm run lint`  | ESLint all `.jsx` / `.js` files       |

---

API Reference (Summary)

Base URL in dev: **`http://localhost:5000`** (via Vite proxy, use `/api/...` from frontend)

Auth `/api/auth`
```
POST /register          Register citizen, send OTP
POST /verify-otp        Verify OTP → returns JWT tokens
POST /resend-otp        Resend OTP (rate limited)
POST /login             Login → returns access + refresh tokens
POST /refresh           Rotate tokens
POST /logout            Invalidate refresh token
GET  /me                Get current user profile
PATCH /change-password  Change password
POST /forgot-password   Request reset OTP
POST /reset-password    Reset with OTP
```

Letters `/api/letters`
```
POST   /                Submit letter request (citizen)
GET    /                Own letters (citizen) / all (admin)
GET    /:id             Get single letter
PATCH  /:id/review      Mark under review (admin)
PATCH  /:id/approve     Approve + generate PDF (admin)
PATCH  /:id/reject      Reject with reason (admin)
GET    /:id/download    Stream signed PDF
DELETE /:id             Withdraw (citizen) / delete (admin)
```

Disputes `/api/disputes`
```
POST   /                File dispute (optional auth, supports file upload)
GET    /                Own (citizen) / all (admin)
GET    /:id             Get dispute detail
PATCH  /:id/schedule    Schedule hearing (admin)
PATCH  /:id/resolve     Close with resolution (admin)
PATCH  /:id             Update status/notes (admin)
```

Security `/api/security`  ·  Illicit `/api/illicit`
```
POST   /   Submit report (anonymous, file upload supported)
GET    /   Admin only
PATCH  /:id Admin only
```

Announcements `/api/announcements`
```
GET    /        Public — list active announcements
POST   /        Admin — publish + optional SMS broadcast
GET    /:id     Public — single announcement
PATCH  /:id     Admin — edit
DELETE /:id     Admin — soft delete
```

Admin `/api/admin`
```
GET    /stats                Dashboard KPIs
GET    /villages             Per-village breakdown (all 20 villages)
GET    /citizens             Paginated citizen list
PATCH  /citizens/:id/role    Update user role
PATCH  /citizens/:id/deactivate  Deactivate account
GET    /reports/export       JSON export (letters | disputes | security)
```

Full interactive docs: **http://localhost:5000/api/docs**

---

Environment Variables

Backend `backend/.env`

```env
Server
PORT=5000
NODE_ENV=development

Database
MONGODB_URI=mongodb://localhost:27017/jimo_east_db

JWT (use strong random strings in production)
JWT_SECRET=change_me_32_chars_minimum
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=another_secret_32_chars
JWT_REFRESH_EXPIRES_IN=7d

Bcrypt
BCRYPT_SALT_ROUNDS=12

CORS (comma-separated — only needed in production)
ALLOWED_ORIGINS=http://localhost:5173,https://jimoeast.go.ke

# Africa's Talking SMS
AT_API_KEY=your_key_here
AT_USERNAME=sandbox
AT_SENDER_ID=JIMOEAST

File uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE_MB=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

PDF
PDF_STORAGE_PATH=./uploads/letters
CHIEF_NAME=Chief John Otieno Otieno
CHIEF_TITLE=Chief, Jimo East Location
LOCATION_NAME=Jimo East Location

Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10

Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

Frontend `frontend/.env`

```env
Leave empty in development (Vite proxy handles it)
Set to deployed backend URL in production:
VITE_API_BASE_URL=
VITE_APP_NAME=Jimo East Chief Digital Services Portal
```

---

Authentication Flow

```
Register:
  1. POST /api/auth/register  →  user created, OTP sent via SMS
  2. POST /api/auth/verify-otp  →  phone verified, JWT tokens returned
  3. Tokens stored: localStorage 'je_access_token' + 'je_refresh_token'
  4. User stored: localStorage 'je_user' (survives page refresh)

Login:
  POST /api/auth/login  →  tokens returned
  (if phone unverified → 403 + new OTP sent automatically)

Token refresh (automatic):
  api.js intercepts 401 responses
  → calls POST /api/auth/refresh with stored refresh token
  → retries original request with new access token
  → if refresh fails → clears storage, fires 'je:logout' event

Logout:
  POST /api/auth/logout  →  refresh token invalidated server-side
  → localStorage cleared  →  user state set to null
```

---

Role Permissions

| Route / Action             | citizen | assistant_chief | chief | admin |
|----------------------------|:-------:|:---------------:|:-----:|:-----:|
| Register / Login           | ✅      | ✅              | ✅    | ✅    |
| Submit letter request      | ✅      | ✅              | —     | —     |
| View own letters           | ✅      | ✅              | —     | —     |
| View ALL letters           | —       | ✅              | ✅    | ✅    |
| Approve / reject letter    | —       | —               | ✅    | ✅    |
| Download own PDF           | ✅      | ✅              | ✅    | ✅    |
| File dispute               | ✅      | ✅              | ✅    | ✅    |
| Schedule hearing           | —       | ✅              | ✅    | ✅    |
| Submit security report     | anon    | anon            | anon  | anon  |
| View security reports      | —       | ✅              | ✅    | ✅    |
| Submit illicit report      | anon    | anon            | anon  | anon  |
| View illicit reports       | —       | —               | ✅    | ✅    |
| Publish announcements      | —       | —               | ✅    | ✅    |
| Admin dashboard / KPIs     | —       | ✅              | ✅    | ✅    |
| Village analytics          | —       | ✅              | ✅    | ✅    |
| Manage users               | —       | —               | ✅    | ✅    |

---

Data Models

| Model          | Key Fields                                                    |
|----------------|---------------------------------------------------------------|
| User           | name, id_number (unique), phone (unique), village, role, verified |
| OTP            | phone, otp_hash (bcrypt), purpose, expires_at (TTL index)    |
| ServiceRequest | ref_number, letter_type, citizen_uid, village, purpose, status, letter_pdf_url |
| Dispute        | ref_number, type, parties, description, village, hearing_date, status |
| SecurityReport | ref_number, type, urgency, village, anonymous, alert_sent    |
| IllicitReport  | ref_number, type, village, confidential_notes (hidden), requires_social_services |
| Announcement   | title, body, category, target_villages, send_sms, sms_sent   |

---

Security Implementation

| Concern              | Implementation                                           |
|----------------------|----------------------------------------------------------|
| Passwords            | bcrypt, 12 rounds                                        |
| JWTs                 | 1h access + 7d refresh with issuer/audience validation   |
| OTP storage          | bcrypt-hashed, TTL auto-deleted after 10 min             |
| NoSQL injection      | express-mongo-sanitize strips `$` and `.` from inputs    |
| Security headers     | helmet (14 headers: CSP, HSTS, X-Frame-Options, etc.)   |
| Rate limiting        | auth: 10/15min · OTP: 3/5min · uploads: 20/hr            |
| CORS                 | Whitelist from env; Vite proxy eliminates it in dev      |
| File uploads         | MIME type whitelist, 5MB limit, crypto-random filenames  |
| Anonymous reports    | `reported_by: null` — structurally impossible to recover |
| Illicit notes        | `select: false` — never returned unless explicitly selected |
| Error responses      | Stack traces hidden in production                        |
| Input validation     | express-validator chains on every POST/PATCH endpoint    |

---

Production Deployment

Backend (Node.js server)
```bash
# Set production env vars
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-64-char-random>
AT_USERNAME=jimoeast  # your real Africa's Talking username
ALLOWED_ORIGINS=https://jimoeast.go.ke

# Start with PM2
npm install -g pm2
pm2 start backend/server.js --name jimo-api --instances max
pm2 save
```

Frontend (static files)
```bash
cd frontend
npm run build      # outputs to frontend/dist/
# Deploy dist/ to Netlify, Vercel, Firebase Hosting, or nginx
```

Nginx reverse proxy (production)
```nginx
Serve frontend static files
server {
    listen 443 ssl;
    server_name jimoeast.go.ke;

    root /var/www/jimo-frontend/dist;
    index index.html;

    SPA: all routes fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    Proxy API calls to Node.js backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    Serve uploaded files (evidence, letters)
    location /uploads {
        proxy_pass http://localhost:5000;
    }
}
```

---

Seeded Test Data

After `npm run seed`:

| Type               | Details                                               |
|--------------------|-------------------------------------------------------|
| Admin account      | Phone: `0700000001` / Password: `ChiefAdmin@2025`    |
| Asst. Chief        | Phone: `0700000002` / Password: `AsstChief@2025`     |
| Test citizen       | Phone: `0712345678` / Password: `Test@1234`          |
| +7 more citizens   | Various villages, all password `Test@1234`           |
| 5 announcements    | baraza, health, government, development, security    |
| 5 letter requests  | approved, under_review, rejected, submitted          |
| 2 disputes         | One scheduled, one under review                      |
| 2 security reports | high urgency, medium urgency                         |
| 1 illicit report   | Illicit Alcohol Brewing                              |

Wipe everything: `npm run seed:destroy` (blocked in `NODE_ENV=production`)

---

Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5000 | Backend not started. Run `npm run dev` from root. |
| `MongooseServerSelectionError` | MongoDB not running. Start with `mongod` or check Atlas URI. |
| OTP not received | `AT_API_KEY` not set — SMS is mocked, check terminal logs for the OTP code. |
| `401 Unauthorized` | Token expired. Clear `localStorage` and sign in again. |
| CORS error in production | Set `ALLOWED_ORIGINS` in backend `.env` to your frontend domain. |
| PDF download fails | Letter may not be approved yet, or `uploads/letters/` has wrong permissions. |
| Port already in use | Change `PORT` in `backend/.env` or kill the process on that port. |
| `Cannot find module` | Run `npm run install:all` from the root. |

---

Villages Served

Kowala · Kabuor Saye · Kabuor Achego · Kagure Lower · Kamula · Koloo · Kasaye West · Kasaye Central · Kabura · Kamwana A · Kamwana B · Kochuka · Kagaya · Kouko Oola · Kagure Upper · Kakelo · Kasaye Cherwa · Kanjira · Kogol · Kabuor Omuga

---

*Built for the Kenya GovTech Initiative · Republic of Kenya · NGAO Digital Services*  
*Data protected under the Kenya Data Protection Act, 2019*
