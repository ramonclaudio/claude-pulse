import { getDb } from "../db/connection.ts";
import { openTasks, completedTasks, type Task } from "../db/queries.ts";
import { bold, dim, cyan, statusBadge, header } from "../utils/format.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function suiteType(suiteId: string): string {
  return UUID_RE.test(suiteId) ? "session" : "team";
}

function suiteName(suiteId: string): string {
  if (UUID_RE.test(suiteId)) return suiteId.slice(0, 8) + "...";
  return suiteId;
}

function groupBySuite(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    let list = map.get(t.suite_id);
    if (!list) {
      list = [];
      map.set(t.suite_id, list);
    }
    list.push(t);
  }
  return map;
}

export function tasksCommand(args: string[]): void {
  const db = getDb();
  const showDone = args.includes("--done");
  const projectFilter = args.find((a) => !a.startsWith("--"));

  let tasks = showDone ? completedTasks(db) : openTasks(db);

  if (projectFilter) {
    // Filter by suite name containing the project string
    tasks = tasks.filter(
      (t) =>
        t.suite_id.toLowerCase().includes(projectFilter.toLowerCase()) ||
        (t.owner && t.owner.toLowerCase().includes(projectFilter.toLowerCase())),
    );
  }

  if (tasks.length === 0) {
    console.log(dim(showDone ? "No completed tasks." : "No open tasks."));
    return;
  }

  const label = showDone ? "Completed Tasks" : "Open Tasks";
  console.log(header(`${label} (${tasks.length})`));
  console.log();

  const grouped = groupBySuite(tasks);

  for (const [suiteId, suiteTasks] of grouped) {
    const type = suiteType(suiteId);
    const name = suiteName(suiteId);

    console.log(
      `  ${cyan(name)} ${dim(`(${type}, ${suiteTasks.length} task${suiteTasks.length === 1 ? "" : "s"})`)}`,
    );

    for (const t of suiteTasks) {
      let line = `  |-- ${statusBadge(t.status ?? "pending")}  ${t.subject ?? dim("(no subject)")}`;

      if (t.owner) line += dim(`  (owner: ${t.owner})`);
      if (t.blocked_by) {
        try {
          const blockers = JSON.parse(t.blocked_by) as number[];
          if (blockers.length > 0) {
            line += dim(`  (blocked by: ${blockers.join(", ")})`);
          }
        } catch {
          // ignore bad JSON
        }
      }

      console.log(line);
    }
    console.log();
  }
}
