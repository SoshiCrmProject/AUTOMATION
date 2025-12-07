# Copilot Instructions — AUTOMATION monorepo

Short, actionable guidance for AI coding agents working in this repository.

1. Big picture

- Monorepo with npm workspaces: `apps/api`, `apps/web`, `apps/worker`, `packages/shared`.
- `apps/web` is a Next.js (v14) frontend. `apps/api` is Node+TypeScript backend. `packages/shared` is built during root `postinstall`.

2. Key commands

- Install and build (root):
  - `npm install` (runs `postinstall` → builds `packages/shared`).
  - `npm run build --workspace @shopee-amazon/web` (used by Vercel to build the frontend).
  - Dev: `npm run dev:web`, `npm run dev:api`, `npm run dev:worker`.

3. Project-specific gotchas

- ESLint: root `.eslintrc.js` references `plugin:@next/next/recommended`. Ensure `@next/eslint-plugin-next` is available in the workspace where Next runs (we added it to `apps/web/devDependencies`).
- Duplicate files: pages have occasionally been concatenated producing duplicate imports/identifiers (example: `apps/web/pages/manual-orders.tsx`). Search for repeated `import` blocks or multiple `export default` definitions.
- Toast API: `apps/web/components/Toast.tsx` exposes `pushToast(message, type?: 'error'|'success')`. Using other types (e.g., `'warning'`) produces TypeScript errors.
- Hook ordering: declare SWR hooks before any `useEffect` that references their results (see `apps/web/pages/settings.tsx` — `notificationChannels` must be declared before related effects).

4. Patterns & integration points

- Shared package: `@shopee-amazon/shared` is referenced as `file:../../packages/shared` — it's built by `tsc` in `postinstall` at root.
- i18n: `next-i18next` used across pages. Many pages call `serverSideTranslations(locale, ['common'])` in `getStaticProps`.
- Data fetching: use `swr` and `swr/infinite` patterns (see `manual-orders.tsx`). Follow the existing `getKey` cursor pattern for pagination.
- API client: `apps/web/lib/apiClient.ts` wraps axios; prefer using it for HTTP calls from the frontend.

5. CI / Vercel notes

- Vercel builds the workspace and runs `npm run build`. Pushes to `main` trigger automatic builds if the Vercel project is connected to this repo/branch.
- If Vercel build fails due to missing devDependencies (ESLint plugins), add the plugin to the workspace `devDependencies` or adjust ESLint config to avoid plugin references during CI.

6. Troubleshooting steps (quick)

- Reproduce locally:
  - `npm install`
  - `npm run build --workspace @shopee-amazon/web`
- Fixes we applied during triage:
  - Added `@next/eslint-plugin-next` to `apps/web/package.json`.
  - Removed concatenated duplicate code from `apps/web/pages/manual-orders.tsx`.
  - Fixed malformed JSX and hook-ordering in `apps/web/pages/settings.tsx`.
  - Replaced unsupported `pushToast(..., 'warning')` with `'error'` in `apps/web/pages/mappings.tsx`.

If you want broader guidance (PR checklist, QA steps, or additional rules), tell me which area to expand and I'll iterate.

# Copilot Instructions — AUTOMATION monorepo

Short (actionable) guidance for AI coding agents working in this repository.

1. Big picture

- This is a monorepo with npm workspaces: `apps/api`, `apps/web`, `apps/worker`, and `packages/shared`.
- `apps/web` is a Next.js frontend (Next.js 14). `apps/api` is the backend (Node + TypeScript). `apps/worker` runs background tasks.
- `packages/shared` contains TypeScript code compiled during `postinstall` (see root `package.json` -> `postinstall`). Treat it as a built-dependency used by all apps.

2. Important workflows & commands

- Install and build (root workspace):
  - `npm install` (root) — runs `postinstall` which builds `packages/shared`.
  - `npm run build --workspace @shopee-amazon/web` — builds the Next.js site (what Vercel runs).
  - Dev: `npm run dev:web` (Next.js), `npm run dev:api`, `npm run dev:worker`.
- Tests: `npm test`, `npm run test:integration` (has separate docker-compose test flow defined in `package.json`).
- Docker / integration: `docker-compose -f docker-compose.test.yml up -d --build` is used by integration scripts.

3. Build gotchas we fixed (examples you can use)

- ESLint plugin: root `.eslintrc.js` references `plugin:@next/next/recommended`. The Vercel build failed because `@next/eslint-plugin-next` was not available in the workspace being built. Fix: ensure `@next/eslint-plugin-next` is present where Next.js runs (we added it to `apps/web/package.json` devDependencies).
- Duplicated/concatenated pages: occasional accidental file concatenation produced duplicate imports, duplicate components and caused TypeScript "Duplicate identifier" errors (example: `apps/web/pages/manual-orders.tsx`). If you see duplicate identifier errors, search the file for repeated `import` blocks or repeated `export default` functions and remove the duplicated section.
- Toast API: `components/Toast.tsx` exposes `pushToast(message, type?: 'error'|'success')`. Calls using other types (e.g., `'warning'`) will cause TS errors — replace with `'error'` or `'success'`.
- Hook ordering / variable usage: TypeScript reports "used before its declaration" when a hook result is referenced before it's declared. Example: `notificationChannels` must be declared before any `useEffect` that references it (see `apps/web/pages/settings.tsx`). Keep hooks and derived effects in logical order.

4. Project-specific patterns & conventions

- Shared package: `@shopee-amazon/shared` is referenced via `file:../../packages/shared` in `apps/web/package.json`. It is built by `tsc` during `postinstall` at repo root — ensure `npm install` at root is run before building individual workspaces.
- i18n: `next-i18next` is used. Pages commonly call `serverSideTranslations(locale, ['common'])` in `getStaticProps`.
- API client: frontend HTTP calls use `apps/web/lib/apiClient.ts` (wraps axios). Use that for server communication in the web app.
- Data fetching: many pages use `swr` and `swr/infinite` (e.g., `manual-orders.tsx`) — follow existing `getKey`/cursor patterns when adding pagination.
- UI components: `apps/web/components/ui` exports primitive UI building blocks (`Button`, `Input`, `Select`, `Card`, etc.). Reuse them for consistent styling.

5. Integration & CI notes

- Vercel builds run `vercel build` and `npm run build` inside the selected workspace. Ensure any ESLint plugins referenced from root `.eslintrc.js` are available in that workspace or adjust the ESLint config to avoid referencing unavailable plugins during CI builds.
- Do not commit or upload the `.next` directory. Vercel warns about it.

6. Where to look for behavior & examples

- Page examples: `apps/web/pages/manual-orders.tsx`, `apps/web/pages/settings.tsx`, and `apps/web/pages/mappings.tsx` show patterns for SWR, modals, and toast usage.
- Hook patterns: `apps/web/pages/settings.tsx` shows common ordering pitfalls and how notification channels are fetched.
- Shared APIs & types: `packages/shared` — compile errors here will block workspace builds because `postinstall` builds this package.

7. Quick troubleshooting steps when build fails on Vercel

- Reproduce locally:
  - `npm install` (root)
  - `npm run build --workspace @shopee-amazon/web`
- Common fixes:
  - Add missing ESLint plugin to the workspace `package.json` (we added `@next/eslint-plugin-next` to `apps/web/devDependencies`).
  - Search for duplicated code inside pages (duplicate imports / multiple `export default` definitions).
  - Ensure all `pushToast` calls use only `"error"` or `"success"`.

If anything in this file is unclear or you'd like more detail (examples for new contributors, or a checklist for PR reviews), tell me which area to expand and I'll iterate.
