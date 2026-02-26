# Contributing to Eduskript

## Setup

```bash
git clone https://github.com/marcchehab/eduskript.git
cd eduskript
bash scripts/setup-dev.sh
pnpm dev
```

## Workflow

1. Fork & create a feature branch
2. Make your changes
3. Run `pnpm validate` (type-check + lint + tests)
4. Open a PR against `main`

## Code Style

- TypeScript strict mode
- ESLint rules enforced (`pnpm lint`)
- Prefer editing existing files over creating new ones
- Keep changes focused - one concern per PR

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
