# Contributing

PRs welcome. Here's how to get started.

## Setup

```bash
git clone https://github.com/ramonclaudio/claude-pulse.git
cd claude-pulse
bun install
bun run src/index.ts serve
```

## Project Structure

```text
src/
  index.ts              CLI entry point
  commands/             Command handlers (serve, log, search, etc.)
  db/                   SQLite connection, schema, query helpers
  ingest/               Data parsers (conversations, sessions, projects, tasks, etc.)
  pages/                Dashboard and chat viewer HTML
  utils/                Dates, formatting, git, syntax highlighting, path helpers
```

## Guidelines

- Run `bun run build` before submitting to verify it compiles
- Follow conventional commits: `type(scope): description`
- Keep changes small and focused. One concern per PR.
- No external runtime dependencies. Everything uses Bun primitives.
- Test against your own `~/.claude/` data

## Reporting Bugs

Open an issue with:
- What you expected
- What happened
- Steps to reproduce
- Your Bun version (`bun --version`)
