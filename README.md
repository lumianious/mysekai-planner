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
