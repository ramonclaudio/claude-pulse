import type { Database } from "bun:sqlite";
import { Glob } from "bun";
import { DEVELOPER_DIR } from "../utils/paths.ts";
import {
  isGitRepo,
  gitStatus,
  gitStashCount,
  gitBranches,
  gitCurrentBranch,
  gitRecentCommits,
} from "../utils/git.ts";

const SKIP_DIRS = new Set(["prompts"]);
const TYPED_PARENTS = new Map([
  ["private", "private"],
  ["public", "public"],
  ["forks", "fork"],
  ["refs", "ref"],
]);

function listProjects(): { path: string; type: string }[] {
  const projects: { path: string; type: string }[] = [];
  if (Bun.spawnSync(["test", "-d", DEVELOPER_DIR], { stdout: "ignore", stderr: "ignore" }).exitCode !== 0) return projects;

  const topLevel = [...new Glob("*/").scanSync({ cwd: DEVELOPER_DIR, onlyFiles: false })].map(d => d.replace(/\/$/, ""));
  for (const name of topLevel) {
    if (name.startsWith(".")) continue;
    if (SKIP_DIRS.has(name)) continue;

    const parentPath = DEVELOPER_DIR + "/" + name;
    const projectType = TYPED_PARENTS.get(name);

    if (projectType) {
      try {
        const children = [...new Glob("*/").scanSync({ cwd: parentPath, onlyFiles: false })].map(d => d.replace(/\/$/, ""));
        for (const child of children) {
          if (child.startsWith(".")) continue;
          projects.push({ path: parentPath + "/" + child, type: projectType });
        }
      } catch (e) {
        console.error(`Failed to scan ${parentPath}:`, e);
      }
    } else {
      // Top-level dir is itself a project
      projects.push({ path: parentPath, type: "other" });
    }
  }

  return projects;
}

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 86_400_000)
  .toISOString()
  .slice(0, 10);

export async function ingestProjects(db: Database): Promise<number> {
  const projects = listProjects();
  if (projects.length === 0) return 0;

  const insertProject = db.query(`
    INSERT OR REPLACE INTO projects (path, name, type, has_git, has_claude_md, last_commit_date, total_commits)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGitState = db.query(`
    INSERT OR REPLACE INTO project_git_state
    (project_path, branch_count, stash_count, dirty_file_count, uncommitted_changes, current_branch, last_captured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCommit = db.query(`
    INSERT OR REPLACE INTO commits (hash, project_path, author, date, message, commit_type, commit_scope)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;

  const tx = db.transaction(() => {
    for (const { path, type } of projects) {
      try {
        const name = path.split("/").pop() || path;
        const hasGit = isGitRepo(path);
        const hasClaudeMd = Bun.file(path + "/CLAUDE.md").size > 0;

        let lastCommitDate: string | null = null;
        let totalCommits = 0;

        if (hasGit) {
          // Git state
          const status = gitStatus(path);
          const stashes = gitStashCount(path);
          const branches = gitBranches(path);
          const branch = gitCurrentBranch(path);

          insertGitState.run(
            path,
            branches.count,
            stashes,
            status.dirty,
            status.dirty > 0 ? 1 : 0,
            branch,
            new Date().toISOString(),
          );

          // Commits - only mine across all repos (including forks/refs)
          const MY_NAMES = ["Ray", "the author", "the author", "ramonclaudio"];
          const allCommits = gitRecentCommits(path);
          const myCommits = allCommits.filter(c => MY_NAMES.includes(c.author));
          totalCommits = myCommits.length;
          if (myCommits.length > 0) {
            lastCommitDate = myCommits[0]!.date.slice(0, 10);
          }

          for (const c of myCommits) {
            insertCommit.run(
              c.hash,
              path,
              c.author,
              c.date,
              c.message,
              c.commitType ?? null,
              c.commitScope ?? null,
            );
          }
        }

        insertProject.run(
          path,
          name,
          type,
          hasGit ? 1 : 0,
          hasClaudeMd ? 1 : 0,
          lastCommitDate,
          totalCommits,
        );

        count++;
      } catch (e) {
        console.error(`Failed to ingest project ${path}:`, e);
      }
    }
  });

  tx();
  return count;
}
