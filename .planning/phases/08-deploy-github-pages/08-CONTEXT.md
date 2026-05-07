# Phase 8: Deploy to GitHub Pages — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning
**Source:** Direct (small, well-understood scope; no discuss-phase needed)

<domain>
## Phase Boundary

This phase ships v1.0 to a public URL. It is exclusively concerned with **build + publish + verify**:

- Configure a GitHub Actions workflow that builds the Vite app and publishes `dist/` to GitHub Pages on every push to `main`
- Verify that the deployed site loads correctly under the `/mysekai-planner/` base path (sprites, JSON data, fonts, code-split chunks all 200)
- Document the manual one-time setup steps (create remote, enable Pages) in README so the deployment is reproducible by a fork

**Out of scope:**
- Custom domain / DNS
- Preview deployments per PR (overkill for a personal-then-shared tool)
- Sprite re-generation in CI (that's `PIPE-01`, v2 territory)
- Performance budgets / Lighthouse gates (none defined yet)
- i18n (Phase 6, separate)

</domain>

<decisions>
## Implementation Decisions

### Hosting target
- **GitHub Pages** under the repo's default Pages site (`https://<owner>.github.io/mysekai-planner/`).
- Vite is already configured: `base: '/mysekai-planner/'` in `vite.config.ts`. Don't touch the base path; the workflow must build with this exact base so all asset URLs resolve.
- Pages source: **GitHub Actions** (the modern path), not the legacy `gh-pages` branch. This means the workflow uploads an artifact via `actions/upload-pages-artifact` and `actions/deploy-pages` publishes it.

### Workflow trigger and runner
- Trigger: `push` to `main` AND `workflow_dispatch` (manual button for re-deploys without commits).
- Runner: `ubuntu-latest`.
- Concurrency group: cancel-in-progress on `pages` so a newer push supersedes an older in-flight build (avoids a stale push winning the race).

### Build steps (locked)
1. `actions/checkout@v4`
2. Set up `pnpm` (use `pnpm/action-setup`, version pinned to match `package.json` `packageManager` if present, else 9).
3. Set up Node 20 with `cache: 'pnpm'`.
4. `pnpm install --frozen-lockfile`.
5. `pnpm build` (the existing `vite build` script).
6. `actions/upload-pages-artifact@v3` with `path: dist`.
7. Deploy job uses `actions/deploy-pages@v4`.

### Build-failure behavior (DEPLOY-03)
- The deploy job MUST depend on the build job (`needs: build`). If the build step fails, deploy never runs. GitHub Pages keeps serving the previous successful artifact.
- TypeScript errors (`tsc --noEmit`) and tests (`pnpm test --run`) MUST run before `pnpm build` and fail the job on non-zero exit. Reason: `vite build` does not type-check by default; without an explicit `tsc` step a broken type contract would still publish.

### Permissions
- The workflow needs `pages: write` and `id-token: write` on the deploy job (required by `actions/deploy-pages@v4`).
- Top-level `permissions: { contents: read }` so the build job has minimum surface area.

### Repository setup (manual, documented but NOT performed by the workflow)
1. User creates an empty GitHub repo named `mysekai-planner` under their account.
2. `git remote add origin git@github.com:<owner>/mysekai-planner.git && git push -u origin main`.
3. Repo Settings → Pages → Source: **GitHub Actions**.
4. (Optional) Settings → Actions → General → Workflow permissions: leave at default; the workflow declares its own `permissions` block.

These steps require the user's GitHub auth and browser access — Claude cannot do them. They live in README under a "## Deployment" section.

### Public URL placeholder
- README and any docs referencing the URL use the form `https://<owner>.github.io/mysekai-planner/` until the user fills in their actual GitHub username post-deploy. Don't hardcode a username.

### Claude's Discretion
- Exact action versions (`@v4` is current; pin to known-good versions for stability).
- Whether to split into `build` + `deploy` jobs (recommended — clean separation, allows artifact reuse).
- Whether to add a `pnpm test --run` step (recommended — test suite is fast at 199/24, well worth it for DEPLOY-03).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### GSD project state
- `.planning/PROJECT.md` — establishes GitHub Pages as the hosting constraint
- `.planning/REQUIREMENTS.md` — DEPLOY-01/02/03 acceptance criteria
- `.planning/ROADMAP.md` — Phase 8 entry with success criteria

### Build configuration
- `vite.config.ts` — `base: '/mysekai-planner/'` is the contract the workflow MUST honor; do NOT change it
- `package.json` — `scripts.build` (`vite build`) is what the workflow invokes; check if `packageManager` field pins pnpm version
- `tsconfig.json` — type-check entry point for the pre-build gate

### GitHub Actions references (external)
- https://github.com/actions/deploy-pages — official Pages deploy action
- https://github.com/actions/upload-pages-artifact — artifact upload contract
- https://pnpm.io/continuous-integration#github-actions — pnpm caching pattern with `pnpm/action-setup`

</canonical_refs>

<specifics>
## Specific Ideas

- **Concurrency group key:** `pages` (matches GitHub's recommended pattern in their Pages template). `cancel-in-progress: true`.
- **Pre-build verification gate:** run `pnpm tsc --noEmit && pnpm test --run` as one step before `pnpm build`. If either fails, the job fails, the deploy is skipped, and the previous deployment continues serving.
- **Two-job structure:**
  - `build` job (ubuntu-latest): checkout → pnpm setup → install → typecheck+test → build → upload artifact
  - `deploy` job (`needs: build`, `environment: github-pages`): single step `actions/deploy-pages@v4`
- **Manifest sanity check (optional but cheap):** after `pnpm build`, list `dist/sprites/manifest.json` to confirm it landed in the artifact. Catches the case where `public/` contents accidentally get gitignored.
- **README updates:**
  - Top-of-file badge: `![Deploy](https://github.com/<owner>/mysekai-planner/actions/workflows/deploy.yml/badge.svg)` (placeholder owner)
  - New `## Deployment` section listing: public URL placeholder, the 3 manual setup steps, the workflow file path, what triggers a deploy.

</specifics>

<deferred>
## Deferred Ideas

- **Custom domain** — out of scope; project uses default `github.io` URL.
- **Preview deploys per PR** — would need a separate workflow + a `gh-pages` branch or third-party (Cloudflare Pages, Vercel). Not worth the operational complexity for a personal tool.
- **Lighthouse / size budgets** — no SLO defined; revisit if v2 grows.
- **Sprite pipeline in CI (`PIPE-01`)** — v2. The pipeline is local-only by D-03 (Phase 5 decision); changing that is a separate decision.

</deferred>

---

*Phase: 08-deploy-github-pages*
*Context gathered: 2026-05-07*
