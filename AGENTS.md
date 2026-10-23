# Live Blueprint professional app

This is the professional repository connected to Vercel project `blueprint-admin`:
`mrfranco91/Blueprint-Admin`, serving `blueprint-admin-two.vercel.app`.
Use the parent workspace's AGENTS.md, docs/SYSTEM.md and docs/CONTRACTS.md when
applicable, and the blueprint-system-development skill. The active companion
Client checkout is `../Blueprint-Client`.

`../Blueprint-Pro` is a newer fork kept for reference. Do not implement changes
there when the request concerns this live app, and do not merge its 208 unrelated
commits as an accessibility fix. Preserve separate Git histories and environments.

Run `pnpm check:target` before edits intended for release. Build and tests use
pnpm 9.15.4 with Node 22. Run `pnpm build` and `pnpm test:a11y` before publishing.
The target guard refuses the wrong origin or Vercel Git identity. The existing
domain and Square redirect URI in .blueprint-project.json must stay unchanged.

Production branch is unverified. Work on a feature branch and use review rather
than guessing a branch to deploy. Do not modify provider operations, credentials,
database schema or bookings to validate a presentation change. Explain user
technical actions with numbered steps. Record continuity in ../docs/HANDOFF.md.
