# Archived scripts

One-off maintenance, import, seed, and migration scripts kept for reference.
Do not run unless you understand the data impact.

## Data migrations (already executed)

- migrate-solutions-to-boards.ts
- migrate-partner-center-bg-to-cover.ts
- migrate-homepage-media-to-r2.ts
- migrate-social-media-images-to-r2.ts
- migrate-cover-images-to-media-assets.ts
- migrate-upload-values-to-storage-keys.ts
- migrate-images-to-oss-keys.ts
- migrate-admin-users.ts
- prune-summits.ts

## Content import / seed

- seed-*.ts, import-*.ts, translate-*.ts, fix-wechat-qr.ts, clear-categories.ts
- import-cfvc-*.ts, import-topsky-*.ts, probe-cfvc-years.ts
- test-brand-narratives.ts, verify-brand-narrative-pages.ts

Run from repo root, e.g. `pnpm exec tsx scripts/archive/seed-summits.ts`.
