import { runIngest } from "../ingest/index.ts";

export async function ingestCommand(args: string[]): Promise<void> {
  const force = args.includes("--force");
  await runIngest(force);
}
