import { Glob } from "bun";
import type { Database } from "bun:sqlite";
import { existsSync, readFileSync } from "node:fs";
import { TASKS_DIR, listDirs } from "../utils/paths.ts";
import { safeParseJson } from "../utils/parse.ts";

const CLAUDE_HOME = Bun.env.HOME + "/.claude";
const TEAMS_DIR = CLAUDE_HOME + "/teams";

interface RawTask {
  id: number | string;
  subject?: string;
  description?: string;
  status?: string;
  owner?: string;
  activeForm?: string;
  blocks?: number[];
  blockedBy?: number[];
  metadata?: { _internal?: boolean; [key: string]: unknown };
}

function readTeamNames(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(TEAMS_DIR)) return map;
  for (const dir of listDirs(TEAMS_DIR)) {
    const configPath = TEAMS_DIR + "/" + dir + "/config.json";
    try {
      const cfg = JSON.parse(readFileSync(configPath, "utf-8"));
      if (cfg.name) map.set(cfg.name, cfg.description || cfg.name);
    } catch { /* skip */ }
  }
  return map;
}

function readHighwatermark(suitePath: string): number {
  try {
    const text = readFileSync(suitePath + "/.highwatermark", "utf-8").trim();
    return parseInt(text, 10) || 0;
  } catch { return 0; }
}

export async function ingestTasks(db: Database): Promise<number> {
  if (!existsSync(TASKS_DIR)) return 0;

  const teamNames = readTeamNames();
  const suiteDirNames = listDirs(TASKS_DIR);
  const results: { suiteId: string; teamName: string | null; totalCreated: number; task: RawTask }[] = [];

  for (const raw of suiteDirNames) {
    const suiteId = raw.replace(/\/$/, "");
    const suitePath = TASKS_DIR + "/" + suiteId;
    const teamName = teamNames.get(suiteId) || null;
    const totalCreated = readHighwatermark(suitePath);

    let files: string[];
    try { files = [...new Glob("*.json").scanSync(suitePath)]; } catch { continue; }

    for (const file of files) {
      try {
        const text = await Bun.file(suitePath + "/" + file).text();
        const task = safeParseJson<RawTask>(text);
        if (task) results.push({ suiteId, teamName, totalCreated, task });
      } catch { continue; }
    }
  }

  if (results.length === 0) return 0;

  const insert = db.query(`
    INSERT OR REPLACE INTO tasks (id, suite_id, subject, description, status, owner, blocks, blocked_by, is_internal, active_form, team_name, total_created)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  db.transaction(() => {
    for (const { suiteId, teamName, totalCreated, task } of results) {
      insert.run(
        String(task.id), suiteId,
        task.subject ?? null, task.description ?? null,
        task.status ?? "pending", task.owner ?? null,
        task.blocks ? JSON.stringify(task.blocks) : null,
        task.blockedBy ? JSON.stringify(task.blockedBy) : null,
        task.metadata?._internal ? 1 : 0,
        task.activeForm ?? null,
        teamName, totalCreated,
      );
      count++;
    }
  })();

  return count;
}
