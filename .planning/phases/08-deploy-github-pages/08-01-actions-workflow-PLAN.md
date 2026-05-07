---
phase: 08-deploy-github-pages
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/deploy.yml
  - README.md
autonomous: false
requirements:
  - DEPLOY-01
  - DEPLOY-02
  - DEPLOY-03
user_setup:
  - service: github
    why: "GitHub Pages hosting requires repo creation and Pages enablement (no CLI/API replacement for the org-side enable-Pages click in Settings)"
    dashboard_config:
      - task: "Create empty repo named 'mysekai-planner' under user's GitHub account"
        location: "https://github.com/new"
      - task: "Add remote and push: git remote add origin git@github.com:<owner>/mysekai-planner.git && git push -u origin main"
        location: "Local terminal"
      - task: "Enable Pages from Actions: Settings -> Pages -> Source: 'GitHub Actions'"
        location: "Repo Settings -> Pages"

must_haves:
  truths:
    - "Pushing to main triggers .github/workflows/deploy.yml on GitHub Actions"
    - "Workflow runs typecheck (tsc -b inside pnpm build) and tests (pnpm test --run) before publishing; non-zero exit blocks deploy"
    - "Successful run publishes dist/ artifact via actions/deploy-pages@v4 to https://<owner>.github.io/mysekai-planner/"
    - "Failed build keeps the previous successful artifact serving (deploy job needs: build)"
    - "README documents the public URL placeholder, the 3 manual setup steps, and what triggers a redeploy"
  artifacts:
    - path: ".github/workflows/deploy.yml"
      provides: "Two-job workflow (build + deploy) with concurrency guard"
      contains: "actions/deploy-pages@v4"
    - path: "README.md"
      provides: "Project overview + Deployment section"
      contains: "## Deployment"
  key_links:
    - from: ".github/workflows/deploy.yml"
      to: "package.json scripts.build (tsc -b && vite build)"
      via: "pnpm build step"
      pattern: "pnpm build"
    - from: ".github/workflows/deploy.yml"
      to: "vite.config.ts base: '/mysekai-planner/'"
      via: "vite build emits asset URLs prefixed with the base; workflow does NOT override base"
      pattern: "actions/upload-pages-artifact@v3"
    - from: "deploy job"
      to: "build job artifact"
      via: "needs: build + actions/deploy-pages@v4"
      pattern: "needs: build"
---

<objective>
Ship v1.0 to GitHub Pages with automated re-deploy on every push to main. Add the GitHub Actions workflow file and README "Deployment" section that together satisfy DEPLOY-01 (public URL), DEPLOY-02 (auto-redeploy), and DEPLOY-03 (failed builds never publish).

Purpose: Phase 8 is the final v1 step — make the working app public.
Output: `.github/workflows/deploy.yml` + `README.md` with Deployment section + post-push human verification of the live site.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-deploy-github-pages/08-CONTEXT.md
@vite.config.ts
@package.json

<interfaces>
<!-- Build contract the workflow MUST honor -->

From package.json:
```json
"scripts": {
  "build": "tsc -b && vite build",
  "test": "vitest run"
}
```
- `pnpm build` already runs `tsc -b` (typecheck) before `vite build`. No separate tsc step needed.
- `pnpm test` is `vitest run` — already non-watch. Workflow uses `pnpm test --run` (idempotent — vitest accepts the flag and ignores it under `run`).
- No `packageManager` field present → pin pnpm to v9 in workflow.

From vite.config.ts:
```ts
base: '/mysekai-planner/'
```
- Hardcoded base path. Workflow MUST NOT override `--base` or set `VITE_BASE`. The default `pnpm build` produces `dist/` with assets prefixed `/mysekai-planner/...`.

From .planning/phases/08-deploy-github-pages/08-CONTEXT.md (locked decisions):
- Trigger: `push` to `main` + `workflow_dispatch`
- Runner: `ubuntu-latest`
- Concurrency: group `pages`, `cancel-in-progress: true`
- Two jobs: `build` (uploads artifact) → `deploy` (`needs: build`, `environment: github-pages`)
- Permissions: top-level `contents: read`; deploy job adds `pages: write, id-token: write`
- Action versions: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`
- Pre-build gate: `pnpm test --run` BEFORE `pnpm build` (DEPLOY-03; tsc covered inside build script)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create GitHub Actions deploy workflow</name>
  <files>.github/workflows/deploy.yml</files>
  <read_first>
    - .planning/phases/08-deploy-github-pages/08-CONTEXT.md (locked decisions)
    - vite.config.ts (confirm base path — do NOT touch)
    - package.json (confirm scripts.build = "tsc -b && vite build", no packageManager pin)
  </read_first>
  <action>
    Create `.github/workflows/deploy.yml` with EXACTLY this content (parent directory `.github/workflows/` does not yet exist — create it):

    ```yaml
    name: Deploy to GitHub Pages

    on:
      push:
        branches: [main]
      workflow_dispatch:

    permissions:
      contents: read

    concurrency:
      group: pages
      cancel-in-progress: true

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Setup pnpm
            uses: pnpm/action-setup@v4
            with:
              version: 9

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: 20
              cache: pnpm

          - name: Install dependencies
            run: pnpm install --frozen-lockfile

          - name: Run tests
            run: pnpm test --run

          - name: Build
            run: pnpm build

          - name: Upload Pages artifact
            uses: actions/upload-pages-artifact@v3
            with:
              path: dist

      deploy:
        needs: build
        runs-on: ubuntu-latest
        environment:
          name: github-pages
          url: ${{ steps.deployment.outputs.page_url }}
        permissions:
          pages: write
          id-token: write
        steps:
          - name: Deploy to GitHub Pages
            id: deployment
            uses: actions/deploy-pages@v4
    ```

    Notes (per 08-CONTEXT.md locked decisions):
    - `pnpm build` runs `tsc -b && vite build` — DEPLOY-03 typecheck gate is satisfied by build script itself; no separate tsc step.
    - `pnpm test --run` runs BEFORE build so a failing test fails the job before artifact upload.
    - `concurrency.group: pages` + `cancel-in-progress: true` — newer push supersedes older in-flight build.
    - Top-level `permissions: contents: read` minimizes build-job surface area; deploy job declares its own elevated permissions.
    - `environment.name: github-pages` is required by `actions/deploy-pages@v4`.
    - Do NOT add `--base` override or `VITE_BASE` env — `vite.config.ts` already pins `base: '/mysekai-planner/'`.
  </action>
  <verify>
    <automated>test -f .github/workflows/deploy.yml &amp;&amp; python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" &amp;&amp; grep -q "actions/deploy-pages@v4" .github/workflows/deploy.yml &amp;&amp; grep -q "actions/upload-pages-artifact@v3" .github/workflows/deploy.yml &amp;&amp; grep -q "pnpm/action-setup@v4" .github/workflows/deploy.yml &amp;&amp; grep -q "actions/setup-node@v4" .github/workflows/deploy.yml &amp;&amp; grep -q "actions/checkout@v4" .github/workflows/deploy.yml &amp;&amp; grep -q "needs: build" .github/workflows/deploy.yml &amp;&amp; grep -q "cancel-in-progress: true" .github/workflows/deploy.yml &amp;&amp; grep -q "pnpm test --run" .github/workflows/deploy.yml &amp;&amp; grep -q "pnpm build" .github/workflows/deploy.yml &amp;&amp; grep -q "pnpm install --frozen-lockfile" .github/workflows/deploy.yml &amp;&amp; grep -q "node-version: 20" .github/workflows/deploy.yml &amp;&amp; grep -q "environment:" .github/workflows/deploy.yml &amp;&amp; grep -q "github-pages" .github/workflows/deploy.yml &amp;&amp; grep -q "pages: write" .github/workflows/deploy.yml &amp;&amp; grep -q "id-token: write" .github/workflows/deploy.yml</automated>
  </verify>
  <acceptance_criteria>
    - .github/workflows/deploy.yml exists
    - File parses as valid YAML (python3 yaml.safe_load exits 0)
    - grep -q "actions/checkout@v4" matches
    - grep -q "pnpm/action-setup@v4" matches
    - grep -q "actions/setup-node@v4" matches
    - grep -q "actions/upload-pages-artifact@v3" matches
    - grep -q "actions/deploy-pages@v4" matches
    - grep -q "needs: build" matches
    - grep -q "concurrency:" matches
    - grep -q "cancel-in-progress: true" matches
    - grep -q "group: pages" matches
    - grep -q "pnpm install --frozen-lockfile" matches
    - grep -q "pnpm test --run" matches (DEPLOY-03 test gate)
    - grep -q "pnpm build" matches (typecheck via tsc -b inside build script)
    - grep -q "node-version: 20" matches
    - grep -q "cache: pnpm" matches
    - grep -q "version: 9" matches (pnpm pin)
    - grep -q "pages: write" matches
    - grep -q "id-token: write" matches
    - grep -q "contents: read" matches
    - grep -q "environment:" and "github-pages" both match
    - vite.config.ts unchanged (git diff vite.config.ts is empty)
  </acceptance_criteria>
  <done>Workflow file present, YAML-valid, contains all required action references and steps; vite.config.ts untouched.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create README with Deployment section</name>
  <files>README.md</files>
  <read_first>
    - .planning/phases/08-deploy-github-pages/08-CONTEXT.md (URL placeholder format, 3 manual setup steps)
    - .planning/PROJECT.md (project description for top of README)
    - .github/workflows/deploy.yml (just created — link to it from README)
  </read_first>
  <action>
    Create `README.md` at repo root with this content. The `<owner>` placeholder is intentional — the user fills it in post-push (per 08-CONTEXT.md "Public URL placeholder" decision).

    ```markdown
    # MySekai Planner

    ![Deploy](https://github.com/<owner>/mysekai-planner/actions/workflows/deploy.yml/badge.svg)

    A top-down 2D grid editor for Project Sekai's MySekai outdoor area. Plan your sekai layout on an accurate in-game grid, calculate material costs, and share blueprints via URL.

    **Live site:** https://<owner>.github.io/mysekai-planner/

    ## Stack

    React 19 + TypeScript + Vite 8 + Konva (canvas) + Zustand (state) + Tailwind v4. See [`CLAUDE.md`](./CLAUDE.md) for the full technology breakdown.

    ## Local Development

    ```bash
    pnpm install
    pnpm dev          # http://localhost:5173
    pnpm test         # vitest
    pnpm build        # tsc -b && vite build -> dist/
    ```

    ## Deployment

    The site is hosted on GitHub Pages and re-deploys automatically on every push to `main` via [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml).

    **Public URL:** `https://<owner>.github.io/mysekai-planner/` (replace `<owner>` with your GitHub username after first deploy)

    **What triggers a redeploy:**
    - Any push to `main` (including merged PRs)
    - Manual run via Actions tab → Deploy to GitHub Pages → Run workflow

    **Build pipeline:**
    1. `pnpm install --frozen-lockfile`
    2. `pnpm test --run` — must pass (199 tests)
    3. `pnpm build` — `tsc -b` typecheck then `vite build` to `dist/`
    4. Upload `dist/` as Pages artifact
    5. Deploy artifact to `github-pages` environment

    A failing test, type error, or build error blocks the deploy step entirely; the previous successful deployment continues serving until a green build replaces it.

    ### One-time setup for a fresh fork

    Required after forking or cloning to a new GitHub account:

    1. **Create the repo on GitHub.** Visit https://github.com/new and create an empty repo named `mysekai-planner` under your account (no README, no .gitignore — this repo already has them).
    2. **Push your local clone:**
       ```bash
       git remote add origin git@github.com:<owner>/mysekai-planner.git
       git push -u origin main
       ```
    3. **Enable Pages from Actions.** In the repo, go to **Settings → Pages → Source** and select **GitHub Actions**. The first push to `main` will trigger the workflow and the site will appear at `https://<owner>.github.io/mysekai-planner/` within a minute or two.

    ### Verifying a deploy

    After a successful Actions run, the public URL must serve:
    - `index.html` (HTTP 200)
    - Code-split JS/CSS chunks under `/mysekai-planner/assets/...` (HTTP 200, no 404s)
    - Static data under `/mysekai-planner/sprites/manifest.json` (HTTP 200)
    - Sprite PNGs referenced by the manifest (HTTP 200)

    Quick smoke test:
    ```bash
    curl -sI https://<owner>.github.io/mysekai-planner/ | head -1
    curl -sI https://<owner>.github.io/mysekai-planner/sprites/manifest.json | head -1
    ```

    Both should return `HTTP/2 200`.

    ## License

    See [`LICENSE`](./LICENSE) if present, otherwise all rights reserved by the repo owner. Game data and assets belong to SEGA / Colorful Palette.
    ```

    Notes:
    - `<owner>` placeholder appears in 4 places — intentional, user fills in post-deploy.
    - Section heading must be exactly `## Deployment` (acceptance criteria greps for it).
    - Triple backticks inside the markdown block above are part of the README content; render the file faithfully.
  </action>
  <verify>
    <automated>test -f README.md &amp;&amp; grep -q "^# MySekai Planner" README.md &amp;&amp; grep -q "^## Deployment" README.md &amp;&amp; grep -q "github.io/mysekai-planner" README.md &amp;&amp; grep -q "GitHub Actions" README.md &amp;&amp; grep -q "frozen-lockfile" README.md &amp;&amp; grep -q "Settings.*Pages.*Source" README.md &amp;&amp; grep -q "deploy.yml/badge.svg" README.md &amp;&amp; grep -q "One-time setup" README.md</automated>
  </verify>
  <acceptance_criteria>
    - README.md exists at repo root
    - grep -q "^# MySekai Planner" matches (top-level heading)
    - grep -q "^## Deployment" matches (canonical section heading)
    - grep -q "github.io/mysekai-planner" matches (public URL form)
    - grep -q "deploy.yml/badge.svg" matches (Actions badge)
    - grep -q "frozen-lockfile" matches (pipeline documentation)
    - grep -q "Settings.*Pages.*Source" matches (manual enable-Pages step documented)
    - grep -q "git remote add origin" matches (push step documented)
    - grep -q "git@github.com:<owner>/mysekai-planner.git" matches (placeholder used, not hardcoded)
    - grep -c "<owner>" README.md returns >= 3 (placeholder appears in URL, badge, push command)
    - File is plain markdown (no front-matter, opens cleanly)
  </acceptance_criteria>
  <done>README.md present at repo root, contains "## Deployment" section with public URL placeholder, manual setup steps, and pipeline description; ready for user to fill in `<owner>` post-push.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Live-site verification (post-push manual check)</name>
  <what-built>
    `.github/workflows/deploy.yml` (Actions workflow, build → deploy) and `README.md` (Deployment section). The workflow file is on disk; the live site does not yet exist because pushing requires the user's GitHub credentials and the empty remote repo.
  </what-built>
  <action>This is a human-verify checkpoint — see <how-to-verify> below for the user-only manual steps (create repo, push, enable Pages, smoke-test live URL). Claude performs no automation in this task.</action>
  <verify>Manual: user confirms live site at https://&lt;owner&gt;.github.io/mysekai-planner/ returns HTTP 200 and renders the editor. See <how-to-verify> for curl commands and browser checks.</verify>
  <done>Live site loads at the public URL with no asset 404s; user types 'deployed' to resume.</done>
  <how-to-verify>
    Claude has produced everything it can produce. The remaining steps are user-only — Claude cannot create your GitHub repo, push from your authenticated session, or click "Source: GitHub Actions" in repo Settings.

    **Step 1 — Create the empty repo (browser, ~30s):**
    Visit https://github.com/new. Repository name: `mysekai-planner`. Visibility: your choice (public recommended for Pages). Do NOT initialize with README/gitignore/license. Click **Create repository**.

    **Step 2 — Push the local clone (terminal, ~10s):**
    ```bash
    cd /Users/lijunyang/Personal/mysekai-planner
    git remote add origin git@github.com:<your-username>/mysekai-planner.git
    git push -u origin main
    ```
    (Use `https://github.com/<your-username>/mysekai-planner.git` if you don't have SSH keys set up.)

    **Step 3 — Enable Pages (browser, ~15s):**
    Go to `https://github.com/<your-username>/mysekai-planner/settings/pages`. Under **Source**, select **GitHub Actions**. No save button needed — the selection persists immediately.

    **Step 4 — Watch the workflow run (browser, 1–3 min):**
    Visit `https://github.com/<your-username>/mysekai-planner/actions`. The "Deploy to GitHub Pages" workflow should be running (or queued). Click into it; you should see two jobs: `build` (running first) and `deploy` (running after build succeeds). Both must end with green checkmarks.

    **Step 5 — Smoke-test the live site:**
    Once the deploy job completes, run these from your terminal:
    ```bash
    curl -sI https://<your-username>.github.io/mysekai-planner/ | head -1
    curl -sI https://<your-username>.github.io/mysekai-planner/sprites/manifest.json | head -1
    ```
    Both must return `HTTP/2 200`.

    Then open `https://<your-username>.github.io/mysekai-planner/` in a browser. Expected:
    - Welcome / area-level selector loads (no white screen, no console errors)
    - Pick area level 1 → editor chrome appears (top rail, catalog rail, floatbar, hotbar, zoom dock)
    - DevTools Network tab: every request returns 200 (no 404s on assets, sprites, fonts, or manifest.json)
    - Place a fixture from the catalog → it renders on the canvas with its sprite

    **Step 6 — Update the placeholder (optional but recommended):**
    Once verified, replace `<owner>` in README.md with your actual username (4 occurrences) and commit:
    ```bash
    sed -i '' 's/<owner>/<your-username>/g' README.md
    git add README.md && git commit -m "docs(08): fill in deployed Pages URL"
    git push
    ```

    **If something fails:**
    - Build fails on `pnpm test --run` → fix tests locally first; the workflow will re-run on next push
    - Build fails on `pnpm build` → typecheck error somewhere; reproduce locally with `pnpm build`
    - Site loads but assets 404 → check `vite.config.ts` `base` is still `/mysekai-planner/` (it should be — the workflow is not allowed to touch it)
    - Pages source not set → re-do Step 3
  </how-to-verify>
  <resume-signal>Type "deployed" when the live site loads cleanly and curl returns 200 on root and manifest.json. Type "blocked: &lt;reason&gt;" if you hit an error you can't resolve from the troubleshooting list.</resume-signal>
</task>

</tasks>

<verification>
**Goal-backward verification (must_haves):**

For each truth, confirm:

1. "Pushing to main triggers .github/workflows/deploy.yml" — verified by Step 4 (workflow appears in Actions tab after push).
2. "Workflow runs typecheck (tsc -b inside pnpm build) and tests (pnpm test --run) before publishing; non-zero exit blocks deploy" — verified by reading the workflow steps (test step runs before build step; build step runs `tsc -b && vite build`; deploy job has `needs: build`).
3. "Successful run publishes dist/ artifact via actions/deploy-pages@v4 to https://&lt;owner&gt;.github.io/mysekai-planner/" — verified by Step 5 curl returning 200 + browser load.
4. "Failed build keeps the previous successful artifact serving" — verified structurally by `needs: build` in deploy job (Pages serves last-good artifact when no new one is published; this is a GitHub Pages behavior).
5. "README documents the public URL placeholder, the 3 manual setup steps, and what triggers a redeploy" — verified by acceptance_criteria greps in Task 2.

**Requirement coverage:**
- DEPLOY-01 (public URL): Task 1 + Task 3 (live verification)
- DEPLOY-02 (auto-redeploy on push to main): Task 1 (`on: push: branches: [main]`)
- DEPLOY-03 (failed build blocks deploy): Task 1 (`pnpm test --run` step + `needs: build` chain + `tsc -b` inside build script)
</verification>

<success_criteria>
- `.github/workflows/deploy.yml` exists, parses as valid YAML, contains all locked-decision elements (per Task 1 acceptance_criteria)
- `README.md` exists with `## Deployment` section, public URL placeholder, manual setup checklist, pipeline description (per Task 2 acceptance_criteria)
- `vite.config.ts` is unchanged (`git diff vite.config.ts` empty)
- After user completes manual steps: live site at `https://<owner>.github.io/mysekai-planner/` returns HTTP 200, app loads, place-fixture flow works, no asset 404s
- Phase 8 success criteria 1-4 from ROADMAP all satisfied (live URL, auto-redeploy, build failures block deploy, README documents enable-Pages step)
</success_criteria>

<output>
After completion, create `.planning/phases/08-deploy-github-pages/08-01-SUMMARY.md` recording:
- The exact action versions used (in case GitHub deprecates one later)
- Whether the first deploy succeeded on the user's first push
- Any deviations from the locked decisions in 08-CONTEXT.md and why
- The actual deployed URL (after user fills in `<owner>`)
</output>
