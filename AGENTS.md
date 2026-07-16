# Alarkive development constraints

## Product scope

- Alarkive V0.1 is a single-user personal learning document tool.
- Do not implement or call an AI API in V0.1.
- Do not implement multi-user accounts, community, Explore, online Fork, payments, recommendations, or collaboration.
- Markdown is the canonical content format.
- Keep page components modular; `page.tsx` must not contain an entire page implementation.
- Prefer reusing focused components, but avoid abstractions without a current use case.
- Keep `main` buildable. After changes, run formatting checks, lint, TypeScript checks, and a production build.
- Continue the existing stack unless a change is explicitly justified.
- Do not refactor code unrelated to the current task.
- Use shared domain types rather than duplicating page data.
- Seed examples belong under `scripts/seed-data/` and must never be used as a
  runtime fallback.
- Preserve the product wireframes under `docs/design/`.

## Sources of truth

- Start at `docs/README.md` for the documentation map.
- Product behavior and scope live under `docs/product/`.
- Architecture and persistence rules live under `docs/architecture/`.
- `src/server/db/schema.ts` and `drizzle/` are authoritative for the database.
- Shared client/server data contracts live under `src/types/`.
- Operational procedures live under `docs/operations/`.

When behavior, schema, environment variables, archive format, or deployment
steps change, update the corresponding documentation in the same change.

## Architecture boundaries

- `src/app/` contains routing and thin server composition only.
- Client components may import shared types, UI components, hooks, utilities,
  and Server Actions; they must not import `@/server/**`.
- Server Actions validate the request boundary and call repositories or
  application services. They do not contain database queries.
- Application services coordinate multi-resource work. Repositories only
  access SQLite and must not manage files.
- Keep server-only code under `src/server/`; ESLint must reject imports from
  that namespace inside Client Components.
- Prefer direct imports over barrel files so dependencies remain searchable.

## Data safety

- Never run tests, reset, or seed against a user's `data/alarkive.db`.
- Tests must use isolated database and asset paths.
- Never commit or sync `.env`, SQLite files, uploaded assets, or backups.
- Applied migrations are immutable. Add a new migration for schema changes.
- Database failures must be visible; do not silently fall back to seed data.

## Verification matrix

- Documentation-only: `npm run format:check`.
- UI or client logic: format, lint, typecheck, relevant tests, and build.
- Repository/schema/import/backup changes: all checks plus integration tests
  and an applied migration when the schema changes.
- Deployment changes: all checks plus `npm run docker:verify` on a Docker host.
- Before pushing `main`, run `npm run check` and `npm run build`.
