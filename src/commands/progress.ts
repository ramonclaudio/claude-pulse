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
  epochMsToDate,
} from "../utils/dates.ts";
import { bold, dim, cyan, header } from "../utils/format.ts";

function dateToMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

function endOfDayMs(dateStr: string): number {
  return new Date(dateStr + "T23:59:59.999").getTime();
}

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

export function progressCommand(args: string[]): void {
  const db = getDb();
  const projectFilter = args.find((a) => !a.startsWith("--"));

  const startDate = thisWeekStart();
  const endDate = today();
  const startMs = dateToMs(startDate);
  const endMs = endOfDayMs(endDate);

  console.log(header(`Progress: ${rangeLabel(startDate, endDate)}`));
  console.log();

  let hasOutput = false;

  // Completed tasks
  let tasks = completedTasks(db);
  if (projectFilter) {
    tasks = tasks.filter(
      (t) =>
        t.suite_id.toLowerCase().includes(projectFilter.toLowerCase()) ||
        (t.subject && t.subject.toLowerCase().includes(projectFilter.toLowerCase())),
    );
  }

  if (tasks.length > 0) {
    console.log(`  ${bold(`Tasks Completed (${tasks.length})`)}`);
    for (const t of tasks) {
      const suite = t.suite_id.length > 20 ? t.suite_id.slice(0, 8) + "..." : t.suite_id;
      console.log(`  |-- ${cyan(suite)}: ${t.subject ?? dim("(no subject)")}`);
    }
    console.log();
    hasOutput = true;
  }

  // Commits in range (end date needs T23:59:59 to include full day in ISO string comparison)
  let commits = commitsInRange(db, startDate, endDate + "T23:59:59");
  if (projectFilter) {
    commits = commits.filter(
      (c) =>
        c.project_path &&
        projectName(c.project_path).toLowerCase().includes(projectFilter.toLowerCase()),
    );
  }

  if (commits.length > 0) {
    console.log(`  ${bold(`Commits (${commits.length})`)}`);
    for (const c of commits) {
      const name = c.project_path ? projectName(c.project_path) : "unknown";
      const date = c.date ? shortDate(c.date.slice(0, 10)) : "?";
      console.log(
        `  |-- ${cyan(name)}: ${c.message ?? dim("(no message)")}  ${dim(`(${date})`)}`,
      );
    }
    console.log();
    hasOutput = true;
  }

  // Session summary by project
  let summaries = sessionSummaryByProject(db, startMs, endMs);
  if (projectFilter) {
    summaries = summaries.filter(
      (s) =>
        s.project_path &&
        projectName(s.project_path).toLowerCase().includes(projectFilter.toLowerCase()),
    );
  }

  if (summaries.length > 0) {
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
      `  ${bold(`Week Total: ${totalSessions} sessions, ${formatDuration(Math.round(totalMinutes))}, ${commits.length} commits`)}`,
    );
    console.log();
    hasOutput = true;
  }

  if (!hasOutput) {
    console.log(dim("  No activity this week."));
    console.log();
  }
}
