import type { Database } from "bun:sqlite";
import { getDb } from "../db/connection.ts";
import {
  completedTasks,
  commitsInRange,
  sessionSummaryByProject,
} from "../db/queries.ts";
import { projectName } from "../utils/paths.ts";
import {
  today,
  thisWeekStart,
  formatDuration,
  dateToMs,
  endOfDayMs,
} from "../utils/dates.ts";
import { bold, dim, cyan, header } from "../utils/format.ts";

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function rangeLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(s)} - ${fmt(e)}`;
}

type Commits = ReturnType<typeof commitsInRange>;

function matchesFilter(name: string, filter: string): boolean {
  return name.toLowerCase().includes(filter.toLowerCase());
}

function printCompletedTasks(db: Database, filter: string | null): boolean {
  let tasks = completedTasks(db);
  if (filter) {
    tasks = tasks.filter(
      (t) =>
        matchesFilter(t.suite_id, filter) ||
        (t.subject && matchesFilter(t.subject, filter)),
    );
  }
  if (tasks.length === 0) return false;

  console.log(`  ${bold(`Tasks Completed (${tasks.length})`)}`);
  for (const t of tasks) {
    const suite = t.suite_id.length > 20 ? t.suite_id.slice(0, 8) + "..." : t.suite_id;
    console.log(`  |-- ${cyan(suite)}: ${t.subject ?? dim("(no subject)")}`);
  }
  console.log();
  return true;
}

function printCommits(
  db: Database,
  startDate: string,
  endDate: string,
  filter: string | null,
): Commits {
  let commits = commitsInRange(db, startDate, endDate + "T23:59:59");
  if (filter) {
    commits = commits.filter(
      (c) => c.project_path && matchesFilter(projectName(c.project_path), filter),
    );
  }
  if (commits.length === 0) return commits;

  console.log(`  ${bold(`Commits (${commits.length})`)}`);
  for (const c of commits) {
    const name = c.project_path ? projectName(c.project_path) : "unknown";
    const date = c.date ? shortDate(c.date.slice(0, 10)) : "?";
    console.log(
      `  |-- ${cyan(name)}: ${c.message ?? dim("(no message)")}  ${dim(`(${date})`)}`,
    );
  }
  console.log();
  return commits;
}

function printSessionSummary(
  db: Database,
  startMs: number,
  endMs: number,
  commitCount: number,
  filter: string | null,
): boolean {
  let summaries = sessionSummaryByProject(db, startMs, endMs);
  if (filter) {
    summaries = summaries.filter(
      (s) => s.project_path && matchesFilter(projectName(s.project_path), filter),
    );
  }
  if (summaries.length === 0) return false;

  console.log(`  ${bold("Session Summary")}`);
  let totalSessions = 0;
  let totalMinutes = 0;

  for (const s of summaries) {
    const name = s.project_path ? projectName(s.project_path) : "unknown";
    const dur = formatDuration(Math.round(s.total_duration ?? 0));
    const added = s.total_lines_added ?? 0;
    const removed = s.total_lines_removed ?? 0;
    totalSessions += s.session_count;
    totalMinutes += s.total_duration ?? 0;
    console.log(
      `  |-- ${cyan(name)}: ${s.session_count} sessions, ${dur}, +${added}/-${removed} lines`,
    );
  }
  console.log();

  console.log(
    `  ${bold(`Week Total: ${totalSessions} sessions, ${formatDuration(Math.round(totalMinutes))}, ${commitCount} commits`)}`,
  );
  console.log();
  return true;
}

export function progressCommand(args: string[]): void {
  const db = getDb();
  const filter = args.find((a) => !a.startsWith("--")) ?? null;

  const startDate = thisWeekStart();
  const endDate = today();
  const startMs = dateToMs(startDate);
  const endMs = endOfDayMs(endDate);

  console.log(header(`Progress: ${rangeLabel(startDate, endDate)}`));
  console.log();

  const hasTasks = printCompletedTasks(db, filter);
  const commits = printCommits(db, startDate, endDate, filter);
  const hasSessions = printSessionSummary(db, startMs, endMs, commits.length, filter);

  if (!hasTasks && commits.length === 0 && !hasSessions) {
    console.log(dim("  No activity this week."));
    console.log();
  }
}
