# Project Structure

Comic Shelf is an Nx monorepo with the following layout:

```
comic-shelf/
├── apps/
│   ├── api/          # NestJS 11 backend
│   ├── web/          # React 19 + Vite + Mantine v8 frontend
│   └── docs/         # VitePress documentation (this site)
├── libs/
│   ├── db/           # Prisma client and schema
│   ├── metron-client/ # Metron API client
│   └── shared-types/ # Shared TypeScript types (DTOs, interfaces)
├── .github/
│   └── workflows/    # CI/CD, docs deployment, release-please
├── docker-compose.yml
└── nx.json
```

## Monorepo Benefits

- **Single `npm install`** for the entire stack
- **Nx task caching** — only rebuild what changed
- **Shared types** — one source of truth for API contracts
- **Affected commands** — `nx affected` runs only impacted projects in CI
