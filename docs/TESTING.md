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

- The project includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs on `push` and `pull_request` for `main`/`master` and executes `npm ci` and `npm test`.
- Ensure Node 18 is available in CI (workflow uses `actions/setup-node@v4` with `node-version: 18`).

Notes

- Tests expect `@types/jest` to be installed; the repository config uses `tsconfig.spec.json` for test type settings handled by ts-jest.
- To run integration tests against external services (POK, DRM), configure the following environment variables in CI or locally:
  - `POK_API_URL` — POK base API
  - `POK_API_KEY` — POK API key
  - `POK_WEBHOOK_SECRET` — POK webhook secret (for HMAC verification)
  - `DRM_PROVIDER` — set to `simple` for the included `SimpleDrmAdapter`

If you want me to add recorded HTTP fixtures (nock/msw) to test external flows, I can add those next.
