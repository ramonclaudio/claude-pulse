import type { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { STATS_FILE } from "../utils/paths.ts";
import type { StatsCache } from "../utils/parse.ts";
import { parseJsonFile } from "../utils/parse.ts";

export async function ingestStats(db: Database): Promise<number> {
  if (!existsSync(STATS_FILE)) return 0;

  const stats = await parseJsonFile<StatsCache>(STATS_FILE);
  if (!stats?.dailyActivity?.length) return 0;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO daily_stats (date, message_count, session_count, tool_call_count)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;

  const tx = db.transaction(() => {
    for (const day of stats.dailyActivity) {
      try {
        insert.run(
          day.date,
          day.messageCount ?? 0,
          day.sessionCount ?? 0,
          day.toolCallCount ?? 0,
        );
        count++;
      } catch (e) {
        console.error(`Failed to ingest stats for ${day.date}:`, e);
      }
    }
  });

  tx();
  return count;
}
