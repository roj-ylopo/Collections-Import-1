# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **Webflow Hybrid App** with OAuth2 + JWT authentication and CMS data import functionality. Both frontend and backend are written in TypeScript.
- **Data Client** (`Data Client/`) — Node.js/Express backend (TypeScript, ESM, `tsx` for dev)
- **Designer Extension** (`Designer Extension/`) — React 18 + MUI frontend (TypeScript, webpack 5)

## Commands

### Install all dependencies
```bash
npm run install
```

### Run both services in development
```bash
npm run dev
```
Starts backend (`nodemon` + `tsx` on port 3000) and frontend (webpack watch + Webflow extension server on port 1337) concurrently.

### Build frontend for distribution
```bash
cd "Designer Extension" && npm run build
```
Produces a `bundle.zip` for Webflow marketplace submission.

### Run backend only
```bash
cd "Data Client" && npm run dev
```

### Run frontend only
```bash
cd "Designer Extension" && npm run dev
```

## Architecture

### Authentication Flow

1. User visits `/authorize` → redirected to Webflow OAuth
2. OAuth callback (`/callback`) stores `siteId → accessToken` in SQLite
3. Designer Extension calls `webflow.getIdToken()` and POSTs to `/token` with `idToken + siteId`
4. Backend calls Webflow's `/beta/token/resolve` to validate the ID token, then creates a signed session JWT
5. Session JWT returned to frontend, cached in `localStorage`, used as Bearer token on subsequent requests

### CMS Import Feature

After authentication, the user selects a site. The `ImportDashboard` shows 3 panels — **Team**, **Testimonials**, **Communities** — each driven by `ImportPanel`:

1. **Fetch Preview** — backend proxies to `hillnhills.com/{type}?format=json` and returns `items`
2. **Configure Mapping** — `CollectionMapper` shows whether the collection exists or will be created; `FieldMapper` shows auto-suggested source→target field mappings the user can edit
3. **Import** — `POST /import` on the backend:
   - If collection doesn't exist → creates it via `webflow.collections.create()`
   - If it exists and duplicates are detected → returns `{ hasDuplicates, duplicateCount }` so frontend shows `DuplicatePrompt`
   - After strategy confirmed, inserts/updates items via `webflow.collections.items.createItemLive()`

### API Proxy Pattern

The Designer Extension never calls Webflow directly. All requests go through `http://localhost:3000`. JWT middleware (`jwt.retrieveAccessToken` / `jwt.authenticateSessionToken`) looks up the OAuth access token from SQLite and attaches it to `req.accessToken`.

### Key Files

**Backend (`Data Client/`)**
- [`Data Client/server.ts`](Data%20Client/server.ts) — Express routes + imports `importRouter`; OAuth scopes include `cms:read`, `cms:write`
- [`Data Client/jwt.ts`](Data%20Client/jwt.ts) — Middleware for token creation/validation (async, Promise-based)
- [`Data Client/database.ts`](Data%20Client/database.ts) — SQLite helpers; `getAccessTokenFromSiteId/UserId` return `Promise<string>`
- [`Data Client/routes/importRoutes.ts`](Data%20Client/routes/importRoutes.ts) — `GET /import/sources/:type`, `GET /import/sites/:siteId/collections`, `POST /import`
- [`Data Client/utils/ngrokManager.ts`](Data%20Client/utils/ngrokManager.ts) — Starts ngrok tunnel on startup

**Frontend (`Designer Extension/src/`)**
- [`main.tsx`](Designer%20Extension/src/main.tsx) — App entry; manages `AppStep` state (`auth → siteSelect → import`)
- [`components/ImportDashboard.tsx`](Designer%20Extension/src/components/ImportDashboard.tsx) — Loads collections, renders 3 `ImportPanel`s
- [`components/ImportPanel.tsx`](Designer%20Extension/src/components/ImportPanel.tsx) — Per-type import state machine (`idle → previewing → mapping → importing → done`)
- [`components/FieldMapper.tsx`](Designer%20Extension/src/components/FieldMapper.tsx) — Editable source→target field mapping table
- [`components/CollectionMapper.tsx`](Designer%20Extension/src/components/CollectionMapper.tsx) — Shows collection exists/will-be-created status
- [`components/DuplicatePrompt.tsx`](Designer%20Extension/src/components/DuplicatePrompt.tsx) — Dialog for skip/overwrite/add choice
- [`api/importApi.ts`](Designer%20Extension/src/api/importApi.ts) — Axios wrappers: `fetchSourceItems`, `fetchCollections`, `runImport`
- [`types/index.ts`](Designer%20Extension/src/types/index.ts) — Shared frontend types

### Environment Setup

Copy `.env.example` to `.env` and fill in:
```
WEBFLOW_CLIENT_ID=
WEBFLOW_CLIENT_SECRET=
PORT=3000
NGROK_AUTH_TOKEN=
```

Webflow app must have:
- Designer Extension enabled
- Data Client enabled with the ngrok redirect URI (printed in terminal on startup)
- OAuth scopes: "Authorized user" (read) + "Sites" (read/write) + "CMS" (read/write)

### TypeScript Setup

- Backend: `tsconfig.json` uses `module: NodeNext`; dev runs via `nodemon --exec tsx server.ts`
- Frontend: `tsconfig.json` uses `module: ESNext`, `jsx: react`; `ts-loader` with `transpileOnly: true` in webpack
- Both use relaxed TypeScript (`strict: false`)
- Backend Express `Request` is augmented with `accessToken?: string` in [`Data Client/types/express.d.ts`](Data%20Client/types/express.d.ts)

### Frontend Build

Webpack config at [`Designer Extension/webpack.config.mjs`](Designer%20Extension/webpack.config.mjs) bundles `src/main.tsx` → `public/bundle.js`. Entry point is `.tsx`, resolves `.tsx`, `.ts`, `.js`.

## Applied Learning
When  something fails repeatedly, when Roj has to re-explain or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep each bullet under 15 words. No explanations. Only add things that will save time in the future.