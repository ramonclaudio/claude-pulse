import { getDb } from "../db/connection.ts";
import { rawQuery } from "../db/queries.ts";
import { table } from "../utils/format.ts";

export function sqlCommand(args: string[]): void {
  const sql = args.join(" ").trim();
  if (!sql) {
    console.error("Usage: sql \"SELECT ...\"");
    return;
  }

  const db = getDb();

  try {
    const rows = rawQuery(db, sql) as Record<string, unknown>[];
    if (rows.length === 0) {
      console.log("No results.");
      return;
    }

    const cols = Object.keys(rows[0]!);
    const data: string[][] = [cols];
    for (const row of rows) {
      data.push(cols.map((c) => String(row[c] ?? "")));
    }

    console.log(table(data));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
  }
}
