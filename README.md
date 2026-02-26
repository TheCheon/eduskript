# Eduskript

Open-source education platform for teachers. Create courses with markdown, LaTeX math, interactive SQL, syntax-highlighted code, and more.

**Stack:** Next.js 16 &middot; TypeScript &middot; PostgreSQL &middot; Prisma &middot; TailwindCSS &middot; CodeMirror 6

## Features

- **Markdown-first content** with KaTeX math, GFM, callouts, and syntax highlighting
- **Interactive SQL editors** running client-side via SQL.js (WebAssembly)
- **Multi-tenant** - each teacher gets their own page at `eduskript.org/your-page`
- **Collaboration** with granular permissions (author/viewer per collection, skript, or page)
- **Version control** for all content with rollback
- **Excalidraw** integration with automatic light/dark theme support
- **File management** with content-addressed deduplication

## Quick Start

```bash
git clone https://github.com/marcchehab/eduskript.git
cd eduskript
bash scripts/setup-dev.sh
pnpm dev
```

The setup script handles everything: dependencies, PostgreSQL (via Docker), migrations, and seeding.

**Multiple worktrees** are supported - each gets unique ports automatically.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm validate` | Type-check + lint + tests |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:push` | Push schema changes |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AGPL-3.0](LICENSE)
