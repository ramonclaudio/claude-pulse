# Security

Claude Pulse runs locally and makes no network requests beyond `localhost`. It reads your `~/.claude/` directory (read-only) and writes to a local SQLite database.

## Reporting a Vulnerability

If you find a security issue, open a [GitHub issue](https://github.com/ramonclaudio/claude-pulse/issues) or email author@example.com.

## Scope

This project processes local files only. It does not:
- Make API calls to external services
- Send telemetry or analytics
- Store credentials or tokens
- Expose the server beyond localhost (`127.0.0.1`)
