# Backend Modular Monolith Migration Plan

## Current state (legacy layout)

```
server/
├── server.js              # Express bootstrap + MongoDB + routes
├── config/passport.js
├── controllers/authController.js
├── routes/auth.js | user.js | tasks.js
├── models/User.js | Task.js | Document.js | ActivityLog.js
├── utils/authMiddleware.js | sendEmail.js | userLinks.js | seniorCaregiverLink.js
├── uploads/               # created at runtime (multer ./uploads)
└── fix-indexes.js         # standalone script (unchanged)
```

**API surface (unchanged):**

| Mount | Module |
|-------|--------|
| `GET /` | Health |
| `/api/auth/*` | Auth + OAuth |
| `/api/user/*` | Profile, privacy, contacts, activities, documents, account |
| `/api/tasks/*` | Task requests |

## Target layout

```
server/src/
├── server.js              # dotenv, listen, DB connect
├── app.js                 # Express app, middleware, route mounting
├── config/
│   ├── passport.js
│   └── database.js
├── middleware/
│   └── auth.js
├── shared/
│   ├── models/            # Mongoose schemas (cross-cutting)
│   └── utils/             # Email, user links, caregiver codes
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   └── auth.routes.js
│   ├── user/
│   │   └── user.routes.js
│   └── tasks/
│       └── tasks.routes.js
└── uploads/
```

Legacy folders under `server/` remain until manually removed.

## Principles

- CommonJS only (`package.json` already has `"type": "commonjs"`).
- Move files; update `require()` paths only—no business-logic rewrites.
- JWT, Passport, session, CORS, global error handler preserved in `app.js`.
- OAuth callback URLs stay `http://localhost:5000/api/auth/...`.
- Uploads served at `/uploads`; disk path `src/uploads` (absolute paths in multer/utils).

## Phases

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | `src/app.js`, `src/server.js`, `config/database.js`, `uploads/.gitkeep` | Pending |
| 1 | `shared/models/*`, `shared/utils/*`, `middleware/auth.js`, `config/passport.js` | Pending |
| 2 | `modules/auth/*` → `/api/auth` | Pending |
| 3 | `modules/tasks/*` → `/api/tasks` | Pending |
| 4 | `modules/user/*` → `/api/user` | Pending |
| 5 | `package.json` scripts → `src/server.js`; legacy `server.js` shim | Pending |

## Import path map

| Legacy | New (from module file) |
|--------|-------------------------|
| `../models/User` | `../../shared/models/User` |
| `../utils/authMiddleware` | `../../middleware/auth` |
| `../controllers/authController` | `./auth.controller` (auth module) |
| `../utils/sendEmail` | `../../shared/utils/sendEmail` |
| `../utils/userLinks` | `../../shared/utils/userLinks` |
| `../utils/seniorCaregiverLink` | `../../shared/utils/seniorCaregiverLink` |
| `./config/passport` | `./config/passport` (from `app.js`) |

## Verification checklist

- [ ] `npm run dev` from `server/` starts without import errors
- [ ] `GET /` returns health JSON
- [ ] `GET /api/auth/test` lists routes
- [ ] Register → verify OTP → login (JWT)
- [ ] Google/Facebook OAuth redirects (if env vars set)
- [ ] Protected `/api/user/profile` with `Authorization: Bearer`
- [ ] Document upload/delete resolves files under `src/uploads`
- [ ] `POST /api/tasks/request` as elder

## Rollback

Run `npm run start:legacy` (forwards to old `server/server.js` body) or restore `package.json` `main` to `server.js`.
