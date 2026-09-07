# Testing and CI

Commands

- Run unit tests:

```bash
npm test
```

- Run tests with watch:

```bash
npm run test:watch
```

- Run coverage locally:

```bash
npm run test:cov
```

CI

- The project includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs build, lint, coverage, e2e tests and Prisma schema drift checks.
- Ensure Node 22 is available in CI (workflow uses `actions/setup-node@v4` with `node-version: 22`).

Notes

- Tests expect `@types/jest` to be installed; the repository config uses `tsconfig.spec.json` for test type settings handled by ts-jest.
- Integration tests use deterministic stubs. Configure the following only when running external tests locally:
  - `POK_API_URL` — POK base API
  - `POK_API_KEY` — POK API key
  - `POK_WEBHOOK_SECRET` — POK webhook secret (for HMAC verification)
  - `DRM_PROVIDER` — set to `simple` for the included `SimpleDrmAdapter`

