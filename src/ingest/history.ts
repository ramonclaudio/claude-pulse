import type { Database } from "bun:sqlite";
import { HISTORY_FILE } from "../utils/paths.ts";
import { decodeProjectPath } from "../utils/paths.ts";
import type { HistoryEntry } from "../utils/parse.ts";

export async function ingestHistory(db: Database): Promise<number> {
  let text: string;
  try { text = await Bun.file(HISTORY_FILE).text(); } catch { return 0; }
  if (!text.trim()) return 0;

  // Native JSONL parser (SIMD-accelerated C++ parser)
  const result = Bun.JSONL.parseChunk(text);
  const entries = result.values as HistoryEntry[];
  if (entries.length === 0) return 0;

  const insert = db.query(`
    INSERT INTO history_messages (session_id, project_path, display, timestamp, has_paste)
    VALUES (?, ?, ?, ?, ?)
  `);

  let count = 0;

  const tx = db.transaction(() => {
    for (const entry of entries) {
      try {
        if (!entry?.display) continue;

        const projectPath = entry.project ? decodeProjectPath(entry.project) : null;
        const hasPaste =
          entry.pastedContents && Object.keys(entry.pastedContents).length > 0 ? 1 : 0;

        insert.run(
          entry.sessionId || null,
          projectPath,
          entry.display,
          entry.timestamp ?? null,
          hasPaste,
        );

        count++;
      } catch (e) {
        console.error("Failed to parse history line:", e);
      }
    }
  });

  tx();

  // Rebuild FTS after data is committed
  db.exec("INSERT INTO history_fts(history_fts) VALUES('rebuild')");

  return count;
}
