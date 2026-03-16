import { getDb } from "../db/connection.ts";
import { searchHistory } from "../db/queries.ts";
import { projectName } from "../utils/paths.ts";
import { epochMsToDate, epochMsToTime } from "../utils/dates.ts";
import { dim, cyan, truncate } from "../utils/format.ts";

export function searchCommand(args: string[]): void {
  const query = args.join(" ").trim();
  if (!query) {
    console.error("Usage: search <query>");
    return;
  }

  const db = getDb();

  try {
    const results = searchHistory(db, query);

    if (results.length === 0) {
      console.log(dim("No results."));
      return;
    }

    for (const r of results) {
      const date = r.timestamp ? epochMsToDate(r.timestamp) : "?";
      const time = r.timestamp ? epochMsToTime(r.timestamp) : "?";
      const proj = r.project_path ? cyan(projectName(r.project_path)) : dim("unknown");
      const text = r.display ? truncate(r.display, 80) : dim("(empty)");

      console.log(`${dim(`${date} ${time}`)}  ${proj}  ${text}`);
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
  }
}
