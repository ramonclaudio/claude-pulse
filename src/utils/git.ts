import { existsSync } from "node:fs";

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
  commitType?: string;
  commitScope?: string;
}

export function isGitRepo(dir: string): boolean {
  return existsSync(dir + "/.git");
}

interface GitState {
  dirty: number;
  stashCount: number;
  branchCount: number;
  currentBranch: string;
}

async function run(cmd: string[], cwd: string, timeoutMs = 10_000): Promise<string> {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "ignore" });
  const timer = setTimeout(() => proc.kill(), timeoutMs);
  const text = await new Response(proc.stdout).text();
  clearTimeout(timer);
  return text;
}

export async function gitState(dir: string): Promise<GitState> {
  try {
    const [status, stash, branch] = await Promise.all([
      run(["git", "status", "--porcelain"], dir),
      run(["git", "stash", "list"], dir),
      run(["git", "branch", "--no-color"], dir),
    ]);
    const statusLines = status.trim().split("\n").filter(Boolean);
    const stashLines = stash.trim().split("\n").filter(Boolean);
    const branchLines = branch.trim().split("\n").filter(Boolean);
    const currentLine = branchLines.find(l => l.startsWith("* "));
    return {
      dirty: statusLines.length,
      stashCount: stashLines.length,
      branchCount: branchLines.length,
      currentBranch: currentLine ? currentLine.slice(2).trim() : "unknown",
    };
  } catch {
    return { dirty: 0, stashCount: 0, branchCount: 0, currentBranch: "unknown" };
  }
}

function parseConventional(message: string): { commitType?: string; commitScope?: string } {
  const m = message.match(/^(\w+)(?:\(([^)]*)\))?:\s/);
  if (!m) return {};
  return { commitType: m[1], commitScope: m[2] };
}

export async function gitRecentCommits(dir: string, since = "6 months ago"): Promise<GitCommit[]> {
  try {
    const fmt = "%H|%aI|%an|%s";
    const out = await run(["git", "log", `--format=${fmt}`, "--no-merges", `--since=${since}`], dir, 15_000);
    if (!out.trim()) return [];

    return out.trim().split("\n").filter(Boolean).map(line => {
      const [hash = "", date = "", author = "", ...rest] = line.split("|");
      const message = rest.join("|");
      const { commitType, commitScope } = parseConventional(message);
      return { hash, date, message, author, commitType, commitScope };
    });
  } catch {
    return [];
  }
}
