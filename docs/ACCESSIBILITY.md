# Professional app color and deployment setup

## Authoritative source

Repository: `mrfranco91/Blueprint-Admin` (this checkout).
Vercel team/project: `melissas-projects-3642f0e1` / `blueprint-admin`.
Website: `https://blueprint-admin-two.vercel.app`.
Square callback: `https://blueprint-admin-two.vercel.app/square/callback`.

These values are recorded in `.blueprint-project.json`. No new Vercel project,
domain, Square application or callback registration is needed. The production
branch has not been read from Vercel; changes are prepared on a feature branch.
The newer `melrfranco/Blueprint-Pro` fork is not this project's deployment source.

## Color authority

`styles/theme.css` owns the palette, semantic surface/text pairs, class-based dark
theme, navigation, status and chart colors. `index.css` consumes those tokens and
owns presentation. The old `styles/accessibility.css` is a compatibility marker;
its broad unlayered button/field overrides are no longer imported by App.
The old HTML branding color injector is removed; font and text-size restoration
remain. Legacy `brand-*` utility names alias this same theme instead of creating
another palette. Existing stored salon settings and API/provider code are untouched.

| Role | Token pair |
| --- | --- |
| Page | `--background` / `--foreground` |
| Card | `--card` / `--card-foreground` |
| Popover | `--popover` / `--popover-foreground` |
| Primary action/header | `--primary` / `--primary-foreground` |
| Secondary action | `--secondary` / `--secondary-foreground` |
| Muted surface | `--muted` / `--muted-foreground` |
| Accent surface | `--accent` / `--accent-foreground` |
| Destructive action | `--destructive` / `--destructive-foreground` |
| Navigation | `--navigation` / `--navigation-foreground` |
| Plan status | `--status-active*`, `--status-draft*`, muted fallback |
| Chart line and focus | `--chart-line`, `--ring` |

The palette is the reviewed navy/blue/near-white palette from the local preview.
Exact Oklch/hex values are documented directly in the theme file. Dark pages and
light cards intentionally use different foregrounds. Metrics and section headings
inherit their surface foreground; primary surfaces explicitly pair primary text.
Inactive navigation labels stay readable and active navigation is underlined.
Chart data has an equivalent table. Inputs, keyboard focus, reduced motion and
text scaling should always be reviewed when changing components.

The color guard checks the active stylesheet and core dashboard/navigation/theme
controls. Other legacy screens still contain direct palette classes and branding
colors; they have not all been migrated or audited. Extend coverage when changing
those screens. Arbitrary enterprise palette application needs its own tested
semantic resolver, not a new global color injector.

## Everyday workflow

1. From the parent workspace run `node scripts/pro.mjs status`. It always chooses
   this checkout and checks its origin against the deployment contract.
2. Run `node scripts/pro.mjs install` using Node 22 and pnpm 9.15.4.
3. Run `node scripts/pro.mjs build`, then `node scripts/pro.mjs test`.
4. Run `node scripts/pro.mjs preview` and open
   `http://127.0.0.1:4180/tests/a11y/` for the synthetic-data preview.
5. Commit and push a reviewed feature branch in **this repository**. A GitHub
   credential with write access to `mrfranco91/Blueprint-Admin` is needed.
6. Review the changes through the existing Git/Vercel workflow. Do not guess a
   production branch, reconnect the project to the fork, or change the domain.

Inside this repository, the matching commands are `pnpm check:target`,
`pnpm build`, `pnpm test:a11y`, and `pnpm test:a11y:report`. The build rejects a
mismatched origin or Vercel Git identity. It does not change any remote settings.

## Test scope and release gate

The 24 Playwright/axe tests render this repository's actual dashboard, navigation
and theme components, not the newer fork's application. Data hooks are synthetic,
Supabase is replaced and API/external requests are blocked. Both light/dark themes
are checked on desktop/mobile, including populated/empty data, settings/appearance,
plan cards, semantic color swatches, keyboard focus, chart table, doubled text
size and deliberate low-contrast injection proving detection. No axe rules are
disabled. The test bundle has a separate output directory and is not shipped in
the application build. No bookings, schema mutations or provider writes occur.

The `Accessibility` workflow runs on PRs and pushes to main. After its first run:

1. Open GitHub repository Settings → Rules → Rulesets (or branch protection).
2. Protect the actual production branch with a required pull request and passing
   **Pro accessibility** check. Save. This remote setting has not been changed here.
3. Review real fonts, keyboard behavior, VoiceOver, zoom/reflow, chart/control
   contrast and any changed screen. Automation cannot guarantee conformance.
4. After an authorized release, confirm the deployed commit and smoke-check the
   existing domain and Square callback. A passing local fixture does not prove
   a successful production deployment or authenticated journey.

Vite build and all 24 tests pass locally. Full TypeScript checking still reports
pre-existing role errors in App/Auth contexts and an unsupported PlanWizard
`onLogout` prop; those contracts are unchanged by this presentation patch.

## Setup repair

The upstream repository tracked `node_modules` as a broken symlink to
`/vercel/share/v0-next-shadcn/node_modules`. It is removed from Git; dependencies
are installed reproducibly from `pnpm-lock.yaml`, with generated directories
ignored. `.vercelignore` excludes local environment files and test artifacts.
